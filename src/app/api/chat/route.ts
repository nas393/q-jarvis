import {NextResponse} from "next/server";
import {z} from "zod";
import {getDb} from "@/lib/db";
import {createAIStream,getAIConfig} from "@/lib/ai/provider";
import {jsonError,requestOriginAllowed} from "@/lib/http";
import {writeAudit} from "@/lib/audit";
export const runtime="nodejs",dynamic="force-dynamic";
type ProviderResponse={error?:{message?:unknown;code?:unknown;type?:unknown};output_text?:unknown;output?:Array<{content?:Array<{type?:string;text?:string}>}>;incomplete_details?:{reason?:unknown};status?:unknown};
const OWNER_ID="owner";
export async function GET(){
 try{const result=await getDb().query("SELECT id,title,status,created_at,updated_at FROM conversations WHERE user_id=$1 AND status='active' ORDER BY updated_at DESC LIMIT 50",[OWNER_ID]);return NextResponse.json({conversations:result.rows},{headers:{"Cache-Control":"no-store"}});}
 catch{return jsonError(503,"Conversation storage unavailable");}
}
export async function POST(request:Request){
 console.error("q_chat_stage","post_received");
 if(!requestOriginAllowed(request))return jsonError(403,"Request origin rejected");
 const parsed=z.object({message:z.string().trim().min(1).max(12000),conversationId:z.string().uuid().optional()}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return jsonError(400,"Enter a message (maximum 12,000 characters).");
 let config;try{config=getAIConfig();}catch{return jsonError(503,"AI provider is not configured. Add OPENAI_API_KEY in Vercel Preview.");}
 const db=getDb();let conversationId=parsed.data.conversationId;console.error("q_chat_stage","provider_configured");
 try{
  if(conversationId){const check=await db.query("SELECT id FROM conversations WHERE id=$1 AND user_id=$2 AND status='active'",[conversationId,OWNER_ID]);if(!check.rowCount)return jsonError(404,"Conversation not found.");}
  else{const created=await db.query("INSERT INTO conversations (user_id,title) VALUES ($1,$2) RETURNING id",[OWNER_ID,parsed.data.message.slice(0,72)]);conversationId=created.rows[0].id;}
  const activeConversationId=conversationId as string;console.error("q_chat_stage","conversation_ready");
  await db.query("INSERT INTO messages (conversation_id,role,content) VALUES ($1,'user',$2)",[activeConversationId,parsed.data.message]);
  const history=await db.query("SELECT role,content FROM messages WHERE conversation_id=$1 AND role IN ('user','assistant') ORDER BY created_at DESC LIMIT 30",[activeConversationId]);
  const turns=history.rows.reverse().map((row:{role:"user"|"assistant";content:string})=>({role:row.role,content:row.content}));
  console.error("q_chat_stage","history_loaded",{turns:turns.length});
  const upstream=await createAIStream(turns,request.signal);
  console.error("q_chat_stage","provider_http_response",{status:upstream.status});
  const raw=await upstream.text().catch(()=>"");
  if(!upstream.ok){
   let providerMessage="";let providerCode="";
   try{const payload=JSON.parse(raw) as ProviderResponse;providerMessage=String(payload.error?.message??"");providerCode=String(payload.error?.code??payload.error?.type??"");}catch{}
   console.error("ai_provider_rejected_request",{status:upstream.status,code:providerCode,message:providerMessage.slice(0,240)});
   await writeAudit({userId:OWNER_ID,actorType:"owner",actorId:OWNER_ID,action:"chat.response",outcome:"failed",details:{provider:actualProvider,status:upstream.status,code:providerCode}});
   return jsonError(502,`AI provider error (${upstream.status})${providerCode?` [${providerCode}]`:""}: ${providerMessage.slice(0,180)||"Check provider configuration and billing."}`);
  }
  let payload:ProviderResponse;
  try{payload=JSON.parse(raw) as ProviderResponse;}catch{return jsonError(502,"AI provider returned an invalid response.");}
  const outputText=payload.output?.flatMap(item=>item.content??[]).filter(part=>part.type==="output_text").map(part=>part.text??"").join("");
  const answer=String(payload.output_text??outputText??"").trim();
  if(!answer){
   const reason=String(payload.incomplete_details?.reason??payload.status??"empty response");
   console.error("q_chat_stage","empty_model_output",{status:payload.status,reason});
   return jsonError(502,`AI returned no text (${reason}).`);
  }
  await db.query("INSERT INTO messages (conversation_id,role,content,metadata) VALUES ($1,'assistant',$2,$3::jsonb)",[activeConversationId,answer,JSON.stringify({provider:actualProvider,model:actualModel})]);
  await db.query("UPDATE conversations SET updated_at=now() WHERE id=$1",[activeConversationId]);
  await writeAudit({userId:OWNER_ID,actorType:"owner",actorId:OWNER_ID,action:"chat.response",outcome:"succeeded",details:{provider:config.provider,model:config.model}});
  const encoder=new TextEncoder();
  const stream=new ReadableStream<Uint8Array>({start(controller){
   controller.enqueue(encoder.encode(`data: ${JSON.stringify({delta:answer,conversationId:activeConversationId})}\\n\\n`));
   controller.enqueue(encoder.encode(`data: ${JSON.stringify({done:true,conversationId:activeConversationId})}\\n\\n`));
   controller.close();
  }});
  return new Response(stream,{headers:{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-transform","X-Accel-Buffering":"no"}});

 }catch(e){console.error("q_chat_stage","request_failed",{name:e instanceof Error?e.name:"unknown",message:e instanceof Error?e.message:"unknown"});return jsonError(503,"Chat service temporarily unavailable.");}
}