import {SignJWT,jwtVerify} from "jose";
import {cookies} from "next/headers";
import {getAuthEnv} from "@/lib/env";
const COOKIE="qj_session",TTL=60*60*8;
const key=()=>new TextEncoder().encode(getAuthEnv().AUTH_SECRET);
export async function createSession(user:{id:string;email:string}){const token=await new SignJWT({email:user.email,role:"owner"}).setProtectedHeader({alg:"HS256"}).setSubject(user.id).setIssuedAt().setExpirationTime(TTL).setIssuer("q-jarvis").setAudience("q-jarvis-owner").sign(key());(await cookies()).set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:TTL});}
export async function readSession(){const token=(await cookies()).get(COOKIE)?.value;if(!token)return null;try{const {payload}=await jwtVerify(token,key(),{algorithms:["HS256"],issuer:"q-jarvis",audience:"q-jarvis-owner"});if(payload.role!=="owner"||!payload.sub||typeof payload.email!=="string")return null;return {id:payload.sub,email:payload.email};}catch{return null;}}
export async function destroySession(){(await cookies()).set(COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:0});}