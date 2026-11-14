# Installation and Operations

## Required environment variables
- DATABASE_URL: Neon PostgreSQL connection string; server-only.
- AUTH_SECRET: random secret of at least 32 bytes.
- OWNER_EMAIL: must match the pre-provisioned owner row in users.
- OWNER_PASSWORD_HASH: bcrypt hash (cost 12 or higher).
- APP_URL: canonical application URL.

Generate a password hash locally:
npm run auth:hash -- 'your-long-unique-password'

Store the output as OWNER_PASSWORD_HASH in Vercel environment variables. Do not put the plaintext password in an environment variable, file, issue, or chat.

## Database and owner bootstrap
Apply database/migrations/0001_initial.sql to an empty PostgreSQL database. For the existing Neon project, the Stage 1 schema has already been provisioned and verified. Set DATABASE_URL and OWNER_EMAIL in the shell, then run npm run owner:bootstrap to create or reconcile the owner row and initialize preferences.

## Local setup
cp .env.example .env.local
npm install
npm run typecheck
npm run lint
npm run build
npm run dev

Populate .env.local with valid values before starting the application. Never commit .env.local.

## Deployment
Connect this repository to the existing Vercel project q-jarvis. Configure required variables for Preview and Production. Keep Vercel Deployment Protection enabled. Deploy a preview first; do not promote to Production until acceptance is signed off.

## Health and recovery
- GET /api/health checks application and PostgreSQL connectivity.
- A 503 response indicates one or more required services are unavailable.
- Verify DATABASE_URL, Neon compute availability, and network access before restarting deployments.
- Rotate AUTH_SECRET to invalidate all existing sessions.
- Do not run destructive database operations as a recovery shortcut.