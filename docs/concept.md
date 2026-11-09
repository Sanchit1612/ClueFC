## PDF page 1
CLUE FC
A football word game for friends  |  working title
Concept v1  -  interface sketches  -  ad and revenue plan
1
Rules
How a match works, incl. Yellow
Cards
2
User flow
Link tap to rematch
3
Site structure
Pages and what runs behind them
4
Screens
5 clickable interface sketches
5
Ad spots
Where ads go, and where they
never go
6
Revenue
What you could earn, 3 scenarios
7
Getting ads
Who to apply to and when
8
Build plan
Order of work, risks, what to test
Tap any card to jump. The bar at the bottom of every other page navigates the whole document.
Early-stage concept. Revenue figures are estimates, not forecasts.


## PDF page 2
How a match works
Codenames-style, built around football
THE ONE-LINE PITCH
Two teams, a 5x5 board of football words, one-word clues. First team to
find all their words wins. Join by link, no sign-up, rematch in one tap, and
a live commentator reacts to every guess.
A ROUND IN 5 STEPS
1
Open a room and share the link on WhatsApp. Friends tap and they are in.
2
Split into Home and Away. Each team picks a Spymaster.
3
Spymasters see the secret colour key. They give one word and one number, e.g.
GOAT - 3.
4
Teammates tap tiles they think match, up to the number plus one.
5
Full time when a team finds all its words, or someone picks the Red Card.
Naming note: I renamed the teams from Red/Blue to Home (blue) and Away (orange)
so that red belongs only to the Red Card. Matches should last 10-15 minutes.
WHAT IS HIDDEN ON THE BOARD (25 TILES)
9
Home words
Find them all to win. Starting team gets 9, the other 8.
8
Away words
If you tap one, your turn ends and they gain a word.
4
Bench (neutral)
A foul. Your turn ends, nothing else happens.
3
Yellow Card
Turn ends AND the other team gets one free word (a penalty).
1
Red Card
Sent off. Your team loses at once.
Why Yellow Cards? Plain Codenames has one instant-loss word, which makes a
mistake either harmless or fatal. A middle step (penalty) adds tension and comebacks. It
is optional: switch it off in the lobby and you have the classic ruleset.
Home
Rules
Flow
Site
Screens
Ad spots
Revenue
Get ads
Plan
< Prev
Next >
2 / 13


## PDF page 3
User flow
From link tap to rematch
1
Landing
Create room or enter
code
2
Lobby
Share link, pick teams
3
Deal
Board dealt, key to
Spymasters
4
Clue + Guess
Turns alternate until a
win
5
Full time
Score, report, share
card
6
Rematch
One tap, teams swap
Rematch loop: teams swap sides, Spymasters rotate, new board. No trip back to the lobby.
INSIDE ONE TURN
Spymaster
gives one word and one
number, e.g. GOAT - 3
Team taps a tile
up to the number plus one.
The server reveals the colour.
Own word
Keep guessing, up to the limit.
Other team's word
Turn ends, they gain a word.
Bench (neutral)
Turn ends.
Yellow Card
Turn ends + penalty: opponents get a free word.
Red Card
Your team loses at once.
DESIGN TARGET
From a friend tapping the WhatsApp link to the first clue in under
30 seconds. Every extra screen, form or popup before the board
costs you players, and ads must never sit in that path.
Each box above is clickable and jumps to its screen sketch.
Home
Rules
Flow
Site
Screens
Ad spots
Revenue
Get ads
Plan
< Prev
Next >
3 / 13


## PDF page 4
Site structure
Small on purpose
Home
 /
Home
 /
Room
/r/CODE
How to play
 /how
Word packs
 /packs  (v2)
Legal
/privacy  /terms
60-second rules page, also a
pop-up inside the lobby.
Later: Premier League, World
Cup, Hard mode.
Needed before you show any
ads: privacy and cookie notice.
Lobby
teams, settings
Match
guesser + spymaster
Results
report, share, rematch
ONE PAGE DOES MOST OF THE WORK
Everything happens on /r/CODE. The page swaps between Lobby, Match and Results as the room state
changes, so there is no page load between rounds and the rematch feels instant.
UNDER THE HOOD
Next.js + React front end, one route per box on the left.
Room = one row in the database. Each player is a row
linked to it. Guests get a random ID in the browser, no
login.
Realtime channel per room pushes clues, reveals and
score to everyone instantly.
Answer key lives server-side. The server checks
every tap and sends the colour key only to the two
Spymasters, never to guessers' browsers.
Commentary is picked from 30-50 text templates by
the server after each reveal.
Ads load after the board renders, so they never delay
Create room.
Home
Rules
Flow
Site
Screens
Ad spots
Revenue
Get ads
Plan
< Prev
Next >
4 / 13


