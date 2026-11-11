# Q JARVIS Stage 1 Architecture

## Runtime boundaries
- Next.js App Router serves the command-centre UI and server-side API routes.
- Neon PostgreSQL is the persistence boundary. Database access is server-only through a bounded connection pool.
- Vercel is the cloud runtime target. Deployment protection remains enabled pending an access-policy review.
- Authentication is a single-owner model. The owner record is resolved from PostgreSQL; a bcrypt password hash is supplied through server-only environment configuration.
- Sessions are signed HS256 JWTs in HTTP-only, Secure-in-production, SameSite=Strict cookies.

## Security controls
- Server-side owner role check; no client-side role trust.
- Login attempt buckets are hashed and persisted in PostgreSQL with a 15-minute window and request throttling.
- Zod validation at API boundaries and parameterized SQL.
- No credential values in application logs.
- Security response headers and no-index metadata.
- Health endpoint returns component status only, not secrets or connection details.

## Data
The initial schema is provisioned in Neon. The application uses users, conversations, activity_logs, and auth_login_attempts. Conversation ownership is enforced in every query.

## Stage 1 non-goals
No model inference, agents, advanced memory, voice, native app, push, business-system integrations, browser automation, financial actions, predictive functions, continuous learning, or autonomous background jobs.