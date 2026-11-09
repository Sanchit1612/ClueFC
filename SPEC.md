## PDF page 1
Football Word Game: Build Spec for an AI
Coding Agent
Working title: CLUE FC (rename before launch, "Clue" and "Codenames" are
trademarked). Version 1 spec. Read this whole file before writing code.
0. How to use this document (instructions to the agent)
1. This file is the source of truth. If code and spec disagree, ask the human, then update
the spec.
2. Build in the phases of Section 12, in order. Do not start a phase until the previous one's
acceptance checks pass.
3. Server is authoritative. The client never decides game outcomes and never receives
hidden information.
4. Prefer boring, small, well-tested solutions. No extra features, no new dependencies
without a one-line justification.
5. Every rule in Sections 4 to 9 needs an automated test. Game logic lives in a pure,
framework-free module ( /packages/game-core ) so it can be unit-tested without
sockets.
6. Keep the product name in one constant ( APP_NAME ) so renaming is a one-line change.
7. Commit small. After each phase, summarise what works, what is stubbed, and what is
risky.
1. Product in one paragraph
A football-themed Codenames-style party game. Two teams (Home, blue, and Away,
orange) share a 5x5 board of football words. One Spymaster per team sees the secret
colour key and gives a one-word clue plus a number. Teammates tap tiles. First team to
find all its words wins, or loses instantly by tapping the Red Card. No sign-up. Join by link
or code. Rematch in one tap. A text commentator reacts to every reveal. Two ways to play:
private rooms (friends, shared via WhatsApp link) and public rooms (strangers
worldwide via Quick Match).
Design targets
Link tap to first clue under 30 seconds.
Rematch reloads in under 5 seconds.
Match length 10 to 15 minutes.
Football Word Game: Build Spec for an AI Coding Agent
Page 1 of 16

## PDF page 2
Works well on a phone with one thumb.
2. Scope
In v1: private rooms, public Quick Match, Home/Away teams, Spymaster flow, Yellow/Red
cards, commentator, results + share card, rematch, reconnection, basic moderation,
privacy/cookie pages, ad slot components (disabled until Phase 9).
Not in v1: accounts or login, free-text chat, voice chat, ranked ladders, word-pack store,
native apps, payments, user-generated words.
3. Architecture
3.1 Stack (recommended, change only with reason)
Monorepo layout:
Layer Choice Why
Front end Next.js (App Router) + React +
TypeScript + Tailwind
Fast to build, easy static pages
(/how, /privacy)
Realtime game
server
Node.js + TypeScript + Socket.IO (or
ws ), separate service
Next.js on serverless cannot
hold WebSockets. Rooms need
a long-lived process
Shared logic /packages/game-core  (pure TS) +
/packages/protocol  (zod schemas)
One source of truth for rules
and message shapes
Ephemeral state In-memory room map in the game
server, snapshotted to Redis
(Upstash or similar) with TTL
Fast, and rooms survive a
server restart
Persistence None required in v1. Optional
anonymous aggregate stats table
later
No personal data to protect
Hosting Front end on
Vercel/Netlify/Cloudflare Pages.
Game server on Fly.io, Railway or
Render with WebSocket support
Cheap and simple
Bot protection Cloudflare Turnstile on room creation
and Quick Match
Free, privacy-friendly
Football Word Game: Build Spec for an AI Coding Agent
Page 2 of 16

