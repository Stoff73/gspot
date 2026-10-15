# gSpot: tasks to get it working as intended

Source: `docs/status-2026-10-15.md`. Order matters: later tasks depend on earlier ones.
**[CSJ]** = only CSJ can do it (tokens, the phone, paper cards). **[code]** = a change in this repo.
Code tasks done on 2026-10-15 are committed and deployed to stoff73.github.io/gspot.

## 0. Ship the code changes

- [x] **Committed and pushed to `main`** (deploys to stoff73.github.io/gspot).
- [x] **[code] First sync merges instead of overwriting.** A device's first sync keeps its own rounds, courses and any round in progress that the server lacks, matched by id, then pushes the combined set. Tested in Chrome against a fake GitHub API: 6 server rounds plus 1 local round and a round in progress gave 7 rounds and the draft, in a single push with no API key in it.
- [x] **Seeded `gspot-data/state.json`** with the six imported rounds and the courses, so the phone picks them up on its first sync. No manual import is needed.

## 1. Get the data off the phone (sync)

- [x] **[code] Stop the RapidAPI key being synced and exported.** The key now lives in its own localStorage entry, `gspot-apikey`. `normalise()` moves any old `S.settings.apiKey` into it on load, after a pull and after an import. Checked in Chrome: after a reload the key is in `gspot-apikey` and gone from state.
- [ ] **[CSJ] Create the GitHub token.** Settings → Developer settings → Fine-grained tokens. Repository: only `gspot-data`. Permission: Contents read and write. Expiry: 1 year.
- [ ] **[CSJ] First sync from the phone.** In the app go to Courses → Sync, paste the token and tap Sync now.
  Done when: `gspot-data` shows a `gSpot sync` commit and `state.json` is no longer `null`.
  If it fails, the Sync card shows the error: 401 means the token is wrong, 404 means the token can't access `gspot-data`'s contents.
- [ ] **[CSJ] Second device check (optional).** Open the app on another browser, paste the same token and confirm it picks up the phone's data.

## 2. Get the six past rounds counting

- [x] **[code] Score imported rounds.** Any round with every hole entered but no `diff` is scored oldest first by `finalise()` (`app.js`). It uses the same maths as saving a round, against the Index as at that round's date.
- [x] **[code] Fix `import_rounds.py`.** It now finds its folder itself instead of using the old path, takes a `tee` per record, and no longer hardcodes `hadIndex`. `gspot-import.json` has been regenerated. The 15 May totals now come from the hole scores (gross 98, putts 26).
  Checked in Chrome: importing gives differentials of 22.8, 8.7, 19.9, 11.3, 20.3, 11.3 and an **Index of 9.0**, with points and differentials showing in the Rounds list.
- [ ] **[CSJ] Confirm which tees were played.** Surrey National (Yellow) and Wildernesse (White) confirmed 2026-10-15; Index is now **10.3** (differentials 22.8, 11.9, 19.9, 11.3, 20.3, 11.3). Westerham, Royal Blackheath and Poult Wood are still open. The `'tee'` values in `import_rounds.py` are the first-listed (back) tees and haven't been confirmed. Change any that are wrong, then run `python3 import_rounds.py`.
  | Date | Course | Tee in script | Tee actually played |
  |---|---|---|---|
  | 2026-05-15 | Westerham | White | |
  | 2026-06-28 | Surrey National | Yellow | Yellow ✓ |
  | 2026-07-14 | Royal Blackheath | Purple | |
  | 2026-07-20 | Wildernesse | White | White ✓ |
  | 2026-07-22 | Poult Wood | White | |
  | 2026-08-22 | Wildernesse | White | White ✓ |
- [ ] **[CSJ] Check the 15 May Westerham card.** The holes add up to 98 (putts 26). The earlier JSON said 96 (putts 27). If the card says 96, two hole scores in `import_rounds.py:12-13` are wrong.
- [x] ~~**[CSJ] Import on the phone.**~~ Replaced by seeding `gspot-data`, above. Courses → Backup → Import `gspot-import.json`, **after** sync is working, so the import goes to GitHub too. The import replaces everything on the device (`importJson`), including any rounds entered since.
  Done when: the Handicap tab shows an Index.

## 3. Course data

- [x] **Darenth Valley ratings cross-checked.** Pars, SIs and CR/Slope (White 70.6/115, Yellow 69.9/115) match The Social Golfer's 2023 card; only yardages differ by a few yards. Checking the club's own card is still worthwhile when you're next there. Was: check them against the club card (`courses.js:108`, id `manual-darenth-valley`). If they're wrong, fix them in Courses → Darenth Valley.
- [x] No `courses.js` change needed; added a note there about the cross-check.

## 4. Close the spec gaps

- [x] **[code] Playing Handicap 50% foursomes and 60/40 greensomes**, worked out from a "Partner's Course Handicap" box on the Handicap tab. Checked by hand: CH 9.33 and partner 10 give 10 and 10.
- [x] **[code] Spec updated.** It now names the RapidAPI course search, drops "cloud sync" from Out of scope, and describes the partner-based calculator.

## 5. Smaller fixes

- [x] **[code] Default date in local time.** `today()` now uses `toLocaleDateString('en-CA')`.
- [x] **[code] Clamp PCC** to −1..+3, whole numbers. Checked: 7 becomes 3, −4 becomes −1.
- [x] **[code] Index on the round's date.** `hadIndex` and the 9-hole conversion now use `record(date)`, the Index from rounds on or before that date. Checked: a round dated 1 June has no Index, one dated 1 September does.
  Still open: the "Play off" default on the Play screen uses today's Index (overtype it for an old card), and rounds saved earlier aren't rescored when an older card is added before them.
- [ ] **[code] Edit a saved round.** Right now the only option is delete. Not built; do it when it gets in the way.
- [ ] **[code] Sync size ceiling.** Past 1 MB (~500 rounds) GitHub stops returning `state.json` inline. Years away.

## 6. Housekeeping

- [x] Copied project memory from the old `-Users-CSJ-Desktop-gSpot` folder to this path's memory folder. Updated the path in the handover.
- [x] Committed `handover/`, `docs/status-2026-10-15.md`, `currentTODO/` and the code changes.
