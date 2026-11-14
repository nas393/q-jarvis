# Project Control Tower integrations

The private `/projects` page reads GitHub and Vercel metadata only. It does not create deployments, close issues, change repository settings, or write to either platform.

## Required Vercel environment variables

Configure these in the Vercel project settings for **q-jarvis** (Production and Preview as appropriate):

- `GITHUB_TOKEN`: a fine-grained GitHub token limited to the required `nas393` repositories, with read-only access to repository metadata, contents, and issues.
- `VERCEL_TOKEN`: a Vercel token with read access to deployments for the `nas393s-projects` team.

Do not commit real tokens, paste them into chat, or expose them as `NEXT_PUBLIC_*` variables. After setting them, redeploy Q JARVIS.

## Data model

- Deployment health: latest deployment state returned by Vercel.
- Outstanding bugs: open GitHub issues (pull requests excluded).
- Last activity: latest repository commit.
- Priority and next action: portfolio metadata in `src/app/api/projects/route.ts`, deliberately kept separate from live platform data.

Projects without a mapped repository or Vercel project remain visible as not linked. The LUMERIS Reel Maker Vercel project currently reports a deployment whose Git metadata points to `photo-nw-vault`; verify the project/repository connection before treating it as correct.

## Access and safety

Keep Vercel Deployment Protection enabled. The API route is read-only and should remain behind the existing protected Q deployment. Rotate any token immediately if it is ever exposed.
