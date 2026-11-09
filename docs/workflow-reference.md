## PDF page 1
Agent Workflow: Token Efficiency and Git
Rules
Companion to SPEC.md  (the football word game build spec). Drop this in the repo as
AGENTS.md  (or merge the short version in Section 9 into CLAUDE.md ). Read both at the
start of every session.
0. Goal
Build the game in small, verified steps, using as few tokens as possible, with a clean and
recoverable git history. Tokens are spent on reading, thinking and writing. Most waste is
in reading too much and redoing work. This file tells the agent how to avoid that.
1. Core principles
1. One task per session. A session = one phase step from SPEC.md  Section 12 (or one
bug). Finish, commit, update PROGRESS.md , stop.
2. Read less, search first. Never open a whole file to find one thing. Use search, then
read only the needed line range.
3. Never re-read what you already know. If a file was read this session and has not
changed, do not read it again.
4. Plan short, then act. A plan is 5 to 10 lines. No essays, no restating the spec back.
5. Small diffs. Change only what the task needs. No drive-by refactors, no reformatting
untouched code.
6. Verify cheaply. Run the narrowest test that proves the change, not the full suite, until
the end of the task.
7. Ask only when blocked. If a decision is listed in SPEC.md  Section 15, ask. Otherwise
make the simplest reasonable choice, note it in PROGRESS.md , and move on.
2. Keeping context small
2.1 Reading the repo
Start each session by reading only: PROGRESS.md  (what is done, what is next) and the
one spec section relevant to the task. Do not load all of SPEC.md  every time.
Find code with search ( grep -rn "symbol" apps packages ) or the file tree, then
open a line range ( sed -n '40,90p' file ), not the full file.
Agent Workﬂow: Token Eﬃciency and Git Rules
Page 1 of 9

## PDF page 2
Prefer reading types and function signatures over implementations when you only
need to call something.
Never read: node_modules , lockfiles, build output ( dist , .next ), generated files,
large JSON word lists (read the first 20 lines to see the shape).
Make sure these are in .gitignore  and in the agent's ignore or deny settings so they
are never loaded by accident.
2.2 Command output
Limit noisy commands: pipe through head , tail , or grep . Example: npm test 2>&1
| tail -40 .
Run tests with a filter: npx vitest run packages/game-core -t "penalty" .
Use quiet flags: npm install --silent , git status -sb , git log --oneline -10 .
If a command prints a huge log, summarise the one relevant error and do not paste the
rest into the conversation.
Do not run dev servers in a way that streams logs into the context. Run them in the
background and only check them when needed.
2.3 Writing code
Use targeted edits (replace a block) instead of rewriting whole files.
Do not paste whole files back in chat to "show" them. Say which file and function
changed.
No long comments or explanations in code that restate what the code does. Comment
the why only.
Keep files small and single-purpose. Smaller files mean cheaper reads later. Split any
file over about 300 lines.
Put shared types in packages/protocol  so they are read once, not duplicated.
2.4 Resetting context
When a task is finished, end the session and start a fresh one for the next task. A new
session with a good PROGRESS.md  is cheaper than a long one carrying old context.
If a session grows long mid-task, summarise into PROGRESS.md  (current state, next
step, open problems), then clear/compact the context and continue from that note.
(In Claude Code: /compact  to summarise, /clear  to reset.)
Do not keep debugging in a polluted context. After two failed attempts at the same
fix, stop, write down what was tried, and either start fresh or ask.
Agent Workﬂow: Token Eﬃciency and Git Rules
Page 2 of 9

