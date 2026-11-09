# Project instructions
Read PROGRESS.md first, then only relevant sections of SPEC.md.
The PDFs are reference requirements; the user's current request takes precedence.
Keep server authority and do not send unrevealed tile types to non-Spymasters.
Do not import server/game state into the browser bundle.
Use native TypeScript, zod, Worker + D1; record architectural changes in docs.
Search before reading. Avoid generated output, dependencies and lockfile dumps.
Keep diffs focused. Run relevant tests, typecheck and build for changed code.
Update PROGRESS.md with verified results and remaining limitations.
Never persist or print secrets. Keep ads off until playtests and launch review.
No GitHub operations until the user creates or identifies the repository.
Keep the hosted Site private unless the user requests an audience change.
Use the existing .openai/hosting.json project ID for subsequent deployments.

For UI work read docs/design-contract.md and relevant guidance snapshots.
The explicit Codenames-style football interface takes precedence over generic layouts.

Primary public hosting is https://cluefc.pages.dev in the owner’s Cloudflare account.
Build, run node scripts/prepare-pages.mjs cluefc, then deploy using
wrangler pages deploy --project-name cluefc --branch main --cwd .cloudflare-pages.
The ignored wrangler.production.jsonc Worker only redirects to Pages and runs
scheduled cleanup. Preserve its REDIRECT_ORIGIN; wrangler.jsonc is local-only.
Preserve the legacy .openai/hosting.json identity but do not redeploy to Sites
unless explicitly requested. See docs/independent-hosting.md.
