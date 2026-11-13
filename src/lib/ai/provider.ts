export type ChatTurn={role:"user"|"assistant";content:string};
export type ProviderConfig={provider:"gemini"|"groq";model:string};

type ProviderError={error?:{message?:string;code?:string;status?:string}};
const GEMINI_MODEL=process.env.GEMINI_MODEL??"gemini-3.6-flash";
const GROQ_MODEL=process.env.GROQ_MODEL??"openai/gpt-oss-120b";
const SYSTEM_PROMPT="You are Q, the personal AI assistant inside a private operating system. Answer ordinary, harmless requests directly and helpfully. Be concise, accurate, and practical. If asked which model or provider is serving the current response, identify yourself as Q and state the configured provider honestly. Never refuse a harmless greeting, simple test, or request to identify the provider.";

export function getAIConfig():ProviderConfig{
 const geminiKey=process.env.GEMINI_API_KEY;
 const groqKey=process.env.GROQ_API_KEY;
 if(geminiKey)return {provider:"gemini",model:GEMINI_MODEL};
 if(groqKey)return {provider:"groq",model:GROQ_MODEL};
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
   systemInstruction:{parts:[{text:SYSTEM_PROMPT}]},
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
  body:JSON.stringify({model,messages:[{role:"system",content:SYSTEM_PROMPT},...input.map(turn=>({role:turn.role,content:turn.content}))],max_tokens:1200,temperature:0.7,stream:false}),
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
 let geminiFailure:Response|undefined;
 if(geminiKey){
  try{
   const response=await callGemini(input,signal);
   if(response.ok)return response;
   geminiFailure=response;\n   const detail=await readError(response.clone());\n   console.error("gemini_provider_http_error",{status:response.status,code:detail.code,message:detail.message.slice(0,180),model:GEMINI_MODEL});
  }catch(error){
   if(signal?.aborted)throw error;
   console.error("gemini_provider_unavailable",{message:error instanceof Error?error.message:"unknown"});
  }
 }
 if(groqKey){
  try{
   const response=await callGroq(input,signal);
   if(response.ok)return response;
   if(geminiFailure){
    const primary=await readError(geminiFailure.clone());
    const fallback=await readError(response.clone());
    return errorResponse(response.status,`Gemini failed (${primary.code}); Groq fallback failed: ${fallback.message}`,fallback.code,"groq",GROQ_MODEL);
   }
   return response;
  }catch(error){
   if(signal?.aborted)throw error;
   console.error("groq_provider_unavailable",{message:error instanceof Error?error.message:"unknown"});
  }
 }
 if(geminiFailure)return geminiFailure;
 return errorResponse(503,"No AI provider is configured or available. Add GEMINI_API_KEY and optionally GROQ_API_KEY in Vercel.", "provider_unavailable","none","none");
}