## PDF page 3
3. Choosing effort and model
Use extended thinking only for genuinely hard logic (Phases 2 and 3 especially). Turn
it down for UI work.
Use sub-agents or separate sessions for exploratory research ("how does library X
handle Y") so the exploration does not stay in the main context. Only the conclusion
comes back.
4. Prompting patterns that save tokens (for the human)
Good prompts are short, specific and point to the spec instead of repeating it.
Good: Implement Phase 2 step: viewer-specific snapshots. Spec: SPEC.md
section 6.3 and 8.1. Add the key-leak test from section 9. Don't touch the
UI.
Bad: pasting the whole spec again, or "build the multiplayer part".
Name the files or folders to touch when you know them.
State the done condition ("tests in game-core  pass and git status  is clean").
Say what not to do ("no new dependencies", "don't change the protocol").
Paste only the failing error line plus the test name, not the whole terminal.
Give feedback as concrete deltas: "tile text wraps on 360 px, shrink to fit" instead of
"fix the UI".
Task type Use
Architecture decisions, security review, protocol
design, tricky reconnection logic
Strongest model, more thinking
Routine implementation from a clear spec
section, UI components, tests
Mid-tier model, normal thinking
Renames, formatting, boilerplate, simple docs Cheapest/fastest model, minimal
thinking
Agent Workﬂow: Token Eﬃciency and Git Rules
Page 3 of 9

## PDF page 4
5. Memory files the agent must maintain
PROGRESS.md  template:
# Progress
## Current phase
Phase 2: realtime server
## Done
- game-core complete, 48 tests passing
- room lifecycle, join/leave
## Next (do exactly this)
- viewer-specific snapshots (SPEC 6.3)
## Open problems
- none
## Decisions made without asking
- Socket.IO chosen over raw ws (simpler reconnect)
## Commands
- test: npm test -w packages/game-core
- dev: npm run dev -w apps/server
At the end of every session the agent updates Done, Next and Open problems, so the
next session starts instantly.
File Purpose Size rule
SPEC.md The full build spec. Source of
truth
Only change when a decision
changes
AGENTS.md  /
CLAUDE.md
Short rules and commands
(Section 9)
Under 80 lines
PROGRESS.md Done / next / open problems /
decisions made
Rewrite, do not append forever.
Keep under about 100 lines
/docs/decisions.md One line per decision with
date and reason
Append only
Agent Workﬂow: Token Eﬃciency and Git Rules
Page 4 of 9

## PDF page 5
6. Git workflow
6.1 Setup (once)
git init
git branch -M main
# .gitignore must include: node_modules, .env*, dist, .next, coverage, *.log, 
.DS_Store
git add -A && git commit -m "chore: initial repo with SPEC.md and AGENTS.md"
# create the remote repo on GitHub (private at first), then:
git remote add origin <url>
git push -u origin main
Keep the repo private until privacy pages and secrets hygiene are done.
Enable branch protection on main  once there is CI: require the CI check to pass,
block force-push.
6.2 Branching
main  is always deployable and green. Never commit directly to main  after the first
commit.
One short-lived branch per task: feat/<phase>-<thing> , fix/<thing> ,
chore/<thing> . Examples: feat/p2-viewer-snapshots , fix/reconnect-seat-
restore .
Merge by pull request (even solo). Use squash merge so main  has one clean commit
per task. The PR description is the place for a short summary.
Delete the branch after merge.
Keep branches under about a day of work. Long-lived branches create conflicts and
big, expensive context.
6.3 Commits
Use Conventional Commits. Short subject (under 72 chars), imperative mood.
feat(game-core): add penalty with last-word protection
fix(server): restore seat on reconnect with valid token
test(server): add key-leak test for guesser sockets
chore(ci): run tests on pull requests
docs: update PROGRESS.md after phase 2
refactor(protocol): split messages into client and server files
Commit when a logical unit works and tests pass, not mid-breakage. Typically 1 to 4
commits per task.
Agent Workﬂow: Token Eﬃciency and Git Rules
Page 5 of 9

## PDF page 6
Never commit: secrets, .env , build output, large binaries, personal data, debug logs.
Review before committing: git status -sb  and git diff --stat . Read the full diff
only for risky areas (security, protocol).
Do not commit commented-out code or console.log  debugging.
Never use git add -A  blindly after generating files. Check what is staged.
6.4 Pushing
Push the feature branch after each meaningful commit. This is the backup.
Run the quick checks first: lint, type-check and the relevant tests (a pre-push hook
can do this).
Open a PR when the task's acceptance check from SPEC.md  passes.
Never force-push main . Force-push to a feature branch only with --force-with-
lease , and only on your own branch.
The agent does not merge to main  or deploy to production on its own. It opens the
PR and stops. The human reviews and merges.
Tag each finished phase: git tag -a phase-2 -m "Realtime server done" && git
push --tags . Tags make rollback and comparison easy.
6.5 Pull request checklist
6.6 Recovery and conflicts
Made a mess? git stash  or git switch -c rescue/<name>  to save it, then reset
the working branch. Never delete work you have not saved.
Undo a pushed commit with git revert <sha> , not history rewriting.
Merge conflicts: rebase the feature branch on main  ( git fetch && git rebase
origin/main ) before opening the PR, resolve small conflicts early. If conflicts are
large, stop and ask.
Parallel agents or experiments: use git worktree add ../wt-name feat/xyz  so
each has its own folder and context.
Task acceptance check from SPEC.md  passes
New or changed rules have tests
Key-leak test still passes (any server or protocol change)
No secrets, no new dependency without justification
PROGRESS.md  updated
Diff is limited to the task
Agent Workﬂow: Token Eﬃciency and Git Rules
Page 6 of 9

## PDF page 7
A leaked secret: rotate the secret first, then remove it from history. Assume it is
compromised the moment it was pushed.
7. Secrets and environment
All secrets (Redis URL, Turnstile secret, admin tokens) live in environment variables.
Commit a .env.example  with names only, no values.
The agent never prints secrets in chat or logs. It never asks the human to paste a
secret into the chat.
Run a secret scanner (e.g. gitleaks) as a pre-commit hook and in CI.
Client bundles may only contain public keys (e.g. the Turnstile site key). Check before
every release.
Deployment platform secrets are set in the platform dashboard, not in the repo.
8. CI and automation (keep it cheap)
One GitHub Actions workflow on pull requests: install (cached), lint, type-check, unit
tests, integration tests including the key-leak test.
Run the slow chaos/soak test on a schedule or manually, not on every PR.
Pre-commit hook: format + lint on staged files only. Pre-push hook: type-check + fast
tests.
Dependabot or a weekly npm audit  check. Review dependency updates as separate
PRs.
Fail fast. A red CI result should point the agent to a specific test, so it reads one
failure, not the full log.
9. Short rules block (paste into CLAUDE.md  / AGENTS.md )
# Project rules (football word game)
Read PROGRESS.md and only the relevant SPEC.md section before starting.
One task per session. Do exactly the "Next" item. Update PROGRESS.md at the 
end.
Server is authoritative. Never send the colour key to non-Spymasters.
Efficiency
- Search before reading. Read line ranges, not whole files.
- Don't re-read unchanged files. Don't read node_modules, lockfiles, dist, 
.next.
Agent Workﬂow: Token Eﬃciency and Git Rules
Page 7 of 9

## PDF page 8
- Pipe noisy commands through tail/head/grep. Run only the relevant tests.
- Targeted edits, not whole-file rewrites. No drive-by refactors.
- Short plans (max 10 lines). No restating the spec.
- After 2 failed fixes, stop, record what was tried in PROGRESS.md, ask or 
restart.
Git
- Never commit to main. Branch: feat|fix|chore/<short-name>.
- Conventional Commits. Commit when a unit works and tests pass.
- Push the feature branch, open a PR, stop. Human merges and deploys.
- Never force-push main. Never commit secrets or .env.
- Check git status -sb and git diff --stat before every commit.
Stop and ask when
- A decision is listed in SPEC.md section 15.
- A change would alter the protocol, the rules, or the security model.
- A new dependency or paid service is needed.
- Anything destructive: deleting data, rewriting history, changing prod 
config.
10. Suggested session rhythm
1. Start: fresh session. Prompt: Do the Next item in PROGRESS.md. Follow
AGENTS.md.
2. Plan: the agent states a short plan and the files it will touch. Human approves or
corrects in one line.
3. Build: implement on a feature branch, run the narrow tests, commit.
4. Verify: run the acceptance check for the task, then the full suite once.
5. Wrap up: update PROGRESS.md , push the branch, open the PR with a short summary.
6. Human: review the diff (focus on security and protocol files), merge, tag if the phase
is complete.
7. Repeat with a new session.
Where the token budget matters most
Phase 2 and 3 (realtime and reconnection): complex and bug-prone. Spend thinking
effort here, but keep context clean: finish each table row of SPEC.md  7.2 as its own
small task with its own test.
Phase 4 (UI): biggest risk is endless visual tweaking. Work screen by screen, give
concrete feedback, and batch several UI fixes into one prompt instead of many tiny
round trips.
Agent Workﬂow: Token Eﬃciency and Git Rules
Page 8 of 9

## PDF page 9
Phase 6 (public play): security-sensitive. Use the strongest model for review, and a
fresh session for a dedicated "security pass" against SPEC.md  Section 8.
11. Red flags that the session is wasting tokens
The agent is reading the same file repeatedly.
It pastes long logs or full files into chat.
It refactors things unrelated to the task.
It keeps trying fix variations without a hypothesis.
It asks questions that SPEC.md  already answers.
The conversation is very long and the agent starts forgetting earlier decisions.
When you see these: stop, update PROGRESS.md , clear the context, and restart the task
with a tighter prompt.
Agent Workﬂow: Token Eﬃciency and Git Rules
Page 9 of 9