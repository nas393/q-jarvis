-- Q JARVIS Stage 1 baseline schema. Safe to apply to an empty PostgreSQL database.
CREATE TABLE IF NOT EXISTS users (
 id text PRIMARY KEY,
 email text NOT NULL UNIQUE,
 display_name text NOT NULL DEFAULT 'Owner',
 role text NOT NULL DEFAULT 'owner' CHECK (role='owner'),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_preferences (
 user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title text NOT NULL DEFAULT 'New conversation',
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_user_updated_idx ON conversations(user_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('user','assistant','system','tool')),
 content text NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON messages(conversation_id,created_at);
CREATE TABLE IF NOT EXISTS projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name text NOT NULL,
 slug text NOT NULL,
 description text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','archived')),
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,slug)
);
CREATE TABLE IF NOT EXISTS memory_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 category text NOT NULL,
 content jsonb NOT NULL,
 source text NOT NULL,
 confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
 observed_at timestamptz,
 expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memory_records_user_category_idx ON memory_records(user_id,category,updated_at DESC);
CREATE TABLE IF NOT EXISTS integrations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 provider text NOT NULL,
 display_name text NOT NULL,
 status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected','connected','error','revoked')),
 permission_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
 connected_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,provider)
);
CREATE TABLE IF NOT EXISTS permissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 subject_type text NOT NULL CHECK (subject_type IN ('system','agent','integration','workflow')),
 subject_id text NOT NULL,
 action text NOT NULL,
 risk_level smallint NOT NULL CHECK (risk_level BETWEEN 0 AND 3),
 allowed boolean NOT NULL DEFAULT false,
 constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,subject_type,subject_id,action)
);
CREATE TABLE IF NOT EXISTS approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 action_type text NOT NULL,
 action_summary text NOT NULL,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 risk_level smallint NOT NULL CHECK (risk_level BETWEEN 0 AND 3),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired','cancelled')),
 decided_at timestamptz,
 expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS approvals_user_status_idx ON approvals(user_id,status,created_at DESC);
CREATE TABLE IF NOT EXISTS activity_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text REFERENCES users(id) ON DELETE SET NULL,
 actor_type text NOT NULL CHECK (actor_type IN ('owner','system','agent','integration')),
 actor_id text,
 action text NOT NULL,
 outcome text NOT NULL CHECK (outcome IN ('started','succeeded','failed','blocked','cancelled')),
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_logs_created_idx ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_user_created_idx ON activity_logs(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS system_settings (
 key text PRIMARY KEY,
 value jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth_login_attempts (
 bucket_hash text PRIMARY KEY,
 window_started_at timestamptz NOT NULL DEFAULT now(),
 attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0)
);
CREATE INDEX IF NOT EXISTS auth_login_attempts_window_idx ON auth_login_attempts(window_started_at);
