# Decisions

- 2026-11-09: User requested an end-to-end build and workable link, with GitHub to be created later; no GitHub repo or PR created. Reference documents' one-phase-per-session and stop-before-deploy instructions do not override that request.
- 2026-11-09: User explicitly selected owner-private hosting for testing.
- 2026-11-09: Keep CLUE FC as provisional APP_NAME, English, minimum four real players, no analytics database or ads.
- 2026-11-09: Worker + durable D1 conditional room-version writes replace separate Socket.IO/Redis deployment, allowing a working private hosted link with available hosting. Polling is one second during play and 1.5 seconds in lobby.
- 2026-11-09: Small native TypeScript UI replaces Next.js/React/Tailwind: no framework runtime required for this game, fewer dependencies and lower build overhead.
- 2026-11-09: zod validates messages; esbuild bundles client/server; TypeScript checks code; Wrangler provides local Worker/D1 development; Cloudflare types describe platform interfaces. All dependencies have a direct build or validation purpose.
- 2026-11-09: D1 stores expiring room JSON, reports and rate counters. No accounts, chat, optional analytics, advertising scripts or paid services.
- 2026-11-09: Operational deadlines evaluated on requests; no cron/background room scheduler. Empty room expiration enforced on reads and swept during room creation.

- 2026-11-09: User rejected the first frontend and requested Codenames-style football UI. Rebuilt entry, lobby, match cards, dugouts and secondary surfaces; reused the existing validated game service. Applied relevant skills from all three user-linked repositories; no global installation or runtime dependency added.

- 2026-11-09: User requested groupable words with moderate difficulty. Curated 380 entries and seeded overlapping cross-category associations with a 6/16/3 difficulty mix. Team assignment stays independently random; association tags remain server-only. Existing matches retain their boards; new matches/rematches use the new pack.
