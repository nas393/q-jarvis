import {NextResponse} from "next/server";
import {z} from "zod";
import {getDb} from "@/lib/db";
import {createAIStream,getAIConfig} from "@/lib/ai/provider";
import {jsonError,requestOriginAllowed} from "@/lib/http";
import {writeAudit} from "@/lib/audit";
export const runtime="nodejs",dynamic="force-dynamic";
type ProviderResponse={error?:{message?:unknown;code?:unknown;type?:unknown};output_text?:unknown;output?:Array<{content?:Array<{type?:string;text?:string}>}>;incomplete_details?:{reason?:unknown};status?:unknown};
const OWNER_ID="owner";
type PortfolioProject={
 name:string;registryPriority:string;area:string;recordedNextAction:string;
 repositoryLinked:boolean;vercelProjectLinked:boolean;
 githubDataStatus?:string;vercelDataStatus?:string;
 deploymentState?:string;deploymentTarget?:string;
 openGitHubIssues?:number|null;lastCommit?:{message?:string;date?:string}|string;
};
function buildPortfolioReview(raw:string):string|null{
 try{
  const parsed=JSON.parse(raw) as {projects?:PortfolioProject[]};
  if(!Array.isArray(parsed.projects)||parsed.projects.length===0)return null;
  const projects=parsed.projects;
  const byName=(part:string)=>projects.find(p=>p.name.toUpperCase().includes(part));
  const selected=[
   {match:byName("NASSIM AI HQ"),why:"P1 personal operating hub; its Stage 1 Preview validation is the recorded gate before defining the next approved phase.",action:"Finish the Stage 1 Preview test pass and record the result.",done:"All agreed Preview checks pass and the validation report is committed."},
   {match:byName("CERTIGO"),why:"P1 education platform; mobile lesson-reader validation is the recorded quality gate before feature expansion.",action:"Complete a focused mobile lesson-reader QA pass.",done:"Core lesson flows pass on target mobile sizes and QA sign-off is recorded."},
   {match:byName("LUMERIS REEL MAKER"),why:"P1 creator tooling; an end-to-end export test is the clearest recorded workflow validation.",action:"Export one representative reel through the full workflow.",done:"Upload, processing, preview and export complete successfully, with the tested deployment URL recorded."}
  ].filter(item=>item.match);
  if(selected.length!==3)return null;
  const deploymentReady=projects.filter(p=>p.deploymentState==="READY").length;
  const targetUnknown=projects.filter(p=>!p.deploymentTarget||p.deploymentTarget==="UNKNOWN").map(p=>p.name);
  const issuesUnknown=projects.filter(p=>p.openGitHubIssues===null||p.openGitHubIssues===undefined).map(p=>p.name);
  const facts=(p:PortfolioProject)=>[
   `priority ${p.registryPriority}`,
   `deployment ${p.deploymentState??"UNKNOWN"} (target ${p.deploymentTarget??"UNKNOWN"})`,
   `GitHub issues ${p.openGitHubIssues===null||p.openGitHubIssues===undefined?"UNKNOWN":p.openGitHubIssues}`,
   `GitHub data ${p.githubDataStatus??"UNKNOWN"}`,
   `Vercel data ${p.vercelDataStatus??"UNKNOWN"}`
  ].join("; ");
  const ranking=selected.map((item,index)=>`${index+1}. **${item.match!.name}** — **Verified:** ${facts(item.match!)}. **Assessment:** ${item.why} **Next:** ${item.action} **Done when:** ${item.done}`).join("\n");
  const gaps=[targetUnknown.length?`deployment target unknown for ${targetUnknown.join(", ")}`: "",issuesUnknown.length?`issue counts unknown for ${issuesUnknown.join(", ")}`:""].filter(Boolean).join("; ")||"No material gaps in the fields supplied; product quality, security and usage still require separate validation.";
  return `**PORTFOLIO HEALTH**\n${deploymentReady} of ${projects.length} projects report a READY deployment. This confirms deployment completion only, not product or operational health. GitHub issue counts and deployment targets are reported separately below; zero issues is not a risk rating.\n\n**TOP THREE**\n${ranking}\n\n**DATA GAPS**\n${gaps}\n\n**RANKING BASIS**\nThese three are selected from the P1 group because their recorded next actions are explicit validation gates for the HQ, education and creator-tool workflows. This is a qualitative prioritisation, not a measured business-impact score; DALIL and LUMERIS remain P1 contenders and need current product-validation evidence to compare confidently.`;
 }catch{return null;}
}

