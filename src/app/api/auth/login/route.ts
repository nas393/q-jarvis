import {NextResponse} from "next/server";
import bcrypt from "bcryptjs";
import {z} from "zod";
import {getDb} from "@/lib/db";
import {getEnv} from "@/lib/env";
import {createSession} from "@/lib/session";
import {writeAudit} from "@/lib/audit";
import {jsonError,requestOriginAllowed} from "@/lib/http";
export const runtime="nodejs",dynamic="force-dynamic";
const schema=z.object({email:z.string().email().max(254),password:z.string().min(1).max(256)});
export async function POST(request:Request){
 if(!requestOriginAllowed(request))return jsonError(403,"Request origin rejected");
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return jsonError(400,"Invalid credentials payload");
 let env;try{env=getEnv();}catch{return jsonError(503,"Authentication is not configured");}
 const email=parsed.data.email.trim().toLowerCase();
 const ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()??"unknown";
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(env.AUTH_SECRET+":"+email+":"+ip));
 const bucket=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
 try{
  const db=getDb();
  const throttle=await db.query("INSERT INTO auth_login_attempts (bucket_hash,window_started_at,attempt_count) VALUES ($1,now(),1) ON CONFLICT (bucket_hash) DO UPDATE SET attempt_count=CASE WHEN auth_login_attempts.window_started_at<now()-interval '15 minutes' THEN 1 ELSE auth_login_attempts.attempt_count+1 END,window_started_at=CASE WHEN auth_login_attempts.window_started_at<now()-interval '15 minutes' THEN now() ELSE auth_login_attempts.window_started_at END RETURNING attempt_count",[bucket]);
  if(Number(throttle.rows[0]?.attempt_count??99)>6){await writeAudit({action:"auth.login",outcome:"blocked",details:{reason:"rate_limit"}});return jsonError(429,"Too many attempts. Try again in 15 minutes.");}
  const owner=await db.query("SELECT id,email,role FROM users WHERE lower(email)=$1 AND role='owner' LIMIT 1",[email]);
  const account=owner.rows[0];
  const passwordMatches=await bcrypt.compare(parsed.data.password,env.OWNER_PASSWORD_HASH).catch(()=>false);
  const emailMatches=email===env.OWNER_EMAIL.trim().toLowerCase();
  if(!account||!emailMatches||!passwordMatches){await writeAudit({action:"auth.login",outcome:"failed",details:{email_match:emailMatches}});return jsonError(401,"Invalid email or password");}
  await createSession({id:account.id,email:account.email});
  await db.query("DELETE FROM auth_login_attempts WHERE bucket_hash=$1",[bucket]);
  await writeAudit({userId:account.id,actorType:"owner",actorId:account.id,action:"auth.login",outcome:"succeeded"});
  return NextResponse.json({authenticated:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){console.error("auth_login_unavailable",{error:e instanceof Error?e.name:"unknown"});return jsonError(503,"Authentication service temporarily unavailable");}
}