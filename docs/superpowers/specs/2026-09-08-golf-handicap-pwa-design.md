# gSpot — golf scoring & WHS handicap PWA

Single-user mobile web app. Enter scores hole by hole on one scrolling scorecard, get a WHS-style Handicap Index (England Golf rules per handi.md), track rounds and stats. Modelled on VPAR's scorecard and stats, not its colours.

## Delivery
- Plain HTML/CSS/JS PWA. No framework, no build. Files: `index.html`, `app.js`, `handicap.js`, `courses.js` (seed), `sw.js`, `manifest.json`, `test_handicap.js`.
- Data in localStorage (`gspot` key). JSON export/import for backup.
- Course data: seeded courses + search via golfcourseapi.com (free key, pasted in Settings) + manual add/edit.

## Screens (bottom tabs)
- **Play**: choose course, tee, date, holes (18 / front 9 / back 9). Shows Course Handicap for that tee. Scorecard is ONE scrolling list: every hole as a row (hole, par, SI, yards, shots received; score stepper defaulting to par; putts stepper; FIR toggle hidden on par 3; GIR toggle; Stableford points; net-double-bogey cap marker). Front nine totals row after hole 9, back nine totals row after 18, round totals at the end, then Save.
- **Rounds**: history list; tap for the full scorecard and that round's Score Differential.
- **Handicap**: Index, Low Index (365 days), last 20 differentials with counted ones highlighted, Index trend, Course/Playing Handicap calculator (95%, 85%, 50%, 60/40).
- **Stats**: scoring avg, avg to par, avg by par 3/4/5, putts/round, FIR%, GIR%, birdie/par/bogey/double+ distribution, best round. Filter by course.
- **Courses**: list, API search, manual add/edit.

## Handicap engine (handi.md)
Checked against R&A Rules of Handicapping 2024 (Rules 3.1, 5.1, 5.2, 5.3, 5.7, 5.8, 5.9, 6.1, 6.2) and England Golf April-2024 guidance.
- Shots received per hole from Course Handicap vs SI (rank within the nine for 9-hole rounds). Hole capped at net double bogey = par + 2 + shots; par + 5 before an Index exists (Rule 3.1). All holes of the chosen nine/eighteen must be entered.
- Score Differential = 113 / Slope × (AGS − CR − PCC), 1 dp. PCC defaults 0, per-round override (−1 to +3).
- 9-hole rounds (Rule 5.1b): SD9 unrounded from the nine's own CR/Slope (optional per tee; fallback CR/2 and 18-hole Slope, flagged as estimate). SD18 = SD9 + expected 9-hole SD, rounded once. Expected SD table is unpublished; approximated as 0.51 × Index + 1.36, fitted to the two official worked examples (Index 14.0 → 8.5, Index 16.0 → 9.52). SD9 × 2 if no Index yet.
- 9-hole Course Handicap = round(Index / 2 × Slope9 / 113 + (CR9 − Par9)).
- Index = avg of lowest N of most recent 20 per the Rule 5.2a table with −2.0/−1.0 adjustments, 1 dp, max 54.0. Needs 54 holes (any mix of 9s and 18s).
- Low Index = lowest Index in previous 365 days once 20 scores exist. Soft cap: upward movement beyond low + 3.0 halved. Hard cap: low + 5.0.
- ESR (Rule 5.9): unrounded differential ≥ 7.0 below the Index at the time → −1.0 on the most recent 20 differentials incl. the new one; ≥ 10.0 → −2.0. Fewer than 20: all of them.
- Course Handicap = Index × Slope / 113 + (CR − Par), rounded for general play. Playing Handicap = round(unrounded Course Handicap × allowance) (England, Apr 2024).

## Testing
`node test_handicap.js`: handi.md worked example (AGS 92, CR 71.5, Slope 125 → 18.5), shots-received, net double bogey, small-record table, caps, ESR, Course Handicap.

## Out of scope
GPS, live leaderboards, multi-player, accounts, cloud sync, wearables.
