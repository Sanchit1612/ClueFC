# Operations

The public game stays account-free. `/admin` is protected by the verified OpenAI Sites owner identity. Its email allowlist is configured server-side and is independent from the public contact email. Operators can review reports, see aggregate match/reconnect/retention counters, view operational alerts and trigger expired-record cleanup. No board keys or player credentials appear in the moderation inbox.

## Monitoring and maintenance

- `/health` checks D1 and schedules bounded expired-record cleanup.
- `.github/workflows/health.yml` checks the live public URL every 15 minutes and fails on HTTP/storage errors. GitHub Actions notifications provide the owner failure notifications, subject to the owner's GitHub notification preferences. Schedules may be delayed by GitHub and are not a 24/7 SLA.
- The owner dashboard flags accumulated server errors and a growing moderation backlog.
- `worker.scheduled` performs cleanup and emits structured operational alerts. The equivalent five-minute Worker cron is declared in wrangler.jsonc for deployments made directly through Wrangler. Sites does not expose Worker cron configuration, so the GitHub health workflow is the scheduled maintenance path for this Site.
- Production Worker errors are available through Sites logs. No free-text clue or board key is logged.

## Server-only environment

`IP_HASH_SECRET`, `BOT_SECRET` and `ADMIN_TOKEN` are cryptographically generated runtime secrets. `ADMIN_EMAIL` is the verified Site owner's identity; `OWNER_CONTACT` is the public support contact. `PUBLIC_MODE=true` enables the age confirmation and anti-bot gate. No secret belongs in GitHub source or browser code.

## Bot checks

The deployed beta uses a signed, expiring, single-use, IP-bound connection proof plus token-bucket limits, create/join/report limits and escalating temporary IP bans. It adds no third-party scripts. This is a pragmatic beta safeguard, not an equivalent claim to Cloudflare's managed bot detection.

The named Cloudflare Turnstile integration is implemented but requires `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET` from the owner's Cloudflare account. Configure both in Sites environment settings, then redeploy the saved version. A successful verification must match the Site hostname. Test keys must never be used in production. No account credentials were requested or fabricated.

## Data retention

Rooms enforce five-minute lobby / ten-minute match absence deadlines on reads and joins, even between maintenance runs. Maintenance deletes expired rooms/counters, 30-day reports, 90-day operator/optional-return records and one-year anonymous aggregates. The public policy explains that physical cleanup may lag the expiry window during outages.

## Checks

`npm test` includes rules, lifecycle, security, moderation, consent/DNT, statistics and accessibility assertions. `node scripts/network-soak.ts --rooms 200` runs real local HTTP with 800 simulated players over the real API and a SQLite D1-compatible adapter. `node scripts/integration.mjs` exercises a running Wrangler Worker with its real local D1 instance. Neither is a substitute for multi-region production load testing or five real groups.

## Owner tasks

Run the five-group playtest, including real phone-network interruptions. Review the product name, third-party football references and legal pages before commercial use. Configure Turnstile when Cloudflare keys are available. Ads remain disabled until the spec's playtest and consent prerequisites have been met.
