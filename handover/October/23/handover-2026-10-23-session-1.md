---
type: handover
mode: session-end
date: 2026-10-23
session: 1
repo: gspot
branch: main
---

# Session Handover: 2026-10-23, Session 1

## Where things stand

gSpot now has a **Home dashboard**, which is the screen it opens on, and a **wide-screen layout** for laptops. Both are in `a7e2d5b`, pushed and live at stoff73.github.io/gspot. The live `app.js` contains `viewHome`, which I checked with curl.

**The phone still has not synced.** `gspot-data` has had no new commits since 15 Oct, so on the phone Home is empty until the six rounds arrive. At the end of the session CSJ got a step-by-step guide to creating the token and syncing.

## Priorities for the next session

The full list is `currentTODO/tasks.md` under "Open, in order". Follow that order.

1. **BLOCKED ON CSJ: create the token and sync the phone (tasks 1–2).** First check whether it has already happened: `gh api 'repos/Stoff73/gspot-data/commits?per_page=5'` and look for a `gSpot sync` commit. If it has, Home on the phone shows Index 10.3, 15 shots and "85 keeps 10.3" for Wildernesse off the Whites, and 3-putts as the biggest leak. Never create, ask for or handle the token. If CSJ reports an error, the Sync card text tells you which: 401 means the token is wrong, 404 means it lacks Contents access to `gspot-data`.
2. **Task 7 (optional, CSJ): the laptop.** Sync with the same token at stoff73.github.io/gspot. This is also the first real look at the wide layout with real data.
3. **Tasks 8–11 are "when it bites".** Don't build them unprompted.

## Context to load

- `currentTODO/tasks.md`: the ranked list. Task 0 is the dashboard, with what was found, and task 6 has the safe method for updating `gspot-data`.
- `app.js:170-243` (the Home section, from `// ----- Home -----` to the end of `viewHome`): read this before touching the dashboard. `calcPick()` holds the course and tee defaulting, `leaks()` the shots-lost heuristic, and `viewHome()` the cards.
- `docs/superpowers/specs/2026-09-08-golf-handicap-pwa-design.md`, the "Screens" section: what Home is meant to show.
- `handover/October/15/handover-2026-10-15-session-1.md`: sync background and gotchas. Still accurate.

## Completed this session

- Resumed from the 15 Oct handover. `7cbca8d` (22 Oct) had already settled the Royal Blackheath and Westerham questions.
- **`a7e2d5b`, Home dashboard and wide-screen layout:**
  - **Home** replaces Play as the first tab. The Play nav button became Home, and Play is reached from "Start a round here" or "Resume round". On load, `S.tab` is forced to `home` unless a draft round exists, so a mid-round reopen goes straight back to the scorecard.
  - **Cards on Home:**
    - Index, with its move after the last round and the trend line.
    - Next round: shots; the adjusted gross that keeps the Index and the one that cuts it, from `scoreToBeat()`, which simulates the next round through `WHS.computeRecord`; and how far a bad round raises it, from `indexAfter(99)`.
    - Last round, which links to its scorecard.
    - Form: points over the last five 18-hole rounds.
    - Where the shots go: `leaks()`.
  - **Shared helpers:** the Home and Handicap calculators share `calcPick()` and `calcSelects()`. They default to the last round played when no `calcCourse` or `lastCourse` is set, which covers imported rounds. "Start a round here" copies the pick into `lastCourse` and `lastTee`.
  - **Wide layout:** `.dash` is a CSS grid (`auto-fit`, `minmax(min(320px,100%),1fr)`). At 900px and wider, the nav becomes an 88px left rail and `main:has(.dash)` widens to 1200px. Home, Handicap and Stats are wrapped in `.dash`. Rounds, Courses, Play and the scorecards stay one 640px column.
  - `record()` was split into `scoresUpTo()` plus `record()`.
  - The spec's Screens section was updated.
- `currentTODO/tasks.md`: sync deferral noted, dashboard added as task 0 and crossed off.
- Memory `csj-just-do-it.md` extended: when CSJ hands over a design call, propose it and build. Don't run a round of clarifying questions.

## Verification state

