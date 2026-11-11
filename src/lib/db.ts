import {Pool} from "pg";
import {getDbEnv} from "@/lib/env";
const globalForPg=globalThis as unknown as {qJarvisPool?:Pool};
export function getDb(){if(globalForPg.qJarvisPool)return globalForPg.qJarvisPool;const env=getDbEnv();const pool=new Pool({connectionString:env.DATABASE_URL,ssl:env.DATABASE_URL.includes("localhost")?undefined:{rejectUnauthorized:true},max:5,idleTimeoutMillis:10000,connectionTimeoutMillis:5000,statement_timeout:8000,application_name:"q-jarvis-stage1"});pool.on("error",e=>console.error("database_pool_error",{name:e.name}));globalForPg.qJarvisPool=pool;return pool;}