## PDF page 5
Screen 1 - Landing
Interface sketch (wireframe)
Landing
Lobby
Guesser view
Spymaster view
Results
clue-fc.example
CLUE FC
How to play
Guess the word.
Beat your mates.
A football clue game for 4+ friends. No sign-up. 10-minute matches.
CREATE ROOM
Room code
JOIN
Link, tap, play
No account needed
Matches in 10-15 min
AD SLOT  -  banner 728x90 desktop / 320x50 mobile
1
2
3
4
ON THIS SCREEN
1
One job: get a room open. Nothing else competes
with the button.
2
Create room makes a code and link instantly. No
sign-up. The nickname is asked in the lobby.
3
Join by code. A shared WhatsApp link skips this
screen entirely.
4
Quiet banner only. No popups, no autoplay sound,
nothing above the buttons.
Home
Rules
Flow
Site
Screens
Ad spots
Revenue
Get ads
Plan
< Prev
Next >
5 / 13


## PDF page 6
Screen 2 - Lobby
Interface sketch (wireframe)
Landing
Lobby
Guesser view
Spymaster view
Results
clue-fc.example/r/KX7-92
ROOM CODE
KX7-92
Copy link
Share on WhatsApp
HOME
Arjun
SPYMASTER
Sam
Priya
Join Home
AWAY
Rohan
SPYMASTER
Mia
waiting for a player...
Join Away
Waiting to pick a team:
Dev
HOST SETTINGS
 Word pack: Classic
Timer: Off
Yellow Cards: ON
START MATCH
Needs 2+ players per team and a Spymaster each.
AD SLOT  -  banner (waiting time only)
1
2
3
4
5
6
ON THIS SCREEN
1
Big room code so it can be read aloud across a table.
2
Share on WhatsApp is the main growth loop. It
pre-fills the link and a short invite line.
3
Teams and Spymasters are picked by tapping.
Spymaster rotates on rematch.
4
Host settings stay minimal: pack, timer, Yellow Cards
on/off.
5
Start unlocks when each team has a Spymaster.
6
Banner is fine here. People are waiting anyway,
nobody is mid-game.
Home
Rules
Flow
Site
Screens
Ad spots
Revenue
Get ads
Plan
< Prev
Next >
6 / 13


## PDF page 7
Screen 3 - Match (guesser view)
Interface sketch (wireframe)
Landing
Lobby
Guesser view
Spymaster view
Results
clue-fc.example/r/KX7-92
HOME
7 left
AWAY
8 left
CLUE
GOAT  -  3
HOME to guess  -  2 guesses left
MESSI
WEMBLEY
OFFSIDE
DERBY
ANFIELD
PENALTY
MBAPPÉ
VAR
HAT-TRICK
CAMP NOU
REFEREE
HAALAND
CORNER
TROPHY
CAPTAIN
BICYCLE
NUTMEG
RONALDO
FINAL
PITCH
MARADONA
FREE KICK
KEEPER
ULTRAS
BOOTS
LIVE
RONALDO! Home are flying, one more for the GOAT clue.
End turn
SPONSOR SLOT  -  Match presented by [YOUR BRAND], static logo
1
2
3
4
5
ON THIS SCREEN
1
Scoreboard shows words left per team. It feels like a
match, not a quiz.
2
Current clue is always visible to everyone, with
guesses remaining.
3
Tiles show only words. A tapped tile flips to its colour.
Guessers never receive the key.
4
Live commentator: bench: Straight to the bench,
that's a neutral. Yellow: Yellow card! Penalty to the
opposition. Red: Off you go. Game over.
5
No ads here. Only an optional static sponsor strip, if
you sell one directly.
Home
Rules
Flow
Site
Screens
Ad spots
Revenue
Get ads
Plan
< Prev
Next >
7 / 13