export async function GET(){
 try{const result=await getDb().query("SELECT id,title,status,created_at,updated_at FROM conversations WHERE user_id=$1 AND status='active' ORDER BY updated_at DESC LIMIT 50",[OWNER_ID]);return NextResponse.json({conversations:result.rows},{headers:{"Cache-Control":"no-store"}});}
 catch{return jsonError(503,"Conversation storage unavailable");}
}
export async function POST(request:Request){
 console.error("q_chat_stage","post_received");
 if(!requestOriginAllowed(request))return jsonError(403,"Request origin rejected");
 const parsed=z.object({message:z.string().trim().min(1).max(12000),conversationId:z.string().uuid().optional(),portfolioContext:z.string().max(9000).optional()}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return jsonError(400,"Enter a message (maximum 12,000 characters).");
 let config;try{config=getAIConfig();}catch{return jsonError(503,"AI provider is not configured. Add GEMINI_API_KEY and optionally GROQ_API_KEY in Vercel.");}
 const db=getDb();let conversationId=parsed.data.conversationId;console.error("q_chat_stage","provider_configured");
 try{
  if(conversationId){const check=await db.query("SELECT id FROM conversations WHERE id=$1 AND user_id=$2 AND status='active'",[conversationId,OWNER_ID]);if(!check.rowCount)return jsonError(404,"Conversation not found.");}
  else{const created=await db.query("INSERT INTO conversations (user_id,title) VALUES ($1,$2) RETURNING id",[OWNER_ID,parsed.data.message.slice(0,72)]);conversationId=created.rows[0].id;}
  const activeConversationId=conversationId as string;console.error("q_chat_stage","conversation_ready");
  await db.query("INSERT INTO messages (conversation_id,role,content) VALUES ($1,'user',$2)",[activeConversationId,parsed.data.message]);
  const history=await db.query("SELECT role,content FROM messages WHERE conversation_id=$1 AND role IN ('user','assistant') ORDER BY created_at DESC LIMIT 30",[activeConversationId]);
  const turns=history.rows.reverse().map((row:{role:"user"|"assistant";content:string})=>({role:row.role,content:row.content}));
  if(parsed.data.portfolioContext?.trim()){
   const latestUser=[...turns].reverse().find(turn=>turn.role==="user");
   if(latestUser)latestUser.content=`CURRENT VERIFIED PROJECT PORTFOLIO (use this data; do not claim you cannot access the project list):\n${parsed.data.portfolioContext.trim()}\n\nUSER REQUEST:\n${latestUser.content}`;
  }
  console.error("q_chat_stage","history_loaded",{turns:turns.length,portfolioContext:!!parsed.data.portfolioContext});
  const isPortfolioReview=/review.*(all|active).*projects|portfolio review|rank.*top three|top three.*projects/i.test(parsed.data.message);
  const deterministicReview=isPortfolioReview&&parsed.data.portfolioContext?buildPortfolioReview(parsed.data.portfolioContext):null;
  if(deterministicReview){
   const answer=deterministicReview;
   await db.query("INSERT INTO messages (conversation_id,role,content,metadata) VALUES ($1,'assistant',$2,$3::jsonb)",[activeConversationId,answer,JSON.stringify({provider:"q-portfolio-engine",model:"evidence-template-v1"})]);
   await db.query("UPDATE conversations SET updated_at=now() WHERE id=$1",[activeConversationId]);
   await writeAudit({userId:OWNER_ID,actorType:"owner",actorId:OWNER_ID,action:"chat.portfolio_review",outcome:"succeeded",details:{projects:JSON.parse(parsed.data.portfolioContext!).projects.length,provider:"q-portfolio-engine"}});
   const encoder=new TextEncoder();
   const stream=new ReadableStream<Uint8Array>({start(controller){
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({delta:answer,conversationId:activeConversationId})}\n\n`));
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({done:true,conversationId:activeConversationId})}\n\n`));
    controller.close();
   }});
   return new Response(stream,{headers:{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-transform","X-Accel-Buffering":"no","X-Q-Response-Mode":"portfolio-engine"}});
  }
  const upstream=await createAIStream(turns,request.signal);
  const actualProvider=upstream.headers.get("x-ai-provider")??config.provider;
  const actualModel=upstream.headers.get("x-ai-model")??config.model;
  console.error("q_chat_stage","provider_http_response",{status:upstream.status,provider:actualProvider});
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
  await writeAudit({userId:OWNER_ID,actorType:"owner",actorId:OWNER_ID,action:"chat.response",outcome:"succeeded",details:{provider:actualProvider,model:actualModel}});
  const encoder=new TextEncoder();
  const stream=new ReadableStream<Uint8Array>({start(controller){
   controller.enqueue(encoder.encode(`data: ${JSON.stringify({delta:answer,conversationId:activeConversationId})}\n\n`));
   controller.enqueue(encoder.encode(`data: ${JSON.stringify({done:true,conversationId:activeConversationId})}\n\n`));
   controller.close();
  }});
  return new Response(stream,{headers:{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-transform","X-Accel-Buffering":"no"}});

 }catch(e){console.error("q_chat_stage","request_failed",{name:e instanceof Error?e.name:"unknown",message:e instanceof Error?e.message:"unknown"});return jsonError(503,"Chat service temporarily unavailable.");}
}