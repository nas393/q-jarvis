export type ChatTurn={role:"user"|"assistant";content:string};
export type ProviderConfig={provider:"gemini"|"groq";model:string};

type ProviderError={error?:{message?:string;code?:string;status?:string}};
const GEMINI_MODEL=process.env.GEMINI_MODEL??"gemini-3.6-flash";
const GROQ_MODEL=process.env.GROQ_MODEL??"openai/gpt-oss-120b";
const SYSTEM_PROMPT="You are Q, the personal AI assistant inside a private operating system. Answer directly, accurately, and practically. Be concise but show clear reasoning for business and project decisions. When a CURRENT VERIFIED PROJECT PORTFOLIO is included in a user message, treat it as the source of truth for the listed projects and their supplied fields. Never claim you lack access to that portfolio. Distinguish project priority labels (P1/P2/P3) from your own strategic ranking: do not simply repeat registry order. Rank using strategic impact, urgency, execution risk, dependencies, readiness, and the user\u2019s stated goals; explain why the selected projects outrank other projects at the same priority level. Do not invent deadlines, owners, revenue impact, defects, issue counts, deployment states, or technical capabilities. Treat null, missing, and unavailable fields as unknown, not zero or healthy. Distinguish completed work from pending work. The portfolio\u2019s next-item field is a starting point, not proof that the work is still pending: if conversation context shows it is completed or underway, acknowledge that and recommend the next uncompleted step. For Q / NASSIM AI HQ, the Command Centre Stage 1 implementation and Preview validation are already underway; do not recommend starting the Command Centre from scratch. Production deployment, destructive changes, external publication, and material scope changes require explicit user approval. Never instruct or imply that a production deployment should be triggered without that approval. For project reviews, structure the answer as: (1) brief portfolio assessment, (2) top three ranked priorities with evidence-based rationale, (3) one concrete next action for each, (4) key unknowns or risks. Do not pad recommendations with generic checklists or arbitrary two-day deadlines. Never refuse a harmless greeting, simple test, or request to identify the provider. The provider identity instruction in the following system message is authoritative.";
function providerPrompt(provider:"gemini"|"groq",model:string):string{return `${SYSTEM_PROMPT}\n\nRuntime identity: You are Q. This response is being served by the ${provider.toUpperCase()} API using model ${model}. If asked which AI provider is serving this response, state exactly: \\"Q — AI provider: ${provider.toUpperCase()} (model: ${model}).\\" Do not claim to be OpenAI or ChatGPT unless the runtime provider is OpenAI.`;}

export function getAIConfig():ProviderConfig{
 const geminiKey=process.env.GEMINI_API_KEY;
 const groqKey=process.env.GROQ_API_KEY;
 if(groqKey)return {provider:"groq",model:GROQ_MODEL};
 if(geminiKey)return {provider:"gemini",model:GEMINI_MODEL};
 throw new Error("AI is not configured. Add GEMINI_API_KEY (recommended) or GROQ_API_KEY in Vercel.");
}

function resultResponse(text:string,provider:string,model:string):Response{
 return Response.json(
  {status:"completed",output_text:text,output:[{content:[{type:"output_text",text}]}]},
  {headers:{"x-ai-provider":provider,"x-ai-model":model,"Cache-Control":"no-store"}}
 );
}

function errorResponse(status:number,message:string,code:string,provider:string,model:string):Response{
 return Response.json(
  {error:{message,code}},
  {status,headers:{"x-ai-provider":provider,"x-ai-model":model,"Cache-Control":"no-store"}}
 );
}

async function readError(response:Response):Promise<{message:string;code:string}>{
 const raw=await response.text().catch(()=>"");
 try{
  const body=JSON.parse(raw) as ProviderError;
  return {message:String(body.error?.message??raw??"Provider request failed").slice(0,300),code:String(body.error?.code??body.error?.status??response.status)};
 }catch{return {message:raw.slice(0,300)||"Provider request failed",code:String(response.status)};}
}

