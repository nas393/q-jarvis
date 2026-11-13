import {redirect} from "next/navigation";
import {readSession} from "@/lib/session";
import LoginForm from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await readSession();
  if (session) redirect("/dashboard");
  return <LoginForm />;
}
