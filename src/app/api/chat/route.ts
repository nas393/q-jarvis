import {NextResponse} from "next/server";
import {z} from "zod";
import {getDb} from "@/lib/db";
import {readSession} from "@/lib/session";
import {createAIStream,getAIConfig} from "@/lib/ai/provider";
import {jsonError,requestOriginAllowed} from "@/lib/http";
import {writeAudit} from "@/lib/audit";
export const runtime="nodejs",dynamic="force-dynamic";
type ProviderResponse={error?:{message?:unknown;code?:unknown;type?:unknown};output_text?:unknown;output?:Array<{content?:Array<{type?:string;text?:string}>}>;incomplete_details?:{reason?:unknown};status?:unknown};
const OWNER_ID="owner";
type PortfolioProject={
 name:string;registryPriority:string;area:string;recordedNextAction:string;
 repositoryLinked:boolean;vercelProjectLinked:boolean;
 githubDataStatus?:string;vercelDataStatus?:string;commitDataStatus?:string;deploymentDataStatus?:string;
 deploymentState?:string;deploymentTarget?:string;deploymentSourceRepo?:string|null;deploymentSourceMatches?:boolean|null;
 openGitHubIssues?:number|null;lastCommit?:{message?:string;date?:string}|string;
};
function buildPortfolioReview(raw:string):string|null{
 try{
  const parsed=JSON.parse(raw) as {projects?:PortfolioProject[]};
  if(!Array.isArray(parsed.projects)||parsed.projects.length===0)return null;
  const now=Date.now();
  const assess=(p:PortfolioProject)=>{
   const priorityScore=p.registryPriority==="P1"?30:p.registryPriority==="P2"?20:p.registryPriority==="P3"?10:0;
   const deploymentRisk=p.deploymentState==="ERROR"?25:0;
   const hasRepo=p.repositoryLinked;
   const commitDate=typeof p.lastCommit==="object"&&p.lastCommit?p.lastCommit.date:undefined;
   const ageDays=commitDate?Math.max(0,Math.floor((now-Date.parse(commitDate))/86400000)):null;
   const inactivityRisk=hasRepo&&p.commitDataStatus==="VERIFIED"&&ageDays!==null&&ageDays>30?8:0;
   const gaps=[
    !p.deploymentTarget||p.deploymentTarget==="UNKNOWN"?"deployment target":null,
    hasRepo&&(p.openGitHubIssues===null||p.openGitHubIssues===undefined)?"GitHub issue count":null,
    hasRepo&&p.commitDataStatus!=="VERIFIED"?"latest commit":null,
    p.deploymentDataStatus!=="VERIFIED"?"deployment data":null
   ].filter(Boolean) as string[];
   const confidence=gaps.length===0?"HIGH":gaps.length<=2?"MEDIUM":"LOW";
   return {p,score:priorityScore+deploymentRisk+inactivityRisk,priorityScore,deploymentRisk,inactivityRisk,ageDays,gaps,confidence};
  };
  const ranked=parsed.projects.map(assess).sort((a,b)=>b.score-a.score||a.p.name.localeCompare(b.p.name));
  const top=ranked.slice(0,3);
  const tiedAtCutoff=ranked.filter(x=>x.score===top[top.length-1]?.score).length>1;
  const verifiedDeployments=parsed.projects.filter(p=>p.deploymentDataStatus==="VERIFIED").length;
  const ready=parsed.projects.filter(p=>p.deploymentDataStatus==="VERIFIED"&&p.deploymentState==="READY").length;
  const failures=parsed.projects.filter(p=>p.deploymentDataStatus==="VERIFIED"&&p.deploymentState==="ERROR");
  const unknownTargets=parsed.projects.filter(p=>!p.deploymentTarget||p.deploymentTarget==="UNKNOWN").map(p=>p.name);
  const unknownIssues=parsed.projects.filter(p=>p.repositoryLinked&&(p.openGitHubIssues===null||p.openGitHubIssues===undefined)).map(p=>p.name);
  const unknownCommits=parsed.projects.filter(p=>p.repositoryLinked&&p.commitDataStatus!=="VERIFIED").map(p=>p.name);
  const unconfiguredVercel=parsed.projects.filter(p=>p.deploymentDataStatus==="NOT_CONFIGURED").map(p=>p.name);
  const authRequiredGitHub=parsed.projects.filter(p=>p.githubDataStatus==="AUTH_REQUIRED").map(p=>p.name);
  const sourceMismatches=parsed.projects.filter(p=>p.deploymentSourceMatches===false).map(p=>p.name);
  const recommendation=(p:PortfolioProject)=>{
   if(p.deploymentState==="ERROR")return "Investigate the latest failed deployment, fix the first blocking build/runtime error, and rerun Preview.";
   if(!p.deploymentState||p.deploymentState==="UNKNOWN")return "Verify the Vercel project mapping and retrieve the latest deployment before planning release work.";
   return p.recordedNextAction;
  };
  const done=(p:PortfolioProject)=>{
   if(p.deploymentState==="ERROR")return "A new Preview deployment reaches READY and the original failure is documented.";
   if(!p.deploymentState||p.deploymentState==="UNKNOWN")return "The correct Vercel project and latest deployment status are verified.";
   return "The recorded next action is completed and evidence (test result, artifact or decision) is captured.";
  };
  const lines=top.map((x,i)=>`${i+1}. **${x.p.name}** — **Score ${x.score}/75; confidence ${x.confidence}.** Priority ${x.p.registryPriority}; deployment ${x.p.deploymentState??"UNKNOWN"}; target ${x.p.deploymentTarget??"UNKNOWN"}; open GitHub issues ${x.p.repositoryLinked?(x.p.openGitHubIssues??"UNKNOWN"):"N/A"}; last commit age ${!x.p.repositoryLinked?"N/A":x.ageDays===null?"UNKNOWN":x.ageDays+" days"}. **Score drivers:** priority ${x.priorityScore}, deployment risk ${x.deploymentRisk}, verified inactivity ${x.inactivityRisk}. **Missing evidence:** ${x.gaps.join(", ")||"none identified"}. **Next:** ${recommendation(x.p)} **Done when:** ${done(x.p)}`).join("\n");
  const watch=ranked.slice(3).map(x=>`${x.p.name} (score ${x.score}; confidence ${x.confidence})`).join("; ")||"None";
  const gaps=[unknownTargets.length?"deployment target unknown: "+unknownTargets.join(", "):"",unknownIssues.length?"GitHub issue count unknown: "+unknownIssues.join(", "):"",unknownCommits.length?"latest commit unavailable: "+unknownCommits.join(", "):"",unconfiguredVercel.length?"Vercel token not configured: "+unconfiguredVercel.join(", "):"",authRequiredGitHub.length?"GitHub authentication required: "+authRequiredGitHub.join(", "):"",sourceMismatches.length?"Vercel source repository mismatch: "+sourceMismatches.join(", "):""].filter(Boolean).join("; ")||"No missing fields detected in the supplied integration snapshot.";
  const week=top.map((x,i)=>`Day ${i*2+1}–${i*2+2}: ${x.p.name} — ${recommendation(x.p)}`).join("\n");
  const tieNote=tiedAtCutoff?"The cutoff contains a score tie. The displayed order among equal scores is alphabetical, not evidence of greater urgency; use validation evidence to break the tie.":"";
  return `**PORTFOLIO HEALTH**\n${ready}/${verifiedDeployments} projects with verified deployment telemetry report READY; ${failures.length} verified deployment errors. ${parsed.projects.length-verifiedDeployments} projects lack verified deployment telemetry. READY is deployment status, not proof of product quality.\n\n**TOP THREE — DYNAMIC EXECUTION PRIORITY**\n${lines}\n${tieNote}\n\n**7-DAY EXECUTION PLAN**\n${week}\nDay 7: Review evidence, refresh project data and re-rank the full portfolio.\n\n**WATCHLIST**\n${watch}\n\n**DATA GAPS**\n${gaps}\n\n**RANKING METHOD**\nExecution-urgency score: P1=30, P2=20, P3=10; deployment ERROR=+25, verified last commit older than 30 days for a linked software repository=+8. Missing data lowers confidence and is never added to urgency. GitHub activity is NOT APPLICABLE to projects without a linked repository. Open issue counts are displayed but not treated as risk without severity and impact data. This score does not measure revenue, customer impact, strategic value, security or product quality. Tie-break: project name; equal scores are explicitly flagged.`;
 }catch{return null;}
}

export async function GET(){
 if(!await readSession())return jsonError(401,"Unauthorized");
 try{const result=await getDb().query("SELECT id,title,status,created_at,updated_at FROM conversations WHERE user_id=$1 AND status='active' ORDER BY updated_at DESC LIMIT 50",[OWNER_ID]);return NextResponse.json({conversations:result.rows},{headers:{"Cache-Control":"no-store"}});}
 catch{return jsonError(503,"Conversation storage unavailable");}
}
export async function POST(request:Request){
 if(!await readSession())return jsonError(401,"Unauthorized");
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