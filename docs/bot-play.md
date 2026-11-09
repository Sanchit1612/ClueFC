# Bot play

“Play with bots” creates an ordinary private room, fills four seats and starts a
match. The human starts as Home guesser. Hosts can also fill empty seats in the
lobby, remove bots before a match, or take a bot's Spymaster role. Normal scoring,
penalties, timers, reports and rematches apply. Every computer seat has an
explicit BOT label. Public matchmaking never adds bots.

`apps/server/bots.ts` runs one due action per room tick, with a variable thinking delay of roughly 2.5–8.5 seconds.
Normal player polling drives ticks inside the existing D1 optimistic transaction,
so concurrent polls cannot duplicate a move. There is no background bot process,
external AI provider, runtime key, new dependency or database migration. Pending
turn time is private room metadata, excluded from client snapshots.

Spymasters score legal football associations against the actual key, as human
Spymasters do. Guessers receive only word/revealed pairs. They match the public
clue against curated tags, synonyms and football groups. Careful, balanced and
bold personalities differ in risk-taking. They sometimes favour a plausible
near-association over a direct match, pass early, try a bonus guess, or overreach
with a clue number. Timing varies independently. Unfamiliar clues may cause a pass. They cannot inspect types or an intended-answer list. A connected human
guesser always keeps control of their team's picks. This is a basic association-based
opponent, not unrestricted language understanding; expand the association data
based on playtests.

Bots remain connected only as virtual seats. They cannot authenticate, become
host or keep a room alive after humans leave. All-human-offline freezes gameplay;
expiry and host migration use human presence. Bot matches have a separate start
metric, and active-human totals exclude bots. Existing room state remains valid
because bot metadata is optional.

Validation covers solo fill and limits, authorization, role takeover, bot removal,
key redaction, word-only guessing, offline freeze/expiry, full matches/rematches,
and concurrent API ticks. Real local Worker/D1 browser checks cover the solo
entry, autonomous turns and human guesses at phone and desktop widths.
