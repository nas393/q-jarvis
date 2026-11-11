import {NextResponse} from "next/server";
import {z} from "zod";
import {getDb} from "@/lib/db";
import {createAIStream,getAIConfig} from "@/lib/ai/provider";
import {jsonError,requestOriginAllowed} from "@/lib/http";
import {writeAudit} from "@/lib/audit";
export const runtime="nodejs",dynamic="force-dynamic";
const OWNER_ID="owner";
export async function GET(){
 try{const result=await getDb().query("SELECT id,title,status,created_at,updated_at FROM conversations WHERE user_id=$1 AND status='active' ORDER BY updated_at DESC LIMIT 50",[OWNER_ID]);return NextResponse.json({conversations:result.rows},{headers:{"Cache-Control":"no-store"}});}
 catch{return jsonError(503,"Conversation storage unavailable");}
}
export async function POST(request:Request){
 if(!requestOriginAllowed(request))return jsonError(403,"Request origin rejected");
 const parsed=z.object({message:z.string().trim().min(1).max(12000),conversationId:z.string().uuid().optional()}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return jsonError(400,"Enter a message (maximum 12,000 characters).");
 let config;try{config=getAIConfig();}catch{return jsonError(503,"AI provider is not configured. Add OPENAI_API_KEY in Vercel Preview.");}
 const db=getDb();let conversationId=parsed.data.conversationId;
 try{
  if(conversationId){const check=await db.query("SELECT id FROM conversations WHERE id=$1 AND user_id=$2 AND status='active'",[conversationId,OWNER_ID]);if(!check.rowCount)return jsonError(404,"Conversation not found.");}
  else{const created=await db.query("INSERT INTO conversations (user_id,title) VALUES ($1,$2) RETURNING id",[OWNER_ID,parsed.data.message.slice(0,72)]);conversationId=created.rows[0].id;}
  await db.query("INSERT INTO messages (conversation_id,role,content) VALUES ($1,'user',$2)",[conversationId,parsed.data.message]);
  const history=await db.query("SELECT role,content FROM messages WHERE conversation_id=$1 AND role IN ('user','assistant') ORDER BY created_at DESC LIMIT 30",[conversationId]);
  const turns=history.rows.reverse().map((row:{role:"user"|"assistant";content:string})=>({role:row.role,content:row.content}));
  const upstream=await createAIStream(turns,request.signal);
  if(!upstream.ok||!upstream.body){const detail=await upstream.text().catch(()=>"");await writeAudit({userId:OWNER_ID,actorType:"owner",actorId:OWNER_ID,action:"chat.response",outcome:"failed",details:{provider:config.provider,status:upstream.status}});return jsonError(502,"AI provider request failed. Check provider configuration and billing.");}
  const reader=upstream.body.getReader();const decoder=new TextDecoder();let buffer="";let answer="";
  const stream=new ReadableStream<Uint8Array>({async pull(controller){try{
    while(true){const {value,done}=await reader.read();if(done){if(answer.trim()){await db.query("INSERT INTO messages (conversation_id,role,content,metadata) VALUES ($1,'assistant',$2,$3::jsonb)",[conversationId,answer,JSON.stringify({provider:config.provider,model:config.model})]);await db.query("UPDATE conversations SET updated_at=now() WHERE id=$1",[conversationId]);await writeAudit({userId:OWNER_ID,actorType:"owner",actorId:OWNER_ID,action:"chat.response",outcome:"succeeded",details:{provider:config.provider,model:config.model}});}controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({done:true,conversationId})}\n\n`));controller.close();return;}
      buffer+=decoder.decode(value,{stream:true});const blocks=buffer.split("\n\n");buffer=blocks.pop()??"";
      for(const block of blocks){const line=block.split("\n").find(x=>x.startsWith("data:"));if(!line)continue;const raw=line.slice(5).trim();if(raw==="[DONE]")continue;try{const event=JSON.parse(raw);if(event.type==="response.output_text.delta"&&typeof event.delta==="string"){answer+=event.delta;controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({delta:event.delta,conversationId})}\n\n`));}else if(event.type==="error"||event.type==="response.failed"){controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({error:"The AI provider could not complete this response."})}\n\n`));}}catch{}}
      return;
    }
  }catch{controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({error:"Connection interrupted. Please try again."})}\n\n`));controller.close();}},cancel(){reader.cancel().catch(()=>{});}});
  return new Response(stream,{headers:{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no"}});
 }catch(e){console.error("chat_request_failed",{name:e instanceof Error?e.name:"unknown"});return jsonError(503,"Chat service temporarily unavailable.");}
}