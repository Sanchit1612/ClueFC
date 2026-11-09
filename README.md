# CLUE FC

A football word game with solo bot play, private rooms and public Quick Match.
Solo play fills four seats with you and three labelled computer players; private hosts can also fill empty seats with bots. Quick Match is for humans. See [bot play](docs/bot-play.md).
Two teams connect words from one-word clues; Yellow Cards award a penalty word,
and a Red Card ends the match. No game account is required.

[Play CLUE FC](https://clue-fc.cluefc.workers.dev)

## Run locally

Requires Node 24+ (Node 26 was used for development).

```sh
npm ci
npm run db:local
npm run dev
```

Open http://localhost:8787. Use independent browser profiles/devices for separate
players. Opening the same room with the same saved token in a second tab takes
over the first tab. The home screen's practice clue works with one person.

```sh
npm test
npm run typecheck
npm run build
node scripts/validate-bundle.mjs
node scripts/scan-secrets.mjs
node scripts/integration.mjs        # against running Wrangler
node scripts/network-soak.ts --rooms 200
```

## Game and report

- 380 curated words across players, clubs, venues, managers and football terms.
- Classic, Terrace & Legends and Tactics Room packs.
- Default board: 6 easy, 16 medium and 3 hard words. Overlapping association pairs
  are seeded without influencing the independently randomized team colours.
- Previous three boards are excluded on rematch.
- MVP, most attempts, top correct guesser, accuracy, clue assists, best Spymaster,
  fastest correct guess, Howler and full player statistics use server records.
- Download a JPG report in 1080×1920 story or 1080×1350 post format.
- Card deal/flip/booking animations respect reduced-motion preferences.

## Architecture

- `packages/game-core`: framework-free TypeScript rules, selection and reports.
- `packages/protocol`: validated intents and the single `APP_NAME` constant.
- `apps/server`: Cloudflare Worker, durable D1 rooms, security and operations.
- `apps/web`: small responsive TypeScript client, styles and canvas JPG renderer.
- `data`: curated word associations and normalized moderation blocklist.
- `drizzle`: append-only D1 migrations.

Clients send intents and wait for server outcomes. Viewer-specific snapshots send
unrevealed types only to current Spymasters. Conditional room-version writes
serialize concurrent actions across Worker instances. Short polling replaces the
originally recommended separate WebSocket/Redis service. State survives process
restarts; timestamp-derived expiry applies even between cleanup jobs.

## Hosting and operations

The primary public deployment runs in the owner’s Cloudflare account. See
[independent hosting](docs/independent-hosting.md). Use the ignored account-specific
`wrangler.production.jsonc` for production; `wrangler.jsonc` is local development.
The original `.openai/hosting.json` identifies the legacy Sites deployment; preserve
its ID, but do not publish there unless the owner asks for it.

`/admin` uses the verified Site owner’s identity on the legacy Sites deployment.
Direct hosting keeps administrative access locked until an owner token is securely
provisioned; it never trusts a client-supplied Sites identity header. The admin API provides persistent moderation
reports, aggregate metrics and operational alerts. Public contact email is
separate from the private admin identity. Server credentials are runtime secrets;
`.env.example` contains names only.

The public beta uses a signed, expiring, IP-bound, single-use connection proof,
rate limits and escalating bans. Cloudflare Turnstile browser/server integration
is also implemented; it needs the owner's real `TURNSTILE_SITE_KEY` and
`TURNSTILE_SECRET`. Never substitute Cloudflare test keys in production.

GitHub workflows run tests, secret scans, dependency audits, scheduled network
soaks and a public health/storage check every 15 minutes. Health checks also
trigger bounded expired-record cleanup. GitHub notification settings determine
failure notifications; scheduled jobs are not an uptime SLA.

## Privacy and launch status

The game has a Privacy Policy, Terms, owner contact, 13+ confirmation, privacy
choices, Do Not Track handling and saved-data clearing. Weekly-return analytics
are opt-in. There is no third-party analytics SDK or advertising SDK, and ad slots
are disabled.

See [the checklist](docs/features.md) and [operations guide](docs/operations.md).
Five real-group playtests, real phone-network trials and professional legal/name
review are owner acceptance tasks; simulations do not stand in for them. Ads and
commercial launch remain gated on those original prerequisites.
