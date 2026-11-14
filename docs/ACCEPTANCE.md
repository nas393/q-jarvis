# Stage 1 Acceptance Checklist

Status is pending until a real build and deployed verification are completed.

| Criterion | Verification | Status |
|---|---|---|
| Cloud URL exists | Vercel deployment URL responds | Pending |
| Owner-only authentication | Owner login succeeds; invalid credentials fail | Pending |
| Protected API | Unauthenticated private API returns 401 | Pending |
| Persistent database read/write | Create conversation, reload, confirm row remains | Pending |
| Database-backed throttling | Repeated invalid attempts return 429 | Pending |
| No secret exposure | Source scan, browser bundle and log review | Pending |
| Responsive desktop and Android web | Test 1920, 1440, 768, 390 and 360 px widths | Pending |
| Navigation and status | Dashboard entry, sign-out and status work | Pending |
| Real health/error handling | Healthy DB gives 200; unavailable DB gives 503 | Pending |
| Reproducible documentation | Clean install and deployment steps followed | Pending |
| Critical checks pass | Typecheck, lint, production build and smoke tests | Pending |

A code commit alone does not satisfy deployment or runtime acceptance.