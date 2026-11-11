export type ChatTurn={role:"user"|"assistant";content:string};
export type ProviderConfig={provider:string;model:string;apiKey:string};
export function getAIConfig():ProviderConfig{
 const provider=process.env.AI_PROVIDER??"openai";
 const apiKey=process.env.OPENAI_API_KEY;
 if(provider!=="openai")throw new Error("Configured AI provider is not supported yet");
 if(!apiKey)throw new Error("OPENAI_API_KEY is not configured");
 return {provider,model:process.env.OPENAI_MODEL??"gpt-6-luna",apiKey};
}
export async function createAIStream(input:ChatTurn[],signal?:AbortSignal){
 const config=getAIConfig();
 return fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":`Bearer ${config.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:config.model,input:input.map(turn=>({role:turn.role,content:turn.content})),reasoning:{effort:"none"},stream:true}),signal});
}