## PDF page 3
/apps/web            Next.js client
/apps/server         realtime game server
/packages/game-core  pure rules engine, board generation, clue validation, 
commentary
/packages/protocol   zod schemas for every client<->server message
/data/words.en.json  word packs
3.2 Authority model (most important rule)
The server owns all state: rooms, players, board, key, turn, timers.
Clients send intents ("I tap tile 7"). The server validates, applies, then broadcasts the
result.
No optimistic reveal on the client. UI may show a pending state, then waits for the
server event.
The colour key is sent only to the two Spymaster sockets, via a private channel/event.
It is never in a broadcast, never in a snapshot sent to guessers, never in logs, never in
the page HTML.
Hiding with CSS is a security failure. Test for it (Section 9).
3.3 Scaling and worldwide play
v1: one region, one game-server process is enough for thousands of concurrent
players. Turn-based play tolerates 200 to 300 ms latency, so strangers worldwide are
fine from a single region.
Pick the region closest to the main audience (India/Asia: Singapore or Mumbai if
offered).
Keep rooms stateless-ready: all state serialisable to JSON, saved to Redis on every
state change (debounced to at most once per second plus on every turn change).
Scale-out plan (do NOT build in v1, but do not block it): route each room to one
instance via consistent hashing on room code, or use a Redis adapter for pub/sub.
Document the choice in /docs/scaling.md  when needed.
Add a /health  endpoint, structured logs, and a simple metrics counter (rooms open,
players connected, matches finished, reconnects).
Football Word Game: Build Spec for an AI Coding Agent
Page 3 of 16

## PDF page 4
4. Game rules (authoritative)
4.1 Board
25 tiles drawn at random from the selected word pack, using a cryptographically secure
RNG. Assigned types:
Total 25. The team that starts is random and gets 9 words. Display the starting team
clearly.
If the host disables Yellow Cards in settings, replace the 3 yellows with 3 extra Bench tiles
(classic mode).
4.2 Penalty rule (changed from original concept, do not skip)
A penalty reveals one of the opponent's unrevealed words. Rules:
The server picks the word. Pick uniformly at random among the opponent's
unrevealed words, excluding the last remaining one.
If the opponent has only 1 word left, the penalty gives nothing and the card behaves
like Bench. A yellow card must never hand over the win.
The penalised word is revealed to everyone with commentary.
If the penalty reveals the opponent's second-to-last word it is allowed. Only the very
last is protected.
Make this a setting yellowPenaltyProtectsLastWord  (default true) so it can be
playtested.
4.3 Turn flow
1. Active team's Spymaster submits a clue (word + number 0 to 9, or unlimited ).
2. Active team's guessers reveal tiles one at a time. Max guesses = number + 1
(unlimited: no cap, 0: also allowed up to 1 guess).
Type Count Effect when a guesser reveals it
Starting team word 9 Counts for that team
Other team word 8 Counts for that team
Bench (neutral) 4 Turn ends
Yellow Card 3 Turn ends AND the other team gets one free word
(penalty)
Red Card 1 Revealing team loses immediately
Football Word Game: Build Spec for an AI Coding Agent
Page 4 of 16

## PDF page 5
3. Turn ends when: wrong tile revealed (opponent word, Bench, Yellow), guess limit
reached, team presses End turn, or the turn timer expires.
4. Win check runs after every reveal and after every penalty: if a team has revealed all
its words, that team wins. Red Card means the revealing team loses.
5. Edge case: if one tap both reveals a Yellow and the penalty completes the opponent's
words (impossible with last-word protection on, but handle it when off), opponent
wins.
4.4 Clue validation (server side, all must pass)
Single token, letters only (allow unicode letters, no digits, spaces, hyphens,
punctuation). 2 to 20 characters.
Normalise: trim, lowercase, strip accents for comparison.
Reject if it equals any board word (revealed or not).
Reject if it is a substring of a board word, or a board word is a substring of it (e.g.
GOAL vs GOALS, PENALTY vs PENALTIES). Use a simple stemmer or plural rule for
English.
Reject if profane or on the blocklist (Section 8).
Number must be integer 0 to 9, or unlimited .
Reject if not the Spymaster of the active team, or if a clue is already active.
Return a specific error code so the UI can say why.
4.5 Roles and starting a match
Minimum 2 players per team, each with one Spymaster (so 4 players). Allow a debug
override in dev only.
Spymaster rotates on rematch. Teams swap sides on rematch (Home becomes Away)
so starting-team advantage evens out.
Late joiners during a match become spectators (see board as a guesser, no key). They
can take a seat if one is open (a disconnected player's seat is only reclaimed after the
grace period, Section 7).
Maximum 12 players plus 8 spectators per room.
5. User flows
5.1 Private room (friends)
1. Landing: Create room (no sign-up). Server creates room, returns code XXX-NN  style
and the player token.
Football Word Game: Build Spec for an AI Coding Agent
Page 5 of 16

