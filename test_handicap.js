// node test_handicap.js
const assert = require('assert');
const W = require('./handicap.js');

// handi.md worked example
assert.strictEqual(W.differential(92, 71.5, 125, 0), 18.5);
// Course Handicap: 14.8 index, slope 125, CR 71.5, par 72 -> round(16.37 - 0.5) = 16
assert.strictEqual(W.courseHandicap(14.8, 125, 71.5, 72), 16);
// England Golf Apr-2024 example: Index 10.0, CR 73.6, Slope 145, Par 72 -> CH 14.43 unrounded, 95% PH = 14
assert.strictEqual(W.courseHandicap(10, 145, 73.6, 72), 14);
assert.strictEqual(W.playingHandicap(W.courseHandicapRaw(10, 145, 73.6, 72), 0.95), 14);
// 9-hole Course Handicap: Index 16.0, F9 slope 125, F9 CR 36.0, par 36 -> 8.85 -> 9
assert.strictEqual(W.courseHandicap9(16, 125, 36.0, 36), 9);
// Shots received: 16 hcp gets one shot on SI 1..16, none on 17/18. 20 hcp gets two on SI 1,2.
assert.strictEqual(W.shotsOnHole(16, 16), 1);
assert.strictEqual(W.shotsOnHole(16, 17), 0);
assert.strictEqual(W.shotsOnHole(20, 2), 2);
assert.strictEqual(W.shotsOnHole(20, 3), 1);
assert.strictEqual(W.shotsOnHole(-2, 18), -1);
assert.strictEqual(W.shotsOnHole(-2, 16), 0);
// 9-hole: course hcp 11 over 9 holes -> 2 shots on ranks 1-2, 1 shot on 3-9
assert.strictEqual(W.shotsOnHole(11, 2, 9), 2);
assert.strictEqual(W.shotsOnHole(11, 9, 9), 1);
// Net double bogey: 10 on a par 4 with one shot counts 7; par + 5 before an Index exists
assert.strictEqual(W.cappedScore(10, 4, 1), 7);
assert.strictEqual(W.cappedScore(10, 4, 1, false), 9);
// Stableford: net par = 2 pts
assert.strictEqual(W.stableford(5, 4, 1), 2);
assert.strictEqual(W.stableford(9, 4, 1), 0);
// Small-record table
assert.strictEqual(W.indexFromDiffs([20, 18.5, 22]), 16.5); // best 1 - 2
assert.strictEqual(W.indexFromDiffs([20, 18.5, 22, 19]), 17.5); // best 1 - 1
assert.strictEqual(W.indexFromDiffs([20, 18, 22, 19, 21, 17]), 16.5); // avg best 2 (17.5) - 1
assert.strictEqual(W.indexFromDiffs(Array.from({ length: 20 }, (_, i) => 10 + i)), 13.5); // avg 10..17
assert.strictEqual(W.indexFromDiffs([1, 2]), null);
assert.strictEqual(W.indexFromDiffs([60, 61, 62]), 54); // max 54.0

// Rolling record: 20 scores of 15.0 then a run of bad rounds -> hard cap at low + 5
const d = (i, diff, holes = 18) => ({ date: new Date(2026, 0, 1 + i).toISOString().slice(0, 10), diff, holes });
let scores = Array.from({ length: 20 }, (_, i) => d(i, 15));
let rec = W.computeRecord(scores);
assert.strictEqual(rec.index, 15);
assert.strictEqual(rec.record.filter(r => r.counted).length, 8);
for (let i = 20; i < 40; i++) scores.push(d(i, 40));
rec = W.computeRecord(scores);
assert.strictEqual(rec.low, 15);
assert.strictEqual(rec.index, 20); // hard cap
// Soft cap: raw would be 15 -> 19 => soft cap halves movement above 18 => 18.5
scores = Array.from({ length: 20 }, (_, i) => d(i, 15));
for (let i = 20; i < 40; i++) scores.push(d(i, 19));
assert.strictEqual(W.computeRecord(scores).index, 18.5);
// ESR: index 15, then a 5.0 differential (10 below) => -2 on all, best 8 now includes 3.0 and seven 13.0s
scores = Array.from({ length: 20 }, (_, i) => d(i, 15));
scores.push(d(20, 5));
rec = W.computeRecord(scores);
assert.strictEqual(rec.record[rec.record.length - 1].adj, -2);
assert.strictEqual(rec.index, 11.8); // (3 + 7*13)/8 = 11.75 -> 11.8
// ESR uses the unrounded differential: 8.0 rounded but 8.04 raw is < 7.0 below 15.0 -> no reduction
scores = Array.from({ length: 20 }, (_, i) => d(i, 15));
scores.push({ ...d(20, 8.0), raw: 8.04 });
assert.strictEqual(W.computeRecord(scores).record.at(-1).adj, 0);
// 54-hole minimum: three 9-hole scores = 27 holes, no Index; six 9-hole scores = 54 -> Index (lowest 2 avg - 1)
scores = [d(0, 10, 9), d(1, 12, 9), d(2, 14, 9)];
assert.strictEqual(W.computeRecord(scores).index, null);
scores.push(d(3, 16, 9), d(4, 18, 9), d(5, 20, 9));
assert.strictEqual(W.computeRecord(scores).index, 10); // (10+12)/2 - 1

// 9-hole scaling, official examples: Golf RSA deck (Index 16.0: 5.42 + 9.52 = 14.9), MGA/USGA (Index 14.0: 7.2 -> 15.7)
assert.strictEqual(W.differentialRaw(42, 36.0, 125).toFixed(2), '5.42');
assert.strictEqual(W.nineToEighteen(5.42, 16.0), 14.9);
assert.strictEqual(W.nineToEighteen(7.2, 14.0), 15.7);
assert.strictEqual(W.nineToEighteen(8.0, null), 16);

console.log('ok');