- `node test_handicap.js`: `ok` at `a7e2d5b`. `handicap.js` is unchanged.
- **Headless check:** app.js run in node with a stubbed DOM and seeded from `gspot-import.json`. Every tab rendered. Wildernesse White gives 15 shots and 85 keeps or cuts the Index; Surrey National Yellow gives 10 shots, 81 keeps and 80 cuts. The worst case is 11.3. The script was in the session scratchpad and is **not in the repo**.
- **Chrome check** (local server, test data cleared afterwards):
  - At 1366px: left rail, three columns.
  - At phone width: one column, bottom nav, no horizontal overflow.
  - Start a round here opens Play with Wildernesse White picked and Home highlighted in the nav.
  - The Last round card opens the Rounds scorecard. Handicap and Stats render 3 cards each.
  - No console errors.
  - Screenshots are under `/var/folders/_c/jc08rsrj7n92wk0q0qd5cr4r0000gn/T/claude-chrome-screenshots-SACNr0/` (temporary).
- 3-putt figure checked against the raw data: 28 three-putts in 6 rounds.
- **Not verified:**
  - Home on the real phone or the iOS home-screen app.
  - The 9-hole-only edge cases on Home: Form and the leaks' nines skip 9-hole rounds, and the targets assume 18 holes.
  - A real sync. That is still never done.

## Decisions and dead ends

- **What "dashboard" means.** It answers "where am I, and what do I need next time?" It isn't a second Stats page. CSJ asked for my view ("you tell me") and accepted the proposal without changes.
- **"Web version" = the same app laid out for a laptop.** It is not a separate site. I asked CSJ to confirm this. The reply was exasperation, which I took as "stop asking and build". Nothing so far suggests they meant a separate public site. If they turn out to have meant one, that is new work.
- **Home replaces Play in the nav** to keep five tabs on the phone's bottom bar. This was my call, stated to CSJ and not objected to.
- **Form uses Stableford points**, where 36 means playing to handicap, rather than the average differential against the Index. The average differential always sits above the Index, because the Index uses only the best scores, so comparing them is misleading.
- **The leaks ranking is a heuristic** (there's a `ponytail:` comment in `leaks()`). It puts different measures side by side, all in shots a round: par types against your average hole, 3-putts against two putts, blow-ups beyond double bogey, and half the gap between the nines. Real strokes-gained needs benchmark data.
- **Don't run brainstorming question rounds with CSJ.** The second clarifying question got "oh my GODF!!!!!!!!!!". Propose something concrete and build. This is now in memory.

## Things that will bite you

- **The "Next round" target is for 18 holes with PCC 0**, in adjusted gross ("or better"). `scoreToBeat()` searches from par−10 to par+40 and assumes the Index never falls as the score worsens. ESR and the caps keep that true.
- `S.settings.calcCourse` and `calcTee` are **shared** by Home and the Handicap calculator, and they are synced settings. Changing one changes the other on every device.
- `.dash` relies on CSS `:has()` (Safari 15.4+) for the wide `main`. On an older browser the cards still lay out in the grid, just within 640px.
- The `open` action now also sets `S.tab = 'rounds'`, so it works from Home.
- The earlier gotchas from the 15 Oct handover still apply. In particular: never overwrite `gspot-data/state.json` wholesale once the phone has synced, and rounds that already have a `diff` are never rescored.

## Tech debt deferred

- The `tech-debt-session` skill isn't installed here, so I did a manual look instead.
- **No committed check for the Home logic** (`scoreToBeat`, `indexAfter`, `leaks`). The node stub-DOM script that verified it lived in the session scratchpad. If Home's logic changes, add a `test_home.js` in that style: vm-run `handicap.js`, `courses.js` and `app.js` with a stub `document` and `localStorage` seeded from `gspot-import.json`, then assert on `viewHome()` text.
- `calcPick()` tee defaulting (`app.js`, in the Home section) is a dense one-liner across three sources (calc, last played, last round). It works, but it's worth a comment or a split if it's ever touched.

## Branch and deploy state

- Branch: `main`. Unpushed commits: none before this handover's commit.
- Deployed: stoff73.github.io/gspot (GitHub Pages from `main`). `a7e2d5b` is live.
- Data: `Stoff73/gspot-data/state.json` is unchanged since 15 Oct (6 rounds, 9 courses). There's still no `gSpot sync` commit.
- The vault mirror and vault-sync were skipped on purpose: `/Users/CSJ/Desktop/fynlaBrain` is the Fynla vault, not gSpot's, and there's no `CSJTODO.md` or `todoCurrent/` in this repo.