## PDF page 6
2. Lobby: share link /r/CODE  and WhatsApp share button with a pre-filled invite line.
Friends open the link, enter a nickname (pre-filled from last time, stored in the
browser), and are in.
3. Players tap a team, tap to become Spymaster. Host picks settings: word pack, timer
(off/60/90/120 s), Yellow Cards on/off.
4. Host presses Start match once each team has 2+ players and a Spymaster.
5. Match, Full time, Rematch (stays on the same URL, no page load).
5.2 Public room (strangers)
1. Landing: Quick Match. Turnstile check, then pick a nickname.
2. Matchmaker places the player in an open public room with free seats, preferring
rooms already waiting and same language. If none, create one.
3. Public room lobby has an auto-start rule: when 4+ players present and each team has
a Spymaster, a 20 second countdown starts (any player can ready up to skip).
Countdown cancels if it drops below the minimum.
4. Roles in public rooms are auto-suggested: the server proposes Spymasters (first
player on each team), players may swap by agreement. No host powers beyond safe
ones (no kick, but vote-kick exists, Section 8).
5. Public rooms always use defaults (Classic pack, timer 90 s, Yellow Cards on) so
strangers know the rules. A short rules card is shown in the lobby.
6. On Full time, players can Rematch (stay together), or Leave. If fewer than 4 remain,
the room returns to the lobby and re-fills via matchmaking.
5.3 Screens
Landing , Lobby , Match (guesser) , Match (Spymaster) , Full time , plus static /how ,
/privacy , /terms . The room route /r/CODE  swaps between Lobby, Match and Results
from server state, with no page load.
6. Realtime protocol
All messages are JSON validated with zod on both sides. Every client message has {
type, seq, payload } . seq  is a per-client increasing integer for idempotency. Every
server broadcast carries roomVersion  (increments on every state change).
Football Word Game: Build Spec for an AI Coding Agent
Page 6 of 16

## PDF page 7
6.1 Client to server
room.create , room.join {code, nickname, playerToken?} , room.leave , team.join
{team} , role.spymaster.claim , settings.update  (host only, private rooms),
match.start , clue.submit {word, number} , tile.reveal {index} , turn.end ,
match.rematch , player.ready , vote.kick {targetId} , report.player {targetId,
reason} , ping .
6.2 Server to client
room.snapshot  (full state for that viewer), room.patch  (small updates), player.joined ,
player.left , player.disconnected {graceEndsAt} , player.reconnected ,
spymaster.key  (private, only to Spymasters), clue.set , tile.revealed {index,
type} , penalty.applied , turn.changed , timer.tick  (or send turnEndsAt  and let
client count down), match.ended {winner, reason, report} , commentary {text} ,
error {code, message} , kicked .
6.3 Rules for the protocol
Viewer-specific snapshots: the server builds a different snapshot per role
(Spymaster, guesser, spectator). Guesser snapshots contain only revealed tile types.
Unrevealed tile types are null  in guesser data, not hidden.
Reject any message that fails schema validation, with an error code, without crashing.
Idempotency: if the same seq  arrives twice, apply once and re-send the result.
Concurrency: process each room's events through a single per-room queue so two
near-simultaneous taps cannot both succeed.
Heartbeat every 10 seconds. No pong in 25 seconds means mark the player
disconnected.
Server clock is the only clock. Send absolute turnEndsAt  timestamps plus the server
time offset, so clients can render countdowns.
7. Disconnections, reconnection and edge cases
Real players on mobile will lose connection constantly (locked phones, switching Wi-Fi to
data, backgrounded tabs). Treat reconnection as the main path, not an exception.
7.1 Identity and reconnect
On first join the server issues a random playerToken  (128-bit) and playerId . The
client stores the token in localStorage  (and a cookie fallback). No login.
Football Word Game: Build Spec for an AI Coding Agent
Page 7 of 16

