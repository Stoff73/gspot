# gSpot: tasks to get it working as intended

Updated 2026-10-15 at the end of session 1. Background: `docs/status-2026-10-15.md`. That report describes the state **before** this session's fixes, so use it for the reasoning, not for the current state.
**[CSJ]** = only CSJ can do it (tokens, the phone, paper cards, facts only they know). **[code]** = a change in this repo or in `gspot-data`, which Claude does without asking.

## Open, in order

**Tasks 1–2 deferred by CSJ 2026-10-23** to build a dashboard first. Pick them up again after it.

0. - [x] ~~**[code] Home dashboard and wide-screen layout.**~~ 2026-10-23. Home replaces Play as the first tab. Laptops get a left rail, and Home, Handicap and Stats lay their cards side by side. Checked in Chrome at 1366px and phone width with the six rounds, and headless in node.
   Found: the phone has none of the six rounds until it syncs (or imports `gspot-import.json`), so Home on the phone stays empty until task 2.

1. - [ ] **[CSJ] Create the GitHub token.** Settings → Developer settings → Fine-grained tokens. Repository: only `Stoff73/gspot-data`. Permission: Contents read and write. Expiry: 1 year. Claude must never create, see or handle it.
2. - [ ] **[CSJ] First sync from the phone.** In the app go to Courses → Sync, paste the token and tap Sync now.
   Done when: `gspot-data` shows a `gSpot sync` commit (check with `gh api 'repos/Stoff73/gspot-data/commits?per_page=5'`) and the phone's Handicap tab shows **10.3**.
   If it fails, the Sync card shows the error: 401 means the token is wrong, 404 means the token lacks Contents access to `gspot-data`.
3. - [x] ~~**DECISION (CSJ): which Royal Blackheath tee is "orange"?**~~ Purple, confirmed by CSJ 2026-10-22. Already in the data, so nothing changed.
4. - [x] ~~**[CSJ] Westerham tee, 2026-05-15.**~~ White, confirmed by CSJ 2026-10-22. Already in the data.
5. - [x] ~~**[CSJ] Check the 15 May Westerham card total.**~~ CSJ 2026-10-22: use 98 as the hole scores give. The old JSON's 96 is ignored.
6. - [x] ~~**[code] Apply any answers from 3–5.**~~ 2026-10-22: all three answers matched the live `state.json`, so `gspot-data` was not touched. Only the comment in `import_rounds.py` changed.
   For future tee or score changes, the method still holds: before the first `gSpot sync` commit, overwrite `state.json` from `gspot-import.json`. After it, edit only that round by id and delete `raw/diff/ags/pts/hadIndex`.
7. - [ ] **[CSJ, optional] Second device check.** Open the app in another browser with the same token and confirm the data arrives.
8. - [ ] **[code, when it bites] Rescore later rounds when an older card is added before them.** Saved rounds keep the cap and 9-hole conversion from when they were scored.
9. - [ ] **[code, when it bites] The Play screen's "Play off" default uses today's Index.** For a back-dated card, overtype it.
10. - [ ] **[code, when it bites] Edit a saved round.** Right now the only option is delete (`app.js`, `delround`).
11. - [ ] **[code, years away] Sync size ceiling.** Past 1 MB (~500 rounds at ~1.9 KB each) GitHub stops returning `state.json` inline, and `pull()` would treat the server as empty.

## Done 2026-10-15 (commits `20a6b1a`, `bb0b5b0`, `687beb3`, all pushed and live)

- [x] ~~RapidAPI key kept off sync/export.~~ It now lives in the `gspot-apikey` localStorage entry, and `normalise()` moves any old `S.settings.apiKey` into it. Checked in Chrome.
- [x] ~~Imported rounds scored.~~ `normalise()` → `finalise()` scores rounds that lack a `diff`, oldest first, against the Index as at their date. It runs on load, after a pull and after an import. Checked in Chrome.
- [x] ~~First sync merges instead of overwriting.~~ Local rounds, courses and draft the server lacks are kept, matched by id, then the combined set is pushed. Checked in Chrome against a fake GitHub API (7 rounds plus the draft, one push, no API key).
- [x] ~~Seeded `gspot-data/state.json`~~ with six rounds and nine courses, so no manual import is needed on the phone.
- [x] ~~`import_rounds.py`:~~ relative path, per-round `tee`, no hardcoded `hadIndex`. JSON regenerated.
- [x] ~~Tees confirmed by CSJ:~~ Surrey National Yellow, Wildernesse White (both rounds), Poult Wood Yellow. Index is now **10.3**. Differentials: 22.8, 11.9, 19.9, 11.3, 22.4, 11.3.
- [x] ~~Darenth Valley ratings cross-checked~~ against The Social Golfer's 2023 card. Pars, SIs and CR/Slope match. Note added in `courses.js`.
- [x] ~~Playing Handicap 50% foursomes and 60/40 greensomes~~ from the partner's Course Handicap. Checked by hand.
- [x] ~~Default date in local time; PCC clamped to −1..+3; index-as-at-date for new back-dated rounds.~~
- [x] ~~Spec updated~~ (course API, sync merge, calculator, out-of-scope list).
- [x] ~~Project memory copied~~ from the old `-Users-CSJ-Desktop-gSpot` path to the new project path.
