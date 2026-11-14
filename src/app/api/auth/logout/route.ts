import {NextResponse} from "next/server";
import {destroySession} from "@/lib/session";
import {jsonError,requestOriginAllowed} from "@/lib/http";
export const runtime="nodejs";
export async function POST(request:Request){if(!requestOriginAllowed(request))return jsonError(403,"Request origin rejected");await destroySession();return NextResponse.json({authenticated:false},{headers:{"Cache-Control":"no-store"}});}