---
type: handover
mode: session-end
date: 2026-10-15
session: 1
repo: gspot
branch: main
---

# Session Handover: 2026-10-15, Session 1

## Where things stand

gSpot (a single-user golf scoring and WHS handicap PWA) is deployed and works. All the code work needed to make it usable is done, pushed and live at stoff73.github.io/gspot. The six past rounds are already in the private data repo `Stoff73/gspot-data` (`state.json`), and they give an Index of **10.3**.

**The phone has never synced.** What's left is mostly CSJ's: create the GitHub token, sync the phone, and answer three questions about the cards.

## Priorities for the next session

The full ranked list is `currentTODO/tasks.md` (its "Open, in order" section). Follow that order.

1. **BLOCKED ON CSJ: create the GitHub token and sync the phone** (tasks 1–2). It has to be a fine-grained token: only `gspot-data`, Contents read/write. Never create, ask for or handle the token. First check whether it has happened: `gh api 'repos/Stoff73/gspot-data/commits?per_page=5'` and look for a `gSpot sync` commit. The phone should then show Index 10.3.
2. **DECISION (CSJ): Royal Blackheath "orange" tee, 2026-07-14.** No orange tee exists on the club card (Purple, Gold, Composite, Blue only), so ask for the yardage on the card. The round is on Purple for now. The Index stays 10.3 whichever it is.
3. **BLOCKED ON CSJ: Westerham tee and the card total, 2026-05-15.** The round is on White. The hole scores add up to 98, but an old JSON said 96.
4. **Apply the answers** (task 6). How to update `gspot-data` depends on whether the phone has synced; follow the method in task 6 exactly.
5. The rest of the list is "when it bites" items. Don't build them unprompted.

## Context to load

- `currentTODO/tasks.md`: the ranked task list and the method for updating `gspot-data` safely (task 6).
- `handover/Sept/09/handover.md`: project overview, file roles and gotchas from the build session. Still accurate, apart from what this handover supersedes.
- `docs/superpowers/specs/2026-09-08-golf-handicap-pwa-design.md`: the intended behaviour, including the sync section updated today.
- `import_rounds.py`: the source of the six back-filled rounds. Tee answers get applied here.

## Completed this session

- Wrote `docs/status-2026-10-15.md`, an assessment of the gap between the spec and the code grounded in the code itself. It describes the state **before** the fixes below.
- `20a6b1a`, in `app.js`:
  - The RapidAPI key moved out of `S.settings` into the `gspot-apikey` localStorage entry, so it's never synced or exported.
  - `normalise()` (`app.js:22`) runs on load, pull and import. It moves an old key out of settings, and scores rounds that lack a `diff` through `finalise()` (`app.js:242`) against `record(date)`, the Index as at that date (`app.js:109`).
  - A device's first sync merges local rounds, courses and draft by id instead of overwriting them (`app.js:76`).
  - Playing Handicap calculator gained 50% foursomes and 60/40 greensomes.
  - Default date uses local time; PCC is clamped.
  - `import_rounds.py` now uses a relative path and a per-round tee.
  - Spec and Darenth Valley note updated.
- `bb0b5b0`, `687beb3`: tees confirmed by CSJ (Surrey National Yellow, Wildernesse White, Poult Wood Yellow). Each time `gspot-data/state.json` was re-seeded to match.
- `gspot-data` now has 4 commits: init, the seed, and the two tee updates. No `gSpot sync` commit yet.
- Darenth Valley ratings cross-checked against The Social Golfer's 2023 card. They match, so no change was needed.
- Project memory copied from `~/.claude/projects/-Users-CSJ-Desktop-gSpot/memory/` to this path's memory folder, since the repo moved.

## Verification state

- `node test_handicap.js`: `ok` at `687beb3`.
- Live `app.js` shasum matched the local copy after the `20a6b1a` push.
- Checked in Chrome (local server, test data, localStorage cleared afterwards):
  - The import gives the expected differentials and Index.
  - The API key moves out of settings.
  - PCC clamping and index-as-at-date work.
  - The calculator values match a hand calculation.
  - The first-sync merge works against a fake GitHub API.
- **Not verified:**
  - A real sync against GitHub with a real token. It has never happened.
  - Behaviour on the actual phone, including the iOS home-screen app.
  - The tee changes in `bb0b5b0` and `687beb3` were checked with node against `handicap.js`, not in the browser.

## Decisions and dead ends

- **`.env` for the RapidAPI key: rejected.** The app is static files on GitHub Pages with no server or build step, and the browser calls RapidAPI directly. Any key shipped in the files would be public. The key stays something CSJ pastes in per device. A `.env` only fits `tools/refresh_courses.py`, which reads `UKGOLF_API_KEY`. That wasn't done, and `.env` isn't in `.gitignore`.
- **Scoring imported rounds in the app, not in the Python script.** The WHS maths lives in one place, `handicap.js`.
- **Seeding `gspot-data` directly instead of importing on the phone.** This was made safe by the first-sync merge.
- **CSJ wants Claude to do the work, not hand it back** ("why are you asking me to do stuff, just do it"). Commit, push to `main` (which deploys), write to `gspot-data` with `gh`, and research data without asking. Only leave CSJ the token, actions on the phone, and facts only they know.
- **Tee lookups:** nothing in `.remember/` or the old session history says which tees were played. Gmail might (VPAR emails), but the Gmail connector needs CSJ to sign in again with `/mcp`.

## Things that will bite you

- **Don't overwrite `gspot-data/state.json` wholesale once the phone has synced.** Edit single rounds by id and delete `raw/diff/ags/pts/hadIndex`, so the app rescores them on its next pull. See task 6.
- Rounds that already have a `diff` are **never** rescored automatically. Changing a round's tee or scores means removing its `diff`.
- `docs/status-2026-10-15.md` is a snapshot from before the fixes. Don't treat its blocker list as current.
- The auto-mode permission check refused a new memory file in this project's memory folder. The copied old memory is there, but the "just do it" preference is only recorded in this handover.
- Royal Blackheath, per the club card: par 71 for every tee, and the same SIs for every tee.

## Tech debt deferred

- The `tech-debt-session` skill isn't installed here, so that pass didn't run.
- A quick manual look found nothing new beyond the "when it bites" items 8–11 in `currentTODO/tasks.md`.

## Branch and deploy state

- Branch: `main`. Unpushed commits: none, apart from this handover's commit, which comes next.
- Deployed: stoff73.github.io/gspot (GitHub Pages from `main`).
- Data: `Stoff73/gspot-data/state.json` holds 6 rounds and 9 courses (last write: "Poult Wood 2026-07-22 off Yellow tees").
- Fynla vault mirror and vault-sync skipped on purpose: `/Users/CSJ/Desktop/fynlaBrain` is the Fynla project's vault, not gSpot's.
