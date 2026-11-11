import {Pool} from "pg";
const url=process.env.DATABASE_URL;
const email=process.env.OWNER_EMAIL?.trim().toLowerCase();
if(!url||!email){console.error("DATABASE_URL and OWNER_EMAIL must be set in the shell environment.");process.exit(1);}
const pool=new Pool({connectionString:url,ssl:url.includes("localhost")?undefined:{rejectUnauthorized:true},max:1});
try{
 await pool.query("INSERT INTO users (id,email,display_name,role) VALUES ('owner',$1,'Owner','owner') ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,updated_at=now()",[email]);
 await pool.query("INSERT INTO user_preferences (user_id,preferences) VALUES ('owner','{}'::jsonb) ON CONFLICT (user_id) DO NOTHING");
 console.log("Owner account and preferences are provisioned.");
}finally{await pool.end();}
