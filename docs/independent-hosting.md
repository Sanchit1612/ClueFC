# Independent hosting

The app can run directly in the owner's Cloudflare account. Workers hosts the
whole app; D1 stores rooms and scores. No Vercel migration is needed. The first
address is `https://clue-fc.<your-workers-subdomain>.workers.dev`; a purchased
domain can be attached later. The actual address is returned by deployment.

1. Sign into Cloudflare and authorize `npx wrangler login`.
2. Create the production database with `npx wrangler d1 create clue-fc-production`.
   Reuse its real UUID on subsequent deployments; never recreate it on every push.
3. Run `node scripts/configure-cloudflare.mjs <returned-database-UUID>`.
4. Build with `npm run build`, then apply migrations:
   `npx wrangler d1 migrations apply DB --remote --config wrangler.production.jsonc`.
5. Configure unique random `IP_HASH_SECRET` and `BOT_SECRET` using Wrangler secrets.
   Generate them in memory and send them via stdin to `wrangler secret bulk
   --config wrangler.production.jsonc`. Never save or print secret values.
6. Deploy with `npx wrangler deploy --config wrangler.production.jsonc`.
7. Verify anonymous home/rules/privacy/terms/health, solo bots, room joining,
   hidden-key redaction and moderation authorization at the returned address.

`wrangler.production.jsonc` is account-specific and ignored by Git. The normal
`wrangler.jsonc` continues to use the separate local development database.
Database bindings and public variables live in configuration; secrets stay in
Cloudflare. The production configuration enables public connection proof, owner
contact and scheduled cleanup. Turnstile remains an optional later setup.

The Sites-only `ADMIN_EMAIL` identity must not be set on this direct deployment:
Cloudflare does not supply the trusted Sites identity header. Owner moderation
remains locked until a separate `ADMIN_TOKEN` is provisioned securely and used
through the protected admin API. Do not copy the Sites environment wholesale.

This starts with a fresh database. Existing test room links and browser sessions
on the Sites origin remain there; players create new rooms at the new origin.
No paid plan or domain purchase is initiated by preparing this configuration.

## Current primary address: Pages

The primary address is now https://cluefc.pages.dev. The `cluefc` Pages project
uses the same production D1 database, via an advanced-mode `_worker.js` built
from the tested server bundle. It serves both the interface and API directly;
there is no proxy to the old hostname. It has its own secrets in Pages production
settings. Browser storage is specific to each origin, so previously saved room
sessions are not transferred between domains.

To update the game:

```sh
npm run typecheck
npm test
npm run build
node scripts/validate-bundle.mjs
node scripts/prepare-pages.mjs cluefc
npx wrangler pages deploy --project-name cluefc --branch main --cwd .cloudflare-pages
```

The generated `.cloudflare-pages/wrangler.jsonc` is ignored by Git and uses the
real database binding from `wrangler.production.jsonc`. The old Worker now has
`REDIRECT_ORIGIN=https://cluefc.pages.dev` in that ignored production config. Keep
that setting when deploying it. Only its scheduled cleanup still runs there;
all incoming requests redirect to Pages with invite paths and queries preserved.
Pages has no scheduled handler, so retain the old Worker's cleanup cron and the
GitHub health check. Do not create a second database for Pages.

The initial Pages project was created directly using Wrangler's Pages
`project create cluefc --production-branch main --force` path after the default
command delegated to Workers. The project now exists; subsequent Pages deploys
use the normal command above without `--force`.
