# Progress

## Current state
Public beta deployed, anonymous live smoke tests passed, and source uploaded to
Sanchit1612/ClueFC main. GitHub verify and secret-scan jobs passed.

## Completed
- Authoritative rules, secret keys, 380 connected words, 6 easy / 16 medium / 3 hard
  deals, three word packs, Yellow protection setting, timers and rematches.
- Precise presence/lifecycle handling, all-offline freeze/resume, host migration,
  replacement votes, reserved-seat handling, late-seat uptake and refill.
- Public matchmaking, ready countdown, consent-based rematch and refill lifecycle.
- Persisted clue warnings, expanded multilingual blocklist, token/IP room bans,
  token buckets, escalating IP bans, per-action limits and bounded message bodies.
- Signed single-use connection proof; Cloudflare Turnstile integration is wired.
- Persistent reports and protected owner moderation/metrics dashboard.
- Anonymous operational/product aggregates, optional consented weekly returns,
  Do Not Track, data clearing, disabled ad-slot components and privacy choices.
- Owner-contact privacy/terms pages, 13+ confirmation and light/dark preference.
- Physical card details, deal/reveal/card animations, reduced-motion support.
- MVP, most guesses, top guesser, accuracy, clue assists, fastest correct guess,
  Howler, full team sheet; verified story/post JPG exports.
- 123 automated tests passing, typechecks and production build passing.
- Real local Worker/D1 full match and secrecy integration passing.
- Real HTTP soak: 200 rooms, 800 simulated players, 6,862 requests, 1,800 reveals,
  20 public matchmaking clients, zero server errors, ~40 MB heap growth.
- Secret scanner, local hooks, GitHub CI, scheduled soak/audit and live-health jobs.
- Production secrets configured outside source. Public access authorized by user.

## Release verification
- Public URL: https://clue-fc-matchday.moistcrown2.chatgpt.site
- Live anonymous pages, health/storage, connection proof, 13+ gate and joining passed.
- Live moderation persistence and authenticated admin access passed.
- Forged owner identity headers and anonymous admin reads were rejected.
- GitHub source commit: e1eac83a4d9886ab109dfc01e451325e793d1d4a.
- CI: https://github.com/Sanchit1612/ClueFC/actions/runs/42612826768
- Site runtime source: b4d259652a3e126cd034dd126da9d7ec11a77219.
- Next: owner real-group acceptance and optional Turnstile provisioning.

## External/manual acceptance items
- Owner Cloudflare Turnstile credentials are not available; the beta uses the
  implemented connection proof and abuse limits. Never use dummy production keys.
- Five real-group playtests, real mobile-network trials and legal/name review
  require people/owner participation; do not mark them done based on simulations.
- Ads/network applications intentionally remain off pending those playtests.
- Worker/D1 short polling replaces Socket.IO/Redis. GitHub health checks provide
  scheduled maintenance for Sites; Wrangler cron is supplied for direct hosting.

## Commands
npm test; npm run typecheck; npm run build
node scripts/validate-bundle.mjs; node scripts/scan-secrets.mjs
npm run db:local; npm run dev
node scripts/integration.mjs; node scripts/network-soak.ts --rooms 200
