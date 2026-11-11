# Private growth analytics

The owner dashboard is https://cluefc.pages.dev/analytics. Public visitors cannot
read its API. Set ADMIN_TOKEN as a production Pages secret (24+ characters),
redeploy, and sign in there. Enter the passphrase directly into Cloudflare;
never commit it or send it in chat. Signed, server-revocable HttpOnly cookies
expire after 12 hours. Login is rate-limited; logout invalidates the session.

## Measurement contract

Migration 0002 starts a new measurement epoch. There is no historical traffic
backfill. Existing operational totals include development/playtest activity.

Server-derived game facts cover starts, normal finishes, abandonment, rematches,
mode and human/bot seats. They contain no card boards, player names, room codes,
credentials or messages. Human participations are seats per match, not unique
people. Pending games are excluded from completion; expired unfinished games
become abandoned. Completed daily cohorts use match start date in UTC.

Optional traffic requires renewed version-2 consent and respects Do Not Track.
Identifiers are pseudonymous browsers, never verified people. Attribution uses
allowlisted source/medium/campaign/content labels and coarse device category;
raw URLs, arbitrary tags, IP addresses and full referrers are not retained here.
Sessions expire after 30 minutes of inactivity; the opt-in browser ID lasts
90 days. Revocation deactivates the current server session and clears local IDs.
Detailed records are deleted after 90 days by the existing cleanup scheduler.

| Stage | Authority | Deduplication |
| --- | --- | --- |
| session_started, landing_view | consenting client | session + stage |
| practice_started, invite_shared, scorecard_downloaded | consenting client | session + stage |
| room_created, room_joined | server | session + stage |
| match_started, match_finished, rematch_started | server | session + stage |
| match facts | server room persistence | keyed room + game start |

The funnel intersects visit → entered room → match start → finish within the
same opt-in session. Source tables use first touch per session. One returning
browser can contribute to different sources; channel visitor counts are not
additive. Seven-day return only includes mature first-visit cohorts and returns
on days 1–6. New cohorts show pending rather than an invented zero rate.

The dashboard supports 7/30/90-day UTC windows, daily charts, channels, a campaign
link builder, summary CSV, operations and moderation. It refreshes every 30
seconds while visible and does not track owner dashboard visits. WebGames
placements use a clean URL to respect its referral-link restriction.

## Validation

149 automated tests passed, including consent, attribution, ordered funnel,
mature retention, private API access, session tampering/logout and a tracked
real game lifecycle. Typechecks, build, browser bundle secrecy and a 20-room /
80-player network regression passed. Desktop/mobile layout and CSV download
were checked locally. Local QA records are not acquired users.

Reports currently aggregate selected detail in Worker memory; suitable for beta
volume. Revisit SQL aggregation and D1 limits before a large promotion. A shared
owner passphrase is a single-owner beta control, not multi-user administration.
