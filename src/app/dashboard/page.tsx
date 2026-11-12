import { getDb } from "@/lib/db";
import WebOS from "@/components/web-os";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const db = getDb();
  const ownerId = "owner";
  const [conversations, audit] = await Promise.all([
    db.query("SELECT count(*)::int AS count FROM conversations WHERE user_id=$1", [ownerId]),
    db.query("SELECT count(*)::int AS count FROM activity_logs WHERE created_at>now()-interval '24 hours'")
  ]);
  return <WebOS conversationCount={conversations.rows[0].count} activityCount={audit.rows[0].count} />;
}
