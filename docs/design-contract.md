# Football tabletop redesign

Kind: multiplayer browser game. Primary action: enter or join a match.
Reference: official codenames.game entrance, lobby and team-role structure observed in browser.

- Full-screen football tabletop; no marketing hero, feature-strip or fake app preview.
- Dark floodlit green ground, cream word cards with a printed frame, green action buttons.
- Home blue and Away orange dugouts; guessers and Spymasters occupy distinct role areas.
- Desktop: Home / central board or setup / Away. Mobile: board first, compact team selection.
- Match: word grid dominates. Score, clue, role and turn remain readable above it.
- Restrained deal-in entrance and card press/lift; respects reduced motion.
- System condensed display stack with readable system body type; no font downloads.
- Preserve server intent validation, answer secrecy, reconnect and all existing game rules.
- One consistent token scale; visible keyboard focus; no colour-only tile signals.

Applied sources: addyosmani/agent-skills frontend-ui-engineering; DietrichGebert/ponytail;
Leonxlnx/taste-skill. Exact source guidance snapshots are in docs/design-guidance.
The user's explicit official-game reference overrides randomized template/palette selection
and marketing-page recipes. Existing stack retained. Browser QA uses the supported CUA
surface rather than third-party scripts launching their own browser.