## PDF page 8
Screen 4 - Match (Spymaster view)
Interface sketch (wireframe)
Landing
Lobby
Guesser view
Spymaster view
Results
clue-fc.example/r/KX7-92
HOME
7 left
AWAY
8 left
YOU ARE THE SPYMASTER
HOME
Clue:  GOAT
Number:  3
Send clue
one word only
MESSI
WEMBLEY
OFFSIDE
DERBY
ANFIELD
PENALTY
YELLOW
MBAPPÉ
VAR
HAT-TRICK
CAMP NOU
REFEREE
HAALAND
CORNER
TROPHY
RED CARD
CAPTAIN
BICYCLE
NUTMEG
RONALDO
FINAL
YELLOW
PITCH
MARADONA
FREE KICK
YELLOW
KEEPER
ULTRAS
BOOTS
Home  9
Away  8
Bench  4
Yellow  3
Red  1
Only the two Spymasters see this colour key. It is never sent to guessers.
1
2
3
4
5
ON THIS SCREEN
1
Same board, same scoreboard so the Spymaster
still feels part of the match.
2
Clue box: one word plus a number. The server rejects
words that are on the board.
3
Colour key on every tile, including the Yellow Cards
and the single Red Card.
4
Legend is always visible so nobody has to memorise
the counts.
5
Security rule: the key comes from a server call that
checks the player really is a Spymaster. Hiding it with
CSS would be trivially cheatable.
Home
Rules
Flow
Site
Screens
Ad spots
Revenue
Get ads
Plan
< Prev
Next >
8 / 13


## PDF page 9
Screen 5 - Full time
Interface sketch (wireframe)
Landing
Lobby
Guesser view
Spymaster view
Results
clue-fc.example/r/KX7-92
FULL TIME
HOME
AWAY
9 - 6
words found
MATCH REPORT
Spymaster of the match: Arjun, GOAT - 3 landed perfectly
Howler of the match: Sam went for PITCH, an Away word
Fastest guess: Priya, 4 seconds
Cards shown: 1 yellow, 0 red
CLUE FC
 FULL TIME
HOME 9 - 6 AWAY
Spymaster: Arjun
 Room KX7-92
Share card (image)
REMATCH  -  teams swap, new Spymasters
Share to WhatsApp
AD SLOT  -  after every 2nd match: one banner OR one opt-in rewarded video
Rematch should reload the board in under 5 seconds.
1
2
3
4
5
ON THIS SCREEN
1
Scoreline is the headline. It is the thing people
screenshot.
2
Match report gives the banter: best Spymaster,
biggest howler. Cheap to build, very shareable.
3
Share card is a generated image sized for WhatsApp
and Instagram stories, with the join link.
4
Rematch is the main button. Replay rate is the
number that decides whether the game works.
5
Ad lives here because this is the natural pause. It
never sits between the player and Rematch.
Home
Rules
Flow
Site
Screens
Ad spots
Revenue
Get ads
Plan
< Prev
Next >
9 / 13


## PDF page 10
Where ads go - and where they never go
Monetise the pauses, not the play
Screen
Format
When it shows
Annoyance
Landing
Display banner, bottom
Always visible, below the buttons
 Low
Lobby
Display banner, bottom
While friends are joining
 Low
Match
No ads. Optional static sponsor strip
Never video, never popups
 None
Results
Banner or opt-in rewarded video
After every 2nd match only
 Medium
Rematch
None
Straight back to the board
 None
WHY NOT DURING THE MATCH?
A party game runs on people shouting at each other across a room. Anything that interrupts the clue-and-guess loop (a
video, a popup, a sound) kills the energy, and the energy is what makes people hit Rematch. A rewarded video also has
nothing sensible to reward in a free party game, so use it for cosmetic unlocks such as a stadium theme for tonight, not for
gameplay advantages.
GOLDEN RULES
No ads while a clue is being given or
guessed.
No autoplay audio. Muted by default.
Max one video per player per 2
matches.
Rematch and Share stay one tap away
from any ad.
No betting or gambling ads, and
nothing aimed at under-13s.
Load ads after the board so Create
room is never delayed.
Sell a direct sponsor slot before relying
on networks.
Home
Rules
Flow
Site
Screens
Ad spots
Revenue
Get ads
Plan
< Prev
Next >
10 / 13


## PDF page 11
What could it earn?
Estimates, not forecasts
THE FORMULA
Monthly revenue = daily players x ad views per player x fill rate x (eCPM /
1000) x 30
eCPM is what you earn per 1,000 ad views. It depends mostly on where your
players live, far more than on the game.
ASSUMPTIONS PER PLAYER, PER DAY
1 session a day (about 2 matches)
4 display views (landing, lobby, results banners)
1 video (results screen, every 2nd match)
70% fill rate (ads do not always load)
eCPM USED (display / video)
 A
