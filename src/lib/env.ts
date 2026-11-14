import {z} from "zod";
const databaseSchema=z.object({DATABASE_URL:z.string().url()});
const authSchema=z.object({AUTH_SECRET:z.string().min(32),OWNER_PASSKEY:z.string().min(8).max(256)});
function validated<T>(schema:z.ZodType<T>){const parsed=schema.safeParse(process.env);if(!parsed.success){const keys=parsed.error.issues.map(x=>x.path.join(".")).join(", ");throw new Error("Server configuration is incomplete or invalid: "+keys);}return parsed.data;}
export function getDbEnv(){return validated(databaseSchema);}
export function getAuthEnv(){return validated(authSchema);}