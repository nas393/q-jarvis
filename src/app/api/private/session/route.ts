import {NextResponse} from "next/server";
import {readSession} from "@/lib/session";
export const runtime="nodejs",dynamic="force-dynamic";
export async function GET(){const session=await readSession();if(!session)return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"no-store"}});return NextResponse.json({authenticated:true,user:session},{headers:{"Cache-Control":"no-store"}});}