## PDF page 8
On reconnect the client sends the token. The server restores the same seat, team,
role and sends a fresh snapshot (never replay missed events, just send the current
state).
The client auto-reconnects with exponential backoff (0.5 s, 1 s, 2 s, then every 5 s),
and instantly retries when the tab becomes visible or the network comes back online.
Show a calm "Reconnecting..." banner. Never lose the user's draft clue text.
Tokens are bound to one room. Treat a second connection with the same token as a
takeover: close the old socket, keep the new.
7.2 Grace periods and timeouts
Situation Behaviour
Guesser disconnects Seat is held 60 s. Team continues without
them. After 60 s they are marked away, seat
stays reserved until match end
Spymaster disconnects during own team's
clue phase
Pause that team's turn timer for up to 60 s. If
they return, resume. If not, auto-pass: skip
the clue, turn goes to the other team. After
two auto-passes in a row, the room offers a
vote to replace the Spymaster with another
teammate (the key is then sent to the new
Spymaster)
Spymaster disconnects while guessers are
guessing
Guessing continues. The Spymaster is not
needed until the next clue
Spymaster of the other team disconnects No effect until their turn
Host disconnects (private room) Host role migrates after 30 s to the longest-
connected player, announced in the room
Everyone disconnects Room kept 10 minutes (paused), then
deleted. Reconnect within that time
resumes exactly
Team has fewer than 1 connected player for
2 minutes
Match is abandoned: declared a draw, no
winner, room returns to lobby
Room empty in the lobby Deleted after 5 minutes
Match idle (no actions) for 15 minutes Match abandoned, room to lobby
Football Word Game: Build Spec for an AI Coding Agent
Page 8 of 16

## PDF page 9
7.3 Turn timers
Optional (default 90 s per phase in public rooms). Timer runs server-side. On expiry:
clue phase auto-passes the turn, guess phase ends the turn.
Timer pauses only for the Spymaster disconnect case above.
Display time using turnEndsAt  and correct for clock drift.
7.4 Other edge cases (each needs a test)
Two players tap the last two valid tiles within milliseconds: queue serialises, second
tap gets TILE_ALREADY_REVEALED  or NOT_YOUR_TURN .
A guesser taps after the guess limit is used up: rejected, no state change.
A tile is tapped by the wrong team: rejected.
Both a clue and a tile reveal sent in the same tick: reveal is rejected until a clue exists.
Player refreshes mid-match: reconnect path, same seat.
Same person opens the room in two tabs: second tab takes over, first shows "Opened
elsewhere".
A player leaves intentionally during their own Spymaster turn: treat as disconnect
with no grace, immediate replacement vote.
Team size drops below 2 mid-match: match continues if at least 1 connected player
per team and a Spymaster, otherwise abandoned per 7.2.
Room code collision: generate codes from an unambiguous alphabet (no 0/O, 1/I/L),
check uniqueness, retry.
Nickname collisions: allow, but append a small number ( Sam , Sam 2 ).
Rematch while someone is mid-disconnect: they keep their seat, roles rotate, they get
the new board when back.
Server restart: on boot, load room snapshots from Redis, mark all players
disconnected with a fresh grace period, resume.
Clock changes or tab throttling: never trust client timers.
Late spectators receive the same view as guessers.
Network flood from one client: rate limit (Section 8), disconnect after repeated abuse.
8. Security, abuse and public-server safety
8.1 Secrecy of the key
Key stored only in server memory and Redis (encrypted at rest if the provider
supports it).
Football Word Game: Build Spec for an AI Coding Agent
Page 9 of 16

