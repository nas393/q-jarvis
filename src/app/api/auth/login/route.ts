import {NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {z} from "zod";
import {getDb} from "@/lib/db";
import {getAuthEnv} from "@/lib/env";
import {createSession} from "@/lib/session";
import {writeAudit} from "@/lib/audit";
import {jsonError,requestOriginAllowed} from "@/lib/http";
export const runtime="nodejs",dynamic="force-dynamic";
const schema=z.object({passkey:z.string().min(1).max(256)});
export async function POST(request:Request){
 const contentType=request.headers.get("content-type")??"";
 const browserForm=contentType.includes("application/x-www-form-urlencoded")||contentType.includes("multipart/form-data");
 const fail=(status:number,message:string)=>{
  if(browserForm){const url=new URL("/login",request.url);url.searchParams.set("error",message);return NextResponse.redirect(url,303);}
  return jsonError(status,message);
 };
 if(!requestOriginAllowed(request))return fail(403,"Request origin rejected");
 let body:unknown;
 if(browserForm){const form=await request.formData();body={passkey:form.get("passkey")};}
 else body=await request.json().catch(()=>null);
 const parsed=schema.safeParse(body);
 if(!parsed.success)return fail(400,"Invalid passkey");
 let env;try{env=getAuthEnv();}catch(error){console.error("auth_configuration_invalid",{reason:error instanceof Error?error.message:"unknown"});return fail(503,"Authentication is not configured");}
 const ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()??"unknown";
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(env.AUTH_SECRET+":owner-passkey:"+ip));
 const bucket=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
 try{
  const db=getDb();
  const throttle=await db.query("INSERT INTO auth_login_attempts (bucket_hash,window_started_at,attempt_count) VALUES ($1,now(),1) ON CONFLICT (bucket_hash) DO UPDATE SET attempt_count=CASE WHEN auth_login_attempts.window_started_at<now()-interval '15 minutes' THEN 1 ELSE auth_login_attempts.attempt_count+1 END,window_started_at=CASE WHEN auth_login_attempts.window_started_at<now()-interval '15 minutes' THEN now() ELSE auth_login_attempts.window_started_at END RETURNING attempt_count",[bucket]);
  if(Number(throttle.rows[0]?.attempt_count??99)>6){await writeAudit({action:"auth.login",outcome:"blocked",details:{reason:"rate_limit"}});return fail(429,"Too many attempts. Try again in 15 minutes.");}
  const owner=await db.query("SELECT id,email,role FROM users WHERE role='owner' ORDER BY created_at ASC LIMIT 1");
  const account=owner.rows[0];
  const supplied=Buffer.from(parsed.data.passkey,"utf8");
  const expected=Buffer.from(env.OWNER_PASSKEY,"utf8");
  const passkeyMatches=supplied.length===expected.length&&timingSafeEqual(supplied,expected);
  if(!account||!passkeyMatches){await writeAudit({action:"auth.login",outcome:"failed",details:{reason:"invalid_passkey"}});return fail(401,"Invalid passkey");}
  await createSession({id:account.id,email:account.email});
  await db.query("DELETE FROM auth_login_attempts WHERE bucket_hash=$1",[bucket]);
  await writeAudit({userId:account.id,actorType:"owner",actorId:account.id,action:"auth.login",outcome:"succeeded"});
  if(browserForm)return NextResponse.redirect(new URL("/dashboard",request.url),303);
  return NextResponse.json({authenticated:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){console.error("auth_login_unavailable",{error:e instanceof Error?e.name:"unknown"});return fail(503,"Authentication service temporarily unavailable");}
}