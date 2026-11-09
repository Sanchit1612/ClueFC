# Feature checklist

Software release audit: 9 November 2026. Automated and local-browser checks are
separate from real-group acceptance and commercial/legal decisions.

| Area | Software status | Evidence / behavior |
| --- | --- | --- |
| Private rooms and public Quick Match | Complete | Codes/links, nicknames, no game accounts; 20 public clients placed and started in network tests. |
| Teams, roles, lobby and settings | Complete | Four-player minimum, 12 seats/8 spectators, three packs, timers, Yellow switch and final-word protection switch. |
| Word board and content | Complete | 5×5, cryptographic draw/key, 380 connected entries, medium difficulty, repeat avoidance. |
| Game rules and clue checks | Complete | All tile outcomes, penalties, wins/losses, 0–9/unlimited, Unicode/overlap/plural/profanity checks. |
| Server authority and key secrecy | Complete | Viewer-specific null hidden types, no optimistic reveal, checked throughout real HTTP matches and in the production browser bundle. |
| Protocol and concurrency | Complete with selected architecture | zod intents, sequence receipts, versioned snapshots and conditional writes replace socket events and in-process queues. |
| Persistence and restart | Complete with selected architecture | Durable D1 room state; no process-local authoritative room map or Redis service needed. |
| Reconnect and presence | Complete in software | Same token/seat, cookie fallback, takeover, backoff, draft preservation, server clock and all-offline pause/resume. Real phone trial still required. |
| Grace, timers, host migration and replacement | Complete in software | Timestamp-derived deadlines, reserved seats, Spymaster pause/pass/vote replacement, late open-seat uptake, idle/abandonment logic. |
| Public result/rematch/refill | Complete | Results wait for consent, both-team rematch requests/countdown, ready skip, return to lobby and seat refill after departures. |
| UI, commentary, accessibility | Complete | Football tabletop, role panels, physical cards, reveal/deal/card motion, reduced motion, labels independent from colour, contrast assertions, phone layouts. |
| Match awards and report | Complete | MVP rating, most attempts, top correct guesser, accuracy, best Spymaster, clue assists, fastest correct guess, Howler and all-player table. |
| Scorecard and share | Complete | Real server-recorded statistics; JPG story 1080×1920 and post 1080×1350 downloaded and visually verified. Text/native share and WhatsApp invite links. |
| Moderation | Complete in software | Fixed reactions, expanded multilingual normalized blocklist, persistent reports, protected owner review, private kick/public majority vote, token/IP room bans, reviewable griefing warnings. No filter can guarantee detection of every language or evasion. |
| Flood and input protection | Complete | 2KB streaming limit, per-IP/token buckets, action limits, expiring counters and escalating temporary bans; malformed/duplicate/wrong-role/concurrent cases tested. |
| Managed Turnstile | Needs owner credentials | Browser/server integration implemented. Beta uses signed single-use IP-bound connection proof plus rate limits until real Cloudflare keys are configured. |
| Security headers and transport | Complete | Hosting TLS, HSTS, CSP, same-origin write checks, escaped content, server-only credentials and daily-keyed IP pseudonyms. |
| Owner operations and monitoring | Complete in software | Admin report inbox, aggregate metrics, operational alerts, Worker logs, health probe, scheduled GitHub health checks and cleanup. GitHub notification preferences control owner alerts. |
| Aggregate analytics and privacy choices | Complete | Match/rematch/duration/reconnect/abandonment/report counters; opt-in weekly returns; DNT, consent expiry and clear-data control. No third-party tracker SDK. |
| Privacy / terms / age / appearance | Complete in product | Owner contact, effective date, purpose/retention/rights/provider disclosures, terms, 13+ confirmation, privacy controls, light/dark preference. Professional legal review remains external. |
| AdSlot abstraction | Complete, disabled | No ads or ad scripts load. Advertising consent remains off. |
| Actual monetization | Intentionally gated | Ad-network approval, sponsors and commercial launch require the original playtest/legal prerequisites and owner decisions. |
| CI and source hygiene | Complete in source | Typechecks, tests, build, bundle secrecy, secret scan, gitleaks, audit, hooks, weekly Dependabot and network soak workflows. [Verify and secret-scan passed](https://github.com/Sanchit1612/ClueFC/actions/runs/42612826768). |
| Network/chaos checks | Complete for local acceptance | 200 real HTTP rooms / 800 simulated players over API + D1-compatible SQLite; separate real local Worker/D1 match. Not a multi-region production capacity guarantee. |
| Five real groups and live-device playtest | External acceptance | Must be conducted by real people. Automated bots do not satisfy this row. |
| Name/domain/football/legal clearance | Owner decision | CLUE FC remains the selected working name; no club badges copied. No legal clearance or domain purchase is fabricated. |

See operations.md for hosting, secret, monitoring and retention details.