Mostly India and other lower-CPM regions:  $0.20 / $1.00
B
Global mix:  $0.80 / $3.00
C
Mostly US, UK and Western Europe:  $2.00 / $8.00
MONTHLY AD REVENUE (USD)
Daily players
Mix A
Mix B
Mix C
1,000
$38
$130
$336
10,000
$378
$1,302
$3,360
50,000
$1,890
$6,510
$16,800
Per 1,000 daily players the range is roughly $38 to $336 a month, depending on audience
mix.
REALITY CHECK
Most early games sit in the top row. Ads will cover hosting and a domain at best, so
treat them as cost cover, not income. Football traffic from India is huge but pays at the
low end. A direct sponsor paying a flat fee can beat networks until you have real
volume.
WHERE THESE NUMBERS COME FROM
Published web figures: typical web display pays about $0.50-$2 per 1,000 views, and web rewarded video is quoted at $4 and up, $8-15 in the US and Canada. Those come from an
ad-network vendor's own pages, so read them as best-case marketing numbers. The lower-region figures (Mix A) and the 70% fill rate are my own assumptions, not measured data. Your
real eCPM only becomes known once you run a network on real traffic.
Source (vendor):  applixir.com/rewarded-video-ad
Home
Rules
Flow
Site
Screens
Ad spots
Revenue
Get ads
Plan
< Prev
Next >
11 / 13


## PDF page 12
How you get ads
Match the ad source to your traffic stage
STAGE 1
Launch
0 - 1,000 daily players
Ads earn almost nothing yet. Prove people hit
Rematch first.
Go direct: pitch football shops, fan pages, sports apps
and local clubs a Match presented by slot for a flat
fee.
Once the site is live with a privacy page, you can
apply to Google AdSense for banners.
STAGE 2
Growth
1,000 - 5,000 daily players
Add display through browser-game-focused networks
such as AdInPlay (Venatus), which targets web
game portals and .io games and wants established
traffic.
Keep selling direct sponsor slots. They pay better per
view than networks at this size.
STAGE 3
Scale
5,000+ daily players
Add opt-in rewarded video from a web SDK, e.g.
AppLixir (stated minimum: 5,000 daily players) or
CPMStar.
Mobile networks like AdMob, Unity Ads and AppLovin
do not serve browser games, so do not plan around
them.
Consider portals for reach (see below).
GAME PORTALS (POKI, CRAZYGAMES)
They bring the audience and run the ads; you share the revenue. Poki is curated, and one
guide reports you keep 100% on traffic you bring and 50/50 on theirs, though deal terms
vary and exclusivity can apply. CrazyGames does QA review and pays an ad revenue
share (the split is not officially published), monthly once you reach 100 euros. A room-code
multiplayer game probably needs adapting to fit them, so treat them as a later reach play.
WHAT EVERY NETWORK WILL ASK FOR
A live domain on HTTPS with real content
A privacy policy and a cookie consent banner (needed for EU and UK players)
An ads.txt file once a network approves you
Fast load, ads must not block Create room
No unlicensed club badges or logos on ad pages
Not targeted at children under 13
Sources:  Cinevva guide to Poki  |  Cinevva guide to CrazyGames  |  Playgama revenue-share comparison  |  AppLixir
Home
Rules
Flow
Site
Screens
Ad spots
Revenue
Get ads
Plan
< Prev
Next >
12 / 13


## PDF page 13
Build plan, risks and what to test
Keep v1 small
BUILD ORDER
1
Rooms + realtime board. The hard part, do it first.
2
Spymaster key, server-side only. Test that guessers cannot see it.
3
Word list of about 300. Mix globally famous names with easy terms
(offside, derby, penalty).
4
Commentator lines. 30-50 templates, plus yellow and red card reactions.
5
Results screen, share card, rematch.
6
Playtest with 5 groups, including one with a person who barely knows
football. Add ads after this.
WHAT TO MEASURE
Share of groups that play a second match. Time from link tap to first clue.
Average match length. Groups that come back the next week. Ad networks
only matter once these look healthy.
RISKS AND DECISIONS
Name and look
Do not use the Codenames name or its artwork. Keep the mechanic, build your own
identity. Check with a lawyer before a commercial launch.
Real names and badges
Player names are lower risk than club logos, but neither is cleared. Use simple shapes
and colours for clubs, and get advice before monetising.
Privacy and consent
Showing ads to EU and UK players needs a consent banner. Do not aim at children under
13.
Yellow Card balance
Penalty may feel too harsh or too weak. Playtest it with the switch on and off.
Football knowledge gap
Casual friends can feel lost. Keep many easy words and add a Casual vs Nerd handicap
later.
Home
Rules
Flow
Site
Screens
Ad spots
Revenue
Get ads
Plan
< Prev
13 / 13
