import {NextResponse} from "next/server";
import {getDb} from "@/lib/db";
export const runtime="nodejs",dynamic="force-dynamic";
export async function GET(){const checks:Record<string,"ok"|"error">={application:"ok",database:"error"};let status=503;try{await getDb().query("SELECT 1");checks.database="ok";status=200;}catch{}return NextResponse.json({status:status===200?"healthy":"degraded",checks,timestamp:new Date().toISOString()},{status,headers:{"Cache-Control":"no-store"}});}