## PDF page 10
spymaster.key  sent only to authenticated Spymaster sockets. Re-send on reconnect
only if the token still belongs to a Spymaster.
Strip key from all logs, error reports and analytics.
Reveal the full key to everyone only at match end.
Anyone who swaps from Spymaster to guesser loses key access instantly (the role
change event invalidates the key channel).
8.2 Input and transport
HTTPS and WSS only. HSTS enabled.
Strict CORS: only the real front-end origins. Validate Origin  on socket handshake.
All input validated with zod: types, lengths, enums. Never trust client-sent team, role,
or tile type.
Nicknames: 2 to 16 chars, letters/digits/space, profanity filtered, no impersonation of
system names ( Host , Admin , Referee ). Render as plain text only, never HTML.
Content-Security-Policy header, no inline eval. Escape everything.
8.3 Rate limits (per IP and per player token)
Exceeding limits returns RATE_LIMITED . Repeated violations get a temporary IP ban (15
min, escalating). Use Turnstile on Create room and Quick Match, not on joining a shared
link.
8.4 Moderation for strangers
No free-text chat. The only user-authored text visible to others is nickname and clue
word. This removes the largest abuse surface.
Offer fixed quick reactions (emoji set and a few canned phrases like "Nice one",
"Unlucky", "GG"), rate limited.
Action Limit
Create room 5 per 10 min per IP
Join attempts 30 per min per IP
Any socket message 20 per 5 s per socket, burst 40
Clue submissions 1 per turn, plus 5 per minute
Reports 5 per 10 min
Football Word Game: Build Spec for an AI Coding Agent
Page 10 of 16

## PDF page 11
Profanity/slur blocklist (multi-language, normalised against leetspeak and spacing)
applied to nicknames and clues. Keep the list in a data file so it can be updated
without code changes.
Vote-kick in public rooms: any teammate can start one against a player in their team,
passes with majority of the rest of the team. A kicked player cannot rejoin that room
for 30 minutes (token + IP hash).
Report button on every player card. Reports log {room, reporter, target, reason,
time}  with the offending clue/nickname. Provide a simple admin view or a log file
reviewed by the owner.
Griefing detection: a Spymaster who sends 3 consecutive nonsense or invalid clues,
or a player who taps Red Card deliberately on turn 1, triggers a warning, then is
flagged to the vote-kick UI.
Private rooms: the host can kick directly.
8.5 Privacy, children, compliance
Collect no personal data. No accounts, no emails. Store only the random token and
nickname in the browser.
Do not log raw IPs long term. Hash IPs with a rotating salt for abuse limits, delete after
24 hours.
Cookie/consent banner (needed for EU/UK before loading ad scripts), plus /privacy
and /terms  pages before any ads.
Not aimed at children under 13. Add "13+" to the terms and landing page footer.
Respect Do Not Track and consent state: ad scripts load only after consent where
required.
No club logos or badges (licensing). Use plain shapes and colours.
No gambling or betting ads, and no ads targeting minors.
8.6 Cheating and abuse beyond the key
Spymaster using external chat to cheat is out of scope (it is a party game).
Prevent collusion exploits in code: a player cannot be in both teams, cannot claim
Spymaster on both, cannot change team mid-match (only seats freed by leaving).
Prevent room enumeration: codes are random, joining an unknown code returns a
generic error, public rooms are listed only through the matchmaker, never browsable.
Prevent memory exhaustion: cap rooms per IP, cap spectators, delete idle rooms, cap
message size (e.g. 2 KB).
Dependency hygiene: lockfile, npm audit  in CI, no secrets in the client bundle,
environment variables for all secrets.
Football Word Game: Build Spec for an AI Coding Agent
Page 11 of 16

## PDF page 12
9. Tests that must exist
Unit (game-core)
Board generation counts (9/8/4/3/1, or 9/8/7/0/1 when yellows are off), starting team
correctness, uniqueness of words.
Every reveal outcome, every turn-end condition, penalty logic including last-word
protection, win and loss detection.
Clue validation matrix (board words, substrings, plurals, profanity, digits, empty).
Spymaster rotation and team swap on rematch.
Integration (server + socket clients)
Join, team select, start match, full match to completion with scripted clients.
Key leak test (critical): connect a guesser socket, record every message and every
snapshot for an entire match, assert no tile type appears for an unrevealed tile. Also
test a spectator and a freshly joined late player.
Reconnect mid-turn restores the correct per-role snapshot.
Spymaster disconnect: pause, resume, auto-pass, replacement vote.
Host migration. Server restart restores rooms from Redis.
Duplicate seq , malformed payloads, oversized messages, wrong-role messages.
Rate-limit behaviour.
Chaos / soak
A script that runs 200 simulated rooms with bots that randomly disconnect,
reconnect, and spam actions. Assert no crashes, no stuck rooms, no leaked key,
memory stays bounded.
Manual playtest checklist: 5 real groups, one with a person who barely knows football; a
phone on flaky data; two browser tabs; background the tab for a minute during a turn.
10. UI and design direction
Principles: calm, clean, readable. A party game played in a lit room on phones. No visual
noise, no neon, no gradients behind text, no animations that distract from the board.
Palette (muted, high contrast text)
Use Colour
Page background #F7F6F2  (warm off-white), dark mode #14171A
Football Word Game: Build Spec for an AI Coding Agent
Page 12 of 16

## PDF page 13
Rules
One typeface (Inter or system UI), 2 to 3 sizes. Tiles use bold uppercase.
Rounded corners 8 to 12 px, subtle 1 px borders, minimal shadows.
Colour is never the only signal. Add a small icon or letter on revealed tiles (H, A, a
bench icon, a card icon) for colour-blind players. Test with a colour-blind simulator.
Tap targets at least 44 px. The board must fit a 360 px wide phone without scrolling
horizontally. Words must auto-shrink to fit (long words like "HAT-TRICK", "FREE
KICK").
Tile flip animation 150 to 250 ms, respects prefers-reduced-motion .
Sound off by default. No autoplay audio ever.
The Spymaster view has an obvious banner "You are the Spymaster. Do not show your
screen." and a legend with counts.
Commentary is a single quiet line under the board, not a popup.
States to design for every screen: loading, reconnecting, error, empty, disconnected
player (greyed avatar), spectator.
Share card: simple generated image (scoreline, room, Spymaster of the match) sized
for WhatsApp and Instagram stories.
11. Content
Word list words.en.json : start with about 300 words, grow to 500+. Mix globally
known names (a few famous players) with easy terms (offside, derby, penalty, corner,
keeper). Avoid duplicate meanings and anything offensive.
Use Colour
Surface / cards #FFFFFF , dark #1E2328
Text #1F2933 , dark #E8EAED
Home #2F5D8A  (muted blue)
Away #C77B30  (muted orange)
Bench (neutral) #D9D4C7
Yellow Card #D6B33A
Red Card #A32D2D  (used only for the Red Card and critical
errors)
Accent / primary button Same as ink #1F2933  or the active team's colour
Football Word Game: Build Spec for an AI Coding Agent
Page 13 of 16