async function callGemini(input:ChatTurn[],signal?:AbortSignal):Promise<Response>{
 const key=process.env.GEMINI_API_KEY!;
 const model=GEMINI_MODEL;
 const timeout=AbortSignal.timeout(30000);
 const combined=signal?AbortSignal.any([signal,timeout]):timeout;
 const upstream=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({
   systemInstruction:{parts:[{text:providerPrompt("gemini",model)}]},
   contents:input.map(turn=>({role:turn.role==="assistant"?"model":"user",parts:[{text:turn.content}]})),
   generationConfig:{maxOutputTokens:1200,temperature:0.7}
  }),signal:combined
 });
 if(!upstream.ok){const err=await readError(upstream);return errorResponse(upstream.status,err.message,err.code,"gemini",model);}
 const payload=await upstream.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>};finishReason?:string}>;promptFeedback?:{blockReason?:string}};
 const answer=payload.candidates?.[0]?.content?.parts?.map(part=>part.text??"").join("").trim()??"";
 if(!answer)return errorResponse(502,payload.promptFeedback?.blockReason??"Gemini returned no text.","empty_response","gemini",model);
 return resultResponse(answer,"gemini",model);
}

async function callGroq(input:ChatTurn[],signal?:AbortSignal):Promise<Response>{
 const key=process.env.GROQ_API_KEY!;
 const model=GROQ_MODEL;
 const timeout=AbortSignal.timeout(30000);
 const combined=signal?AbortSignal.any([signal,timeout]):timeout;
 const upstream=await fetch("https://api.groq.com/openai/v1/chat/completions",{
  method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
  body:JSON.stringify({model,messages:[{role:"system",content:providerPrompt("groq",model)},...input.map(turn=>({role:turn.role,content:turn.content}))],max_tokens:1200,temperature:0.7,stream:false}),
  signal:combined
 });
 if(!upstream.ok){const err=await readError(upstream);return errorResponse(upstream.status,err.message,err.code,"groq",model);}
 const payload=await upstream.json() as {choices?:Array<{message?:{content?:string|null}}>};
 const answer=payload.choices?.[0]?.message?.content?.trim()??"";
 if(!answer)return errorResponse(502,"Groq returned no text.","empty_response","groq",model);
 return resultResponse(answer,"groq",model);
}

export async function createAIStream(input:ChatTurn[],signal?:AbortSignal):Promise<Response>{
 const geminiKey=process.env.GEMINI_API_KEY;
 const groqKey=process.env.GROQ_API_KEY;
 let groqFailure:Response|undefined;
 // Groq is the low-latency primary. Gemini remains available as a fallback.
 if(groqKey){
  try{
   const response=await callGroq(input,signal);
   if(response.ok)return response;
   groqFailure=response;
   const detail=await readError(response.clone());
   console.error("groq_provider_http_error",{status:response.status,code:detail.code,message:detail.message.slice(0,180),model:GROQ_MODEL});
  }catch(error){
   if(signal?.aborted)throw error;
   console.error("groq_provider_unavailable",{message:error instanceof Error?error.message:"unknown"});
  }
 }
 if(geminiKey){
  try{
   const response=await callGemini(input,signal);
   if(response.ok)return response;
   if(groqFailure){
    const primary=await readError(groqFailure.clone());
    const fallback=await readError(response.clone());
    return errorResponse(response.status,`Groq failed (${primary.code}); Gemini fallback failed: ${fallback.message}`,fallback.code,"gemini",GEMINI_MODEL);
   }
   return response;
  }catch(error){
   if(signal?.aborted)throw error;
   console.error("gemini_provider_unavailable",{message:error instanceof Error?error.message:"unknown"});
  }
 }
 if(groqFailure)return groqFailure;
 return errorResponse(503,"No AI provider is configured or available. Add GROQ_API_KEY and optionally GEMINI_API_KEY in Vercel.","provider_unavailable","none","none");
}
