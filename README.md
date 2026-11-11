# Q JARVIS — Stage 1 Foundation

Stage 1 establishes the secure, cloud-first foundation for the Q JARVIS command centre. It is intentionally limited to the approved foundation scope.

## Stage 1 scope

- Next.js and TypeScript web command centre with responsive desktop and mobile web layouts.
- Owner-only authentication and access control.
- Protected backend/API structure.
- PostgreSQL persistence through Neon.
- Database-backed login throttling.
- Input validation, secure session handling, security headers, and secret-safe configuration.
- Activity/error logging and a system health endpoint.
- Architecture, installation, configuration, and recovery documentation.

## Explicit exclusions

No multi-model AI, autonomous agents, advanced memory or knowledge graph, voice, native mobile app, push notifications, operational integrations/actions, browser automation, financial/business transactions, predictive intelligence, continuous learning, or autonomous background execution.

## Technology

- Next.js App Router / TypeScript
- PostgreSQL on Neon
- Vercel deployment target

## Local development

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env.local`.
3. Set the required environment variables. Never commit real credentials or production data.
4. Install dependencies with `npm install`.
5. Apply the SQL migration in `database/migrations` to the configured Neon database.
6. Start the development server with `npm run dev`.

## Stage 1 acceptance

- A cloud-hosted URL is available with access control enabled.
- Owner authentication and authorization are enforced server-side.
- Protected APIs reject unauthenticated requests.
- Database reads and writes persist across requests.
- Login throttling is database-backed.
- No secrets are exposed in source, browser bundles, or logs.
- Layout is usable on desktop and Android mobile web.
- Navigation and system status are visible and functional.
- Health checks and error handling report real system state.
- Setup and recovery are reproducible from this repository.
- Critical automated checks pass.

## Current delivery status

This repository is the implementation source of truth. Acceptance criteria remain **pending verification** until implementation, automated checks, and a deployed smoke test have been completed.
