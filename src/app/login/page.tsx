import {redirect} from "next/navigation";
import {readSession} from "@/lib/session";
import LoginForm from "@/components/login-form";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await readSession();
  if (session) redirect("/dashboard");
  const params = await searchParams;
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;
  const initialError = typeof rawError === "string" ? rawError.slice(0, 180) : "";
  return <LoginForm initialError={initialError} />;
}