## PDF page 14
Tag each word easy | medium | hard  so a Casual vs Nerd mode can come later.
Default: mostly easy and medium.
Avoid recently used words within a room (keep a per-room history of the last 3
boards).
Commentary: 30 to 50 text templates grouped by event (own word, opponent word,
bench, yellow, red, penalty, win, close finish, long streak). Server picks one at random,
avoiding repeats. Never insert player-authored text without escaping.
Match report: Spymaster of the match, Howler of the match, Fastest guess, cards
shown. Use only server-recorded data.
12. Build order (phases with acceptance checks)
Phase 0: Setup. Monorepo, TypeScript, lint, test runner, CI, env config, /health . Done
when: CI is green on an empty test.
Phase 1: game-core (pure logic). Board generation, reveal logic, penalty, win/loss, clue
validation, role rotation, commentary picker. Done when: all Section 9 unit tests pass.
Phase 2: Server with rooms and realtime. Socket server, room lifecycle, join/leave, teams,
Spymaster claim, per-room event queue, protocol schemas, viewer-specific snapshots.
Done when: scripted clients can play a complete match, and the key leak test passes.
Phase 3: Reconnection and resilience. Player tokens, grace periods, heartbeat, host
migration, Spymaster auto-pass and replacement vote, abandoned-match handling, Redis
snapshot and restore. Done when: every row of the Section 7.2 table has a passing test
and the chaos script survives.
Phase 4: Front end core. Landing, Lobby, Match (guesser and Spymaster), Full time,
/how . Mobile first, palette from Section 10. Connect to the protocol with auto-reconnect
and a reconnecting banner. Done when: two phones and a laptop can play a full match
over a real network and survive airplane-mode toggles.
Phase 5: Rematch, share and polish. One-tap rematch with team swap and Spymaster
rotation, match report, share card, WhatsApp invite link, commentator. Done when: tap
link to first clue under 30 s, rematch under 5 s (measure and log both).
Phase 6: Public play. Quick Match matchmaker, auto-start countdown, default settings,
vote-kick, report button, blocklist, quick reactions, Turnstile, rate limits and temporary
bans, abuse logs. Done when: 20 simulated strangers get sorted into rooms, bad
nicknames and clues are blocked, and rate limits are verified by tests.
Football Word Game: Build Spec for an AI Coding Agent
Page 14 of 16

## PDF page 15
Phase 7: Compliance pages and analytics. /privacy , /terms , cookie/consent banner,
13+ notice, privacy-friendly analytics for: groups playing a second match, time from link
tap to first clue, average match length, week-over-week return, reconnect success rate,
abandoned matches.
Phase 8: Deploy and playtest. Deploy server and front end, set CORS and WSS,
monitoring and alerts (error rate, rooms, memory), load test to a few hundred concurrent
players. Playtest with 5 real groups. Tune Yellow Card rule and timers. Done when: the
success measures in Section 13 look healthy.
Phase 9: Ads (only after Phase 8). AdSlot  components exist from Phase 4 but render
nothing until now. Apply for AdSense once the site is live with privacy page. See Section
14.
13. Success measures
Share of groups that play a second match (the key number).
Time from link tap to first clue.
Average match length (target 10 to 15 minutes).
Groups returning the next week.
Reconnect success rate and abandoned-match rate (stability).
Reports per 1,000 matches (public room health).
Ads only matter once these look healthy.
14. Ads (Phase 9 rules)
Never during a clue or guess phase. No popups, no autoplay audio, no video in the
match.
Allowed: quiet banner on Landing and Lobby (waiting time), one banner or one opt-in
rewarded video on Full time after every 2nd match, and an optional static "Match
presented by" sponsor strip sold directly.
Rematch and Share stay one tap away from any ad. Ads load after the board renders
and must never delay Create room.
Because the room page is a single-page app with no reloads, check each network's
rules on refresh and SPA impressions before building slots.
Show ads only after consent where required. No gambling or betting ads, nothing
aimed at under-13s.
Football Word Game: Build Spec for an AI Coding Agent
Page 15 of 16

## PDF page 16
Revenue expectation: low at first (cost cover). Direct sponsor first, networks later as
traffic grows (AdSense, then browser-game networks, then rewarded video).
15. Open decisions for the human (ask before building the
affected phase)
1. Final product name and domain.
2. Game-server host and region.
3. Languages beyond English at launch.
4. Whether public rooms should require a minimum of 4 or allow 3 (one Spymaster plus
guesser per team minimum is 4).
5. Whether to add optional anonymous stats storage (Postgres) or stay fully stateless.
6. Legal review (name, word list, player names) before monetising.
16. Definition of done for v1
A stranger on a phone in any country can tap Quick Match, be placed in a room, play a 10
to 15 minute match, lose connection for 30 seconds without losing their seat, see a Full
time screen, and rematch in one tap. The key never leaves the server for non-Spymasters.
Abusive input is blocked or rate limited. The UI is calm, readable, and accessible. All tests
in Section 9 pass.
Football Word Game: Build Spec for an AI Coding Agent
Page 16 of 16