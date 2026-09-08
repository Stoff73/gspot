// WHS handicap maths, per handi.md and the R&A Rules of Handicapping (2024). Pure functions, no DOM.
(function (root) {
  const r1 = x => Math.round(x * 10 + 1e-9) / 10; // nearest tenth, .5 up

  // Rule 6.1: Course Handicap = Index * Slope/113 + (CR - Par). Unrounded value kept for Playing Handicap.
  function courseHandicapRaw(index, slope, cr, par) { return index * slope / 113 + (cr - par); }
  function courseHandicap(index, slope, cr, par) { return Math.round(courseHandicapRaw(index, slope, cr, par)); }
  // 9-hole Course Handicap uses the 9-hole ratings: Index/2 * Slope9/113 + (CR9 - Par9).
  function courseHandicap9Raw(index, slope9, cr9, par9) { return index / 2 * slope9 / 113 + (cr9 - par9); }
  function courseHandicap9(index, slope9, cr9, par9) { return Math.round(courseHandicap9Raw(index, slope9, cr9, par9)); }
  // Rule 6.2: Playing Handicap = unrounded Course Handicap * allowance, rounded (England, Apr 2024).
  function playingHandicap(courseHcpRaw, allowance) { return Math.round(courseHcpRaw * allowance); }

  // Shots received on a hole ranked `rank` (1..n) by stroke index, for an n-hole round.
  // 18 holes: rank = SI. 9 holes: rank of the hole's SI within that nine, with the 9-hole Course Handicap.
  // Plus handicaps give shots back starting at the highest rank.
  function shotsOnHole(courseHcp, rank, n = 18) {
    if (courseHcp >= 0) return Math.floor(courseHcp / n) + (rank <= courseHcp % n ? 1 : 0);
    const h = -courseHcp;
    return 0 - Math.floor(h / n) - (rank > n - (h % n) ? 1 : 0);
  }

  // Rule 3.1: max hole score is net double bogey; par + 5 before a Handicap Index exists.
  function maxHoleScore(par, shots, hasIndex = true) { return hasIndex ? par + 2 + shots : par + 5; }
  function cappedScore(score, par, shots, hasIndex = true) { return Math.min(score, maxHoleScore(par, shots, hasIndex)); }

  // Rule 5.1a: Score Differential = 113/Slope * (AGS - CR - PCC). Raw for ESR; rounded to 1 dp for the record.
  function differentialRaw(ags, cr, slope, pcc = 0) { return 113 / slope * (ags - cr - pcc); }
  function differential(ags, cr, slope, pcc = 0) { return r1(differentialRaw(ags, cr, slope, pcc)); }

  function stableford(score, par, shots) { return Math.max(0, par + 2 - (score - shots)); }

  // Rule 5.1b: 18-hole SD = unrounded 9-hole SD + expected 9-hole SD for the player's Index, rounded once.
  // The expected-score table is not published. ponytail: linear fit through the two official worked examples
  // (Index 14.0 -> 8.5, Index 16.0 -> 9.52). Without an Index the 9-hole SD is doubled.
  function expected9(index) { return 0.51 * index + 1.36; }
  function nineToEighteenRaw(sd9raw, index) { return sd9raw + (index == null ? sd9raw : expected9(index)); }
  function nineToEighteen(sd9raw, index) { return r1(nineToEighteenRaw(sd9raw, index)); }

  // Rule 5.2a table: [scores in record, lowest N averaged, adjustment]
  const TABLE = [
    [3, 1, -2], [4, 1, -1], [5, 1, 0], [6, 2, -1], [7, 2, 0], [8, 2, 0],
    [9, 3, 0], [10, 3, 0], [11, 3, 0], [12, 4, 0], [13, 4, 0], [14, 4, 0],
    [15, 5, 0], [16, 5, 0], [17, 6, 0], [18, 6, 0], [19, 7, 0], [20, 8, 0],
  ];
  const MAX_INDEX = 54.0;
  function countedFor(n) { return n < 3 ? 0 : TABLE[Math.min(n, 20) - 3][1]; }
  function indexFromDiffs(diffs) {
    const n = Math.min(diffs.length, 20);
    if (n < 3) return null;
    const [, k, adj] = TABLE[n - 3];
    const best = diffs.slice().sort((a, b) => a - b).slice(0, k);
    return Math.min(MAX_INDEX, r1(best.reduce((a, b) => a + b, 0) / k + adj));
  }

  const DAY = 864e5;
  // scores: [{date:'YYYY-MM-DD', diff, raw?, holes?}] in chronological order. raw = unrounded diff (ESR test), holes = 9|18.
  // Returns {index, low, history:[{date,index}], record:[{date,diff,adj,counted}]}
  function computeRecord(scores) {
    const adj = scores.map(() => 0); // ESR adjustments accumulate on each differential
    const history = [];
    let low = null, holes = 0;
    for (let i = 0; i < scores.length; i++) {
      const start = Math.max(0, i - 19);
      const prev = history.length ? history[history.length - 1].index : null;
      holes += scores[i].holes || 18;
      if (prev != null) { // Rule 5.9: ESR on the unrounded differential vs Index at the time; applied to the last 20
        const gap = prev - (scores[i].raw ?? scores[i].diff);
        const esr = gap >= 10 ? -2 : gap >= 7 ? -1 : 0;
        if (esr) for (let j = start; j <= i; j++) adj[j] += esr;
      }
      const window = scores.slice(start, i + 1).map((s, j) => s.diff + adj[start + j]);
      let idx = holes < 54 ? null : indexFromDiffs(window); // Rule 5.2: 54 holes minimum for an initial Index
      // Rule 5.7/5.8: Low Handicap Index = lowest in previous 365 days once 20 scores exist; then soft/hard caps.
      const t = Date.parse(scores[i].date);
      const recent = history.filter(h => h.index != null && t - Date.parse(h.date) <= 365 * DAY && h.n >= 20);
      low = recent.length ? Math.min(...recent.map(h => h.index)) : null;
      if (idx != null && low != null) {
        if (idx > low + 3) idx = low + 3 + (idx - (low + 3)) / 2; // soft cap
        idx = r1(Math.min(idx, low + 5));                        // hard cap
      }
      history.push({ date: scores[i].date, index: idx, n: i + 1 });
    }
    const start = Math.max(0, scores.length - 20);
    const windowAdj = scores.slice(start).map((s, j) => s.diff + adj[start + j]);
    const k = holes < 54 ? 0 : countedFor(windowAdj.length);
    const cut = windowAdj.slice().sort((a, b) => a - b)[k - 1];
    let used = 0;
    const record = scores.slice(start).map((s, j) => {
      const d = windowAdj[j];
      const counted = k > 0 && d <= cut && used < k && (used++, true);
      return { date: s.date, diff: s.diff, adj: adj[start + j], counted: !!counted };
    });
    return { index: history.length ? history[history.length - 1].index : null, low, history, record, holes };
  }

  const api = { r1, MAX_INDEX, courseHandicapRaw, courseHandicap, courseHandicap9Raw, courseHandicap9, playingHandicap,
    shotsOnHole, maxHoleScore, cappedScore, differentialRaw, differential, stableford, expected9,
    nineToEighteenRaw, nineToEighteen, indexFromDiffs, computeRecord, countedFor };
  if (typeof module !== 'undefined') module.exports = api; else root.WHS = api;
})(typeof window !== 'undefined' ? window : globalThis);
