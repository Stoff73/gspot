/* gSpot — single-user golf scoring + WHS handicap. Plain JS, localStorage. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const fmt1 = x => x == null ? '–' : x.toFixed(1);
const toPar = d => d === 0 ? 'E' : d > 0 ? '+' + d : String(d);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------- state ----------
const KEY = 'gspot';
let S = (() => {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) return s; } catch (e) {}
  return { courses: window.SEED_COURSES || [], rounds: [], settings: {}, draft: null, tab: 'play' };
})();
for (const c of window.SEED_COURSES || []) if (!S.courses.some(x => x.id === c.id)) S.courses.push(c); // merge new seeds
S.courses = S.courses.filter(c => c.id !== 'seed-example' || S.rounds.some(r => r.courseId === c.id)); // drop placeholder
function save() { localStorage.setItem(KEY, JSON.stringify(S)); if (syncReady) schedulePush(); }

// ---------- sync: state.json in a private GitHub repo, read/written via the contents API. Last write wins. ----------
const SYNC_REPO = 'Stoff73/gspot-data', SYNC_FILE = 'state.json';
const SYNC_KEY = 'gspot-sync';
let sync = (() => { try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch (e) { return {}; } })(); // {token, sha, at, status, api?}
const saveSync = () => localStorage.setItem(SYNC_KEY, JSON.stringify(sync));
const syncData = () => ({ courses: S.courses, rounds: S.rounds, settings: S.settings, draft: S.draft });
let lastSynced = null;  // JSON of syncData() as last agreed with the server
let syncReady = false;  // no pushes until the first pull has had its chance
let pushTimer;
const b64e = str => btoa(unescape(encodeURIComponent(str)));
const b64d = str => decodeURIComponent(escape(atob(str.replace(/\n/g, ''))));
async function ghFetch(method, body) {
  const url = (sync.api || 'https://api.github.com') + `/repos/${SYNC_REPO}/contents/${SYNC_FILE}` + (method === 'GET' ? '?t=' + Date.now() : '');
  const r = await fetch(url, { method, headers: { Authorization: 'Bearer ' + sync.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(r.status === 401 ? 'token rejected or expired' : r.status === 404 ? 'repo or file not found (token needs Contents access to ' + SYNC_REPO + ')' : d.message || 'HTTP ' + r.status); e.status = r.status; throw e; }
  return d;
}
function syncStatusText() {
  if (!sync.token) return 'Not set up';
  const when = sync.at ? new Date(sync.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'never';
  return sync.status === 'pending' ? 'Changes waiting to sync' : sync.status && sync.status !== 'ok' ? sync.status : 'Synced ' + when;
}
function renderSyncStatus() { const el = $('#syncStatus'); if (el) el.textContent = syncStatusText(); }
function schedulePush() {
  if (!sync.token || JSON.stringify(syncData()) === lastSynced) return;
  sync.status = 'pending'; saveSync(); renderSyncStatus();
  clearTimeout(pushTimer); pushTimer = setTimeout(push, 1500);
}
async function push() {
  if (!sync.token || !navigator.onLine) return;
  const j = JSON.stringify(syncData());
  try {
    let sha = sync.sha;
    for (let attempt = 0; ; attempt++) {
      try { const d = await ghFetch('PUT', { message: 'gSpot sync', content: b64e(j), sha }); lastSynced = j; sync.sha = d.content.sha; break; }
      catch (e) { if (attempt || e.status !== 409) throw e; sha = (await ghFetch('GET')).sha; } // stale sha: retry once, last write wins
    }
    sync.at = Date.now(); sync.status = 'ok';
  } catch (e) { sync.status = 'Sync failed: ' + e.message; }
  saveSync(); renderSyncStatus();
}
async function pull() {
  if (!sync.token || !navigator.onLine) return;
  try {
    const d = await ghFetch('GET');
    const data = JSON.parse(b64d(d.content) || 'null');
    if (d.sha !== sync.sha && data && sync.status !== 'pending') {   // server is newer and we have nothing unsent: adopt it
      clearTimeout(pushTimer);
      Object.assign(S, data); localStorage.setItem(KEY, JSON.stringify(S));
      lastSynced = JSON.stringify(syncData()); sync.sha = d.sha; sync.status = 'ok'; sync.at = Date.now();
      saveSync(); render(); return;
    }
    sync.sha = d.sha;
    if (!data) { if (S.rounds.length) sync.status = 'pending'; }         // empty server: seed it from this device
    else if (sync.status !== 'pending') { lastSynced = JSON.stringify(syncData()); sync.status = 'ok'; sync.at = Date.now(); }
  } catch (e) { sync.status = 'Sync failed: ' + e.message; }
  saveSync(); renderSyncStatus();
}
async function syncNow() {
  sync.token = $('[data-f=syncToken]').value.trim(); saveSync();
  if (!sync.token) { renderSyncStatus(); return; }
  $('#syncStatus').textContent = 'Syncing…';
  await pull(); syncReady = true; if (sync.status === 'pending') await push(); else schedulePush();
}

// ---------- derived ----------
function roundHoles(course, which) {
  const idx = which === 'front' ? [0, 9] : which === 'back' ? [9, 18] : [0, 18];
  return course.holes.slice(idx[0], idx[1]).map((h, i) => ({ n: idx[0] + i + 1, par: h[0], si: h[1], yds: h[2] }));
}
const coursePar = c => c.holes.reduce((s, h) => s + h[0], 0);
function record() {
  const scores = S.rounds.filter(r => r.diff != null).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
    .map(r => ({ date: r.date, diff: r.diff, raw: r.raw, holes: r.nHoles || 18 }));
  return WHS.computeRecord(scores);
}
const currentIndex = () => record().index;
// Ratings for the holes played: 18-hole CR/Slope, or the nine's own ratings (fallback CR/2, 18-hole slope).
function ratingsFor(course, tee, which) {
  if (which === 'all') return { cr: tee.cr, slope: tee.slope, par: coursePar(course), n: 18 };
  const k = which === 'front' ? 'f' : 'b';
  const par = course.holes.slice(k === 'f' ? 0 : 9, k === 'f' ? 9 : 18).reduce((s, h) => s + h[0], 0);
  return { cr: tee['cr9' + k] || tee.cr / 2, slope: tee['slope9' + k] || tee.slope, par, n: 9, approx: !tee['cr9' + k] };
}
function courseHcpRawFor(course, tee, index, which = 'all') {
  if (index == null) return null;
  const R = ratingsFor(course, tee, which);
  return R.n === 18 ? WHS.courseHandicapRaw(index, R.slope, R.cr, R.par) : WHS.courseHandicap9Raw(index, R.slope, R.cr, R.par);
}
function courseHcpFor(course, tee, index, which = 'all') {
  const raw = courseHcpRawFor(course, tee, index, which);
  return raw == null ? null : Math.round(raw);
}
// Shots received on a hole of round r (rank = SI for 18 holes, rank within the nine for 9-hole rounds).
const shotsFor = (h, r) => WHS.shotsOnHole(r.courseHcp || 0, h.rank ?? h.si, r.nHoles || 18);
// Score maths for some holes of round r.
function summarise(holes, r) {
  const out = { gross: 0, net: 0, pts: 0, putts: 0, played: 0, par: 0, fir: 0, firOpp: 0, gir: 0, ags: 0 };
  for (const h of holes) {
    out.par += h.par;
    if (h.score == null) continue;
    const shots = shotsFor(h, r);
    out.played++; out.gross += h.score; out.net += h.score - shots;
    out.pts += WHS.stableford(h.score, h.par, shots);
    out.ags += WHS.cappedScore(h.score, h.par, shots, r.hadIndex !== false);
    out.putts += h.putts || 0;
    if (h.par > 3) { out.firOpp++; if (h.fir === true) out.fir++; }
    if (h.gir === true) out.gir++;
  }
  return out;
}

// ---------- render ----------
const TITLES = { play: 'Play', rounds: 'Rounds', handicap: 'Handicap', stats: 'Stats', courses: 'Courses' };
let sub = null; // sub-view state: {view, id, ...}
function render() {
  const idx = currentIndex();
  $('#title').textContent = TITLES[S.tab];
  $('#hdrIdx').innerHTML = idx == null ? `<span>No index yet</span>` : `Index <b>${fmt1(idx)}</b>`;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
  $('#view').innerHTML = ({ play: viewPlay, rounds: viewRounds, handicap: viewHandicap, stats: viewStats, courses: viewCourses })[S.tab]();
  save();
}

// ----- Play -----
function viewPlay() {
  if (S.draft) return viewScorecard();
  if (!S.courses.length) return `<div class="card">Add a course first (Courses tab).</div>`;
  const idx = currentIndex();
  const st = S.settings;
  const course = S.courses.find(c => c.id === st.lastCourse) || S.courses[0];
  const tee = course.tees.find(t => t.name === st.lastTee) || course.tees[0];
  const which = st.lastWhich || 'all';
  const R = tee && ratingsFor(course, tee, which);
  const ch = tee ? courseHcpFor(course, tee, idx, which) : null;
  return `<div class="card"><h2>New round</h2>
    <label class="f">Course<select data-f="course">${S.courses.map(c => `<option value="${c.id}" ${c.id === course.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <label class="f">Tees<select data-f="tee">${course.tees.map(t => `<option value="${esc(t.name)}" ${tee && t.name === tee.name ? 'selected' : ''}>${esc(t.name)} · CR ${t.cr} · Slope ${t.slope}</option>`).join('')}</select></label>
    <label class="f">Holes<select data-f="which">${[['all', '18 holes'], ['front', 'Front 9'], ['back', 'Back 9']].map(([v, l]) => `<option value="${v}" ${v === which ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <div class="row"><label class="f grow">Date<input type="date" data-f="date" value="${today()}"></label>
    <label class="f" style="width:110px">PCC<input type="number" data-f="pcc" value="0" min="-1" max="3" step="1"></label></div>
    <div class="row" style="margin:6px 0 12px"><div class="grow"><div class="mute sm">Handicap Index</div><div style="font-size:24px;font-weight:700">${fmt1(idx)}</div></div>
    <div class="grow"><div class="mute sm">Course Handicap${which === 'all' ? '' : ' (9 holes)'}</div><div style="font-size:24px;font-weight:700">${ch == null ? '–' : ch}</div><div class="mute xs">CR ${R.cr} · Slope ${R.slope} · Par ${R.par}${R.approx ? ' · est. from 18-hole rating' : ''}</div></div></div>
    <label class="f">Play off (Course Handicap, edit if no Index yet)<input type="number" data-f="ch" value="${ch ?? 0}" step="1"></label>
    <button class="btn" data-a="start">Start round</button></div>`;
}
function startRound() {
  const v = f => $(`[data-f=${f}]`).value;
  const course = S.courses.find(c => c.id === v('course'));
  const tee = course.tees.find(t => t.name === v('tee'));
  S.settings.lastCourse = course.id; S.settings.lastTee = tee.name;
  const which = v('which'); S.settings.lastWhich = which;
  const R = ratingsFor(course, tee, which);
  const raw = roundHoles(course, which);
  const order = raw.map(h => h.si).sort((a, b) => a - b); // rank of each hole's SI within the holes played
  const holes = raw.map(h => ({ ...h, rank: order.indexOf(h.si) + 1, score: null, putts: null, fir: null, gir: null }));
  S.draft = { id: uid(), date: v('date') || today(), courseId: course.id, courseName: course.name, teeName: tee.name,
    cr: R.cr, slope: R.slope, par: R.par, nHoles: R.n, which, pcc: +v('pcc') || 0,
    courseHcp: parseInt(v('ch'), 10) || 0, hadIndex: currentIndex() != null, holes };
  render();
}
function holeRow(h, r, ro) {
  const shots = shotsFor(h, r);
  const has = h.score != null;
  const max = WHS.maxHoleScore(h.par, shots, r.hadIndex !== false);
  const cap = has && h.score > max;
  const pts = has ? WHS.stableford(h.score, h.par, shots) : null;
  const cls = !has ? 'empty' : h.score < h.par ? 'under' : h.score > h.par ? 'over' : 'par';
  const dots = shots > 0 ? '•'.repeat(shots) : shots < 0 ? '+' : '';
  const tog = (f, txt) => `<button class="tog ${h[f] === true ? 'on' : h[f] === false ? 'off' : ''} ${f === 'fir' && h.par === 3 ? 'hidden' : ''}" data-a="tog" data-n="${h.n}" data-f="${f}" ${ro ? 'disabled' : ''}>${txt}</button>`;
  return `<div class="hole" id="h${h.n}"><div class="top"><span class="num">${h.n}</span>
    <span class="meta">Par <b>${h.par}</b> · SI <b>${h.si}</b> · ${h.yds} yds <span class="acc">${dots}</span>${cap ? ' <span class="cap">capped to ' + max + '</span>' : ''}</span>
    <span class="pts">${pts == null ? '' : `<b>${pts}</b> pts`}</span></div>
    <div class="ctl">
      <div class="stepwrap"><div class="step"><button data-a="dec" data-n="${h.n}" data-f="score" ${ro ? 'disabled' : ''}>−</button><button class="v ${cls}" data-a="par" data-n="${h.n}" ${ro ? 'disabled' : ''}>${has ? h.score : h.par}</button><button data-a="inc" data-n="${h.n}" data-f="score" ${ro ? 'disabled' : ''}>+</button></div><span class="lbl">score</span></div>
      <div class="stepwrap"><div class="step"><button data-a="dec" data-n="${h.n}" data-f="putts" ${ro ? 'disabled' : ''}>−</button><span class="v ${h.putts == null ? 'empty' : ''}">${h.putts ?? '–'}</span><button data-a="inc" data-n="${h.n}" data-f="putts" ${ro ? 'disabled' : ''}>+</button></div><span class="lbl">putts</span></div>
      ${tog('fir', 'FIR')}${tog('gir', 'GIR')}
    </div></div>`;
}
function totalsRow(label, holes, r, cls = '') {
  const s = summarise(holes, r);
  const d = s.played ? s.gross - holes.filter(h => h.score != null).reduce((a, h) => a + h.par, 0) : null;
  return `<div class="totals ${cls}"><div class="l">${label}<div class="h">${s.played}/${holes.length} holes</div></div>
    <div><div class="h">Par</div><b>${s.par}</b></div><div><div class="h">Gross</div><b>${s.played ? s.gross : '–'}</b><div class="xs ${d > 0 ? 'bad' : d < 0 ? 'good' : ''}">${d == null ? '' : toPar(d)}</div></div>
    <div><div class="h">Putts</div><b>${s.played ? s.putts : '–'}</b></div><div><div class="h">Pts</div><b>${s.played ? s.pts : '–'}</b></div></div>`;
}
function scorecardHtml(r, ro) {
  const front = r.holes.filter(h => h.n <= 9), back = r.holes.filter(h => h.n > 9);
  let html = '';
  if (front.length) html += front.map(h => holeRow(h, r, ro)).join('') + totalsRow('Front 9', front, r);
  if (back.length) html += back.map(h => holeRow(h, r, ro)).join('') + totalsRow('Back 9', back, r);
  if (front.length && back.length) html += totalsRow('Round', r.holes, r, 'round');
  return html;
}
function viewScorecard() {
  const r = S.draft;
  const done = r.holes.every(h => h.score != null);
  return `<div class="card" style="padding:10px 14px"><div class="row"><div class="grow"><b>${esc(r.courseName)}</b> <span class="pill">${esc(r.teeName)}</span><div class="mute sm">${r.date} · CR ${r.cr} · Slope ${r.slope} · playing off ${r.courseHcp}</div></div>
    <button class="btn small sec" data-a="discard">✕</button></div></div>
    ${scorecardHtml(r, false)}
    <button class="btn" data-a="finish" ${done ? '' : 'disabled'}>${done ? 'Save round' : 'Enter every hole to save'}</button>`;
}
function finishRound() {
  const r = S.draft;
  const s = summarise(r.holes, r);
  const sdRaw = WHS.differentialRaw(s.ags, r.cr, r.slope, r.pcc);
  r.raw = r.nHoles === 9 ? WHS.nineToEighteenRaw(sdRaw, currentIndex()) : sdRaw;
  r.diff = WHS.r1(r.raw);
  r.ags = s.ags; r.gross = s.gross; r.pts = s.pts;
  S.rounds.push(r); S.draft = null; S.tab = 'rounds'; sub = { view: 'round', id: r.id };
  render();
}
function bump(n, f, d) {
  const h = S.draft.holes.find(h => h.n === n);
  if (f === 'score') h.score = h.score == null ? h.par + d : Math.max(1, h.score + d);
  else h.putts = Math.max(0, (h.putts ?? 0) + d);
  render();
}

// ----- Rounds -----
function viewRounds() {
  if (sub && sub.view === 'round') {
    const r = S.rounds.find(x => x.id === sub.id);
    if (r) return `<div class="card"><div class="row"><div class="grow"><b>${esc(r.courseName)}</b> <span class="pill">${esc(r.teeName)}</span><div class="mute sm">${r.date} · ${r.which === 'all' ? '18' : '9'} holes · off ${r.courseHcp}</div></div>
      <button class="btn small sec" data-a="back">Back</button></div>
      <div class="stat" style="margin-top:12px"><div><b>${r.gross}</b><span>Gross</span></div><div><b>${r.ags}</b><span>Adj gross</span></div><div><b class="acc">${fmt1(r.diff)}</b><span>Differential</span></div></div>
      <div class="mute xs" style="margin-top:8px">Differential = 113 / ${r.slope} × (${r.ags} − ${r.cr} − ${r.pcc || 0})${r.nHoles === 9 ? ' + expected 9-hole differential' : ''}</div></div>
      ${scorecardHtml(r, true)}
      <button class="btn danger" data-a="delround" data-id="${r.id}">Delete round</button>`;
  }
  sub = null;
  if (!S.rounds.length) return `<div class="card mute">No rounds yet. Play one.</div>`;
  const rs = S.rounds.slice().sort((a, b) => a.date < b.date ? 1 : -1);
  return `<div class="card list">${rs.map(r => { const d = r.gross - r.holes.reduce((a, h) => a + h.par, 0);
    return `<a href="#" data-a="open" data-id="${r.id}"><div><b>${esc(r.courseName)}</b><div class="mute sm">${r.date} · ${esc(r.teeName)} · ${r.which === 'all' ? 18 : 9} holes · ${r.pts} pts</div></div>
    <div style="text-align:right"><b style="font-size:20px">${r.gross}</b> <span class="${d > 0 ? 'bad' : 'good'}">${toPar(d)}</span><div class="mute sm">diff ${fmt1(r.diff)}</div></div></a>`; }).join('')}</div>`;
}

// ----- Handicap -----
function trendSvg(hist) {
  const pts = hist.filter(h => h.index != null);
  if (pts.length < 2) return '';
  const vals = pts.map(p => p.index), min = Math.min(...vals) - 1, max = Math.max(...vals) + 1;
  const W = 300, H = 120, x = i => 8 + i * (W - 16) / (pts.length - 1), y = v => H - 8 - (v - min) * (H - 16) / (max - min);
  return `<svg class="trend" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline fill="none" stroke="#e8a33d" stroke-width="2" points="${pts.map((p, i) => x(i) + ',' + y(p.index)).join(' ')}"/>
    ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.index)}" r="2.5" fill="#e8a33d"/>`).join('')}
    <text x="8" y="12" fill="#93a5a8" font-size="10">${max - 1}</text><text x="8" y="${H - 10}" fill="#93a5a8" font-size="10">${min + 1}</text></svg>`;
}
function viewHandicap() {
  const rec = record();
  const n = rec.record.length;
  const st = S.settings;
  const course = S.courses.find(c => c.id === (st.calcCourse || st.lastCourse)) || S.courses[0];
  const tee = course && (course.tees.find(t => t.name === st.calcTee) || course.tees[0]);
  const chRaw = course && tee ? courseHcpRawFor(course, tee, rec.index) : null;
  const ch = chRaw == null ? null : Math.round(chRaw);
  const ph = a => chRaw == null ? '–' : WHS.playingHandicap(chRaw, a);
  return `<div class="card" style="text-align:center"><h2>Handicap Index</h2><div class="big">${fmt1(rec.index)}</div>
    <div class="mute sm" style="margin-top:6px">${rec.index == null ? `${rec.holes} of 54 holes needed` : `best ${WHS.countedFor(n)} of last ${n}`}${rec.low != null ? ` · low index ${fmt1(rec.low)}` : ''}</div>
    ${trendSvg(rec.history)}</div>
    ${course ? `<div class="card"><h2>Course handicap calculator</h2>
    <label class="f">Course<select data-f="calcCourse">${S.courses.map(c => `<option value="${c.id}" ${c.id === course.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <label class="f">Tees<select data-f="calcTee">${course.tees.map(t => `<option value="${esc(t.name)}" ${t.name === tee.name ? 'selected' : ''}>${esc(t.name)} · CR ${t.cr} · Slope ${t.slope}</option>`).join('')}</select></label>
    <div class="stat"><div><b>${ch ?? '–'}</b><span>Course hcp</span></div><div><b>${ph(0.95)}</b><span>95% singles</span></div><div><b>${ph(0.85)}</b><span>85% 4BBB</span></div></div>
    <div class="mute xs" style="margin-top:8px">${fmt1(rec.index)} × ${tee.slope} / 113 + (${tee.cr} − ${coursePar(course)})</div></div>` : ''}
    <div class="card"><h2>Scoring record</h2><div class="tbl"><table><tr><th>Date</th><th>Diff</th><th>ESR</th><th>Used</th></tr>
    ${rec.record.slice().reverse().map(r => `<tr class="${r.counted ? 'counted' : ''}"><td>${r.date}</td><td>${fmt1(r.diff)}</td><td>${r.adj ? r.adj : ''}</td><td>${r.counted ? '✓' : ''}</td></tr>`).join('') || '<tr><td colspan="4" class="mute">No scores yet</td></tr>'}</table></div>
    <div class="mute xs" style="margin-top:8px">Index = average of the best differentials (Rule 5.2 table), max 54.0, soft cap at low + 3.0, hard cap at low + 5.0, exceptional score reductions applied. Updates immediately, not overnight.</div></div>`;
}

// ----- Stats -----
function viewStats() {
  const cid = S.settings.statCourse || '';
  const rs = S.rounds.filter(r => !cid || r.courseId === cid);
  const sel = `<div class="card"><label class="f">Course<select data-f="statCourse"><option value="">All courses</option>${S.courses.map(c => `<option value="${c.id}" ${c.id === cid ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label></div>`;
  if (!rs.length) return sel + `<div class="card mute">No rounds to analyse.</div>`;
  const holes = rs.flatMap(r => r.holes.filter(h => h.score != null));
  const full = rs.filter(r => (r.nHoles || 18) === 18);
  const avg = (arr, f) => arr.length ? arr.reduce((a, x) => a + f(x), 0) / arr.length : null;
  const byPar = p => { const hs = holes.filter(h => h.par === p); return hs.length ? avg(hs, h => h.score) : null; };
  const dist = { Eagle: 0, Birdie: 0, Par: 0, Bogey: 0, Double: 0, 'Worse': 0 };
  for (const h of holes) { const d = h.score - h.par; dist[d <= -2 ? 'Eagle' : d === -1 ? 'Birdie' : d === 0 ? 'Par' : d === 1 ? 'Bogey' : d === 2 ? 'Double' : 'Worse']++; }
  const firOpp = holes.filter(h => h.par > 3 && h.fir != null), fir = firOpp.filter(h => h.fir).length;
  const girOpp = holes.filter(h => h.gir != null), gir = girOpp.filter(h => h.gir).length;
  const puttsH = holes.filter(h => h.putts != null);
  const best = full.slice().sort((a, b) => a.gross - b.gross)[0];
  const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '–';
  const f1 = x => x == null ? '–' : x.toFixed(2);
  return sel + `<div class="card"><h2>Scoring (${rs.length} rounds, ${holes.length} holes)</h2><div class="stat">
    <div><b>${full.length ? Math.round(avg(full, r => r.gross)) : '–'}</b><span>Avg 18-hole</span></div>
    <div><b>${f1(avg(holes, h => h.score - h.par))}</b><span>Avg to par / hole</span></div>
    <div><b>${full.length ? Math.round(avg(full, r => r.pts)) : '–'}</b><span>Avg points</span></div>
    <div><b>${f1(byPar(3))}</b><span>Par 3 avg</span></div><div><b>${f1(byPar(4))}</b><span>Par 4 avg</span></div><div><b>${f1(byPar(5))}</b><span>Par 5 avg</span></div>
    <div><b>${puttsH.length ? (avg(puttsH, h => h.putts) * 18).toFixed(1) : '–'}</b><span>Putts / 18</span></div>
    <div><b>${pct(fir, firOpp.length)}</b><span>Fairways</span></div><div><b>${pct(gir, girOpp.length)}</b><span>Greens</span></div></div>
    ${best ? `<div class="mute sm" style="margin-top:10px">Best round: <b>${best.gross}</b> at ${esc(best.courseName)} (${best.date}), diff ${fmt1(best.diff)}</div>` : ''}</div>
    <div class="card"><h2>Score distribution</h2>${Object.entries(dist).map(([k, v]) => `<div class="bar"><em>${k}</em><i style="width:${holes.length ? 100 * v / holes.length : 0}%"></i><span>${v} <span class="mute">(${pct(v, holes.length)})</span></span></div>`).join('')}</div>`;
}

// ----- Courses -----
function viewCourses() {
  if (sub && sub.view === 'edit') return viewCourseEdit(sub.id);
  const key = S.settings.apiKey || '';
  return `<div class="card list">${S.courses.map(c => `<a href="#" data-a="edit" data-id="${c.id}"><div><b>${esc(c.name)}</b><div class="mute sm">${esc(c.city || '')} · par ${coursePar(c)} · ${c.tees.map(t => esc(t.name)).join(', ')}</div></div><span class="mute">›</span></a>`).join('') || '<div class="mute">No courses</div>'}
    <button class="btn sec" data-a="edit" data-id="new" style="margin-top:12px">+ Add course manually</button></div>
    <div class="card"><h2>Search UK Golf Course Data API</h2>
    <label class="f">RapidAPI key <span class="xs">(rapidapi.com › UK Golf Course Data API, free plan is rate-limited per minute)</span><input data-f="apiKey" value="${esc(key)}" placeholder="paste key"></label>
    <div class="row"><input data-f="q" placeholder="Club name" style="margin:0"><button class="btn small" data-a="search">Search</button></div>
    <div id="results"></div></div>
    <div class="card"><h2>Sync</h2>
    <label class="f">GitHub token <span class="xs">(fine-grained, only ${SYNC_REPO}, Contents: read and write)</span><input data-f="syncToken" type="password" value="${esc(sync.token || '')}" placeholder="github_pat_…"></label>
    <div class="row"><button class="btn small" data-a="syncnow">Sync now</button><span class="mute sm" id="syncStatus">${esc(syncStatusText())}</span></div>
    <div class="mute xs" style="margin-top:8px">Saves to a private file in ${SYNC_REPO}. Pulls when the app opens, pushes after every change. Last write wins.</div></div>
    <div class="card"><h2>Backup</h2><div class="row"><button class="btn sec small" data-a="export">Export JSON</button><label class="btn sec small" style="text-align:center">Import<input type="file" accept=".json" data-f="import" hidden></label></div>
    <div class="mute xs" style="margin-top:8px">${S.rounds.length} rounds · ${S.courses.length} courses stored on this device only.</div></div>`;
}
function viewCourseEdit(id) {
  const c = S.courses.find(x => x.id === id) || { id: 'new', name: '', city: '', holes: Array.from({ length: 18 }, (_, i) => [4, i + 1, 380]), tees: [{ name: 'White', cr: 72, slope: 125 }] };
  return `<div class="card"><div class="row"><h2 class="grow">${id === 'new' ? 'New course' : 'Edit course'}</h2><button class="btn small sec" data-a="back">Cancel</button></div>
    <label class="f">Name<input data-f="cname" value="${esc(c.name)}"></label><label class="f">Town<input data-f="ccity" value="${esc(c.city)}"></label>
    <h2>Tees (Course Rating, Slope)</h2><div class="tees-edit" id="tees">${c.tees.map(t => teeRow(t)).join('')}</div>
    <button class="btn sec small" data-a="addtee" style="margin-top:8px">+ tee</button>
    <h2 style="margin-top:14px">Holes</h2><div class="holes-edit"><span></span><span class="mute xs">Par</span><span class="mute xs">SI</span><span class="mute xs">Yds</span>
    ${c.holes.map((h, i) => `<span>${i + 1}</span><input type="number" class="hp" value="${h[0]}"><input type="number" class="hs" value="${h[1]}"><input type="number" class="hy" value="${h[2]}">`).join('')}</div>
    <button class="btn" data-a="savecourse" data-id="${c.id}" style="margin-top:14px">Save course</button>
    ${id !== 'new' ? `<button class="btn danger" data-a="delcourse" data-id="${c.id}">Delete course</button>` : ''}</div>`;
}
const teeRow = t => `<input class="tn" value="${esc(t.name)}" placeholder="Tee"><input class="tc" type="number" step="0.1" value="${t.cr}" placeholder="CR"><input class="ts" type="number" value="${t.slope}" placeholder="Slope"><button class="btn small sec" data-a="deltee">✕</button>
  <span class="mute xs">9-hole</span><input class="tcf" type="number" step="0.1" value="${t.cr9f ?? ''}" placeholder="F9 CR"><input class="tsf" type="number" value="${t.slope9f ?? ''}" placeholder="F9 Slope"><span></span>
  <span></span><input class="tcb" type="number" step="0.1" value="${t.cr9b ?? ''}" placeholder="B9 CR"><input class="tsb" type="number" value="${t.slope9b ?? ''}" placeholder="B9 Slope"><span></span>`;
function saveCourse(id) {
  const name = $('[data-f=cname]').value.trim();
  if (!name) return alert('Name required');
  const col = cls => [...document.querySelectorAll('#tees .' + cls)].map(e => e.value);
  const num = v => v === '' ? undefined : +v;
  const tees = col('tn').map((name, i) => ({ name: name.trim() || 'Tee', cr: +col('tc')[i], slope: +col('ts')[i] || 113,
    cr9f: num(col('tcf')[i]), slope9f: num(col('tsf')[i]), cr9b: num(col('tcb')[i]), slope9b: num(col('tsb')[i]) }));
  const g = cls => [...document.querySelectorAll('.' + cls)].map(e => +e.value);
  const p = g('hp'), s = g('hs'), y = g('hy');
  const holes = p.map((_, i) => [p[i] || 4, s[i] || i + 1, y[i] || 0]);
  const c = { id: id === 'new' ? uid() : id, name, city: $('[data-f=ccity]').value.trim(), holes, tees: tees.length ? tees : [{ name: 'Tee', cr: 72, slope: 113 }] };
  const i = S.courses.findIndex(x => x.id === c.id);
  if (i >= 0) S.courses[i] = c; else S.courses.push(c);
  sub = null; render();
}
const API_HOST = 'uk-golf-course-data-api.p.rapidapi.com';
async function api(path) {
  const r = await fetch('https://' + API_HOST + path, { headers: { 'x-rapidapi-key': S.settings.apiKey, 'x-rapidapi-host': API_HOST } });
  const d = await r.json();
  if (!r.ok || d.message) throw new Error(d.message || 'HTTP ' + r.status);
  return d;
}
async function apiSearch() {
  const key = $('[data-f=apiKey]').value.trim(), q = $('[data-f=q]').value.trim();
  S.settings.apiKey = key; save();
  const box = $('#results');
  if (!key || !q) { box.innerHTML = '<div class="msg">Enter an API key and a club name.</div>'; return; }
  box.innerHTML = '<div class="msg">Searching…</div>';
  try {
    window._apiResults = (await api('/clubs?search=' + encodeURIComponent(q))).clubs || [];
    box.innerHTML = window._apiResults.length ? `<div class="list">${window._apiResults.map((c, i) => `<a href="#" data-a="apiadd" data-i="${i}"><div><b>${esc(c.name)}</b><div class="mute sm">${esc(c.city || '')} · ${esc(c.county || '')}</div></div><span class="acc">Add</span></a>`).join('')}</div>` : '<div class="msg">No matches.</div>';
  } catch (e) { box.innerHTML = `<div class="msg">Search failed: ${esc(e.message)}</div>`; }
}
// Map one API course (with tee_sets[].holes) to our shape. Men's tees only: ladies' tees carry their own par/SI.
function courseFromApi(club, c) {
  const tees = (c.tee_sets || []).filter(t => t.gender !== 'Female' && t.holes && t.holes.length >= 18 && t.course_rating && t.slope_rating);
  if (!tees.length) return null;
  const holes = tees[0].holes.slice(0, 18).map((h, k) => [h.par || 4, h.stroke_index || k + 1, h.yardage || 0]);
  const name = c.name && !club.name.toLowerCase().includes(c.name.toLowerCase()) ? club.name + ' – ' + c.name : club.name;
  return { id: 'uk-' + c.id, name, city: club.address?.city || club.city || '', holes, tees: tees.map(t => ({ name: t.name, cr: +t.course_rating, slope: +t.slope_rating })) };
}
async function apiAdd(i) {
  const box = $('#results'); box.innerHTML = '<div class="msg">Fetching scorecard…</div>';
  try {
    const club = await api('/clubs/' + window._apiResults[i].id);
    let added = 0;
    for (const c of club.courses || []) {
      const course = courseFromApi(club, await api('/courses/' + c.id));
      if (course && !S.courses.some(x => x.id === course.id)) { S.courses.push(course); added++; }
    }
    if (!added) box.innerHTML = '<div class="msg">No rated 18-hole men\'s tees found; add it manually.</div>'; else render();
  } catch (e) { box.innerHTML = `<div class="msg">Failed: ${esc(e.message)}</div>`; }
}
function exportJson() {
  const a = document.createElement('a');
  a.href = 'data:application/json,' + encodeURIComponent(JSON.stringify(S));
  a.download = `gspot-${today()}.json`; a.click();
}
function importJson(file) {
  const fr = new FileReader();
  fr.onload = () => { try { const s = JSON.parse(fr.result); if (!s.rounds || !s.courses) throw 0; S = s; render(); } catch { alert('Not a gSpot backup'); } };
  fr.readAsText(file);
}

// ---------- events ----------
$('#nav').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { S.tab = b.dataset.tab; sub = null; render(); } });
$('#view').addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  e.preventDefault();
  const a = el.dataset.a, n = +el.dataset.n, id = el.dataset.id;
  const y = window.scrollY;
  const keep = () => window.scrollTo(0, y);
  switch (a) {
    case 'start': startRound(); break;
    case 'inc': bump(n, el.dataset.f, 1); keep(); break;
    case 'dec': bump(n, el.dataset.f, -1); keep(); break;
    case 'par': { const h = S.draft.holes.find(h => h.n === n); h.score = h.par; render(); keep(); break; }
    case 'tog': { const h = S.draft.holes.find(h => h.n === n), f = el.dataset.f; h[f] = h[f] === true ? false : h[f] === false ? null : true; render(); keep(); break; }
    case 'finish': finishRound(); window.scrollTo(0, 0); break;
    case 'discard': if (confirm('Discard this round?')) { S.draft = null; render(); } break;
    case 'open': sub = { view: 'round', id }; render(); window.scrollTo(0, 0); break;
    case 'back': sub = null; render(); break;
    case 'delround': if (confirm('Delete this round?')) { S.rounds = S.rounds.filter(r => r.id !== id); sub = null; render(); } break;
    case 'edit': sub = { view: 'edit', id }; render(); window.scrollTo(0, 0); break;
    case 'savecourse': saveCourse(id); break;
    case 'delcourse': if (confirm('Delete this course?')) { S.courses = S.courses.filter(c => c.id !== id); sub = null; render(); } break;
    case 'addtee': $('#tees').insertAdjacentHTML('beforeend', teeRow({ name: '', cr: 72, slope: 113 })); break;
    case 'deltee': { const cells = [...$('#tees').children]; const i = cells.indexOf(el); cells.slice(i - 3, i + 9).forEach(c => c.remove()); break; }
    case 'search': apiSearch(); break;
    case 'apiadd': apiAdd(+el.dataset.i); break;
    case 'export': exportJson(); break;
    case 'syncnow': syncNow(); break;
  }
});
$('#view').addEventListener('change', e => {
  const f = e.target.dataset.f;
  if (f === 'course') { S.settings.lastCourse = e.target.value; S.settings.lastTee = null; render(); }
  else if (f === 'tee') { S.settings.lastTee = e.target.value; render(); }
  else if (f === 'which') { S.settings.lastWhich = e.target.value; render(); }
  else if (f === 'calcCourse') { S.settings.calcCourse = e.target.value; S.settings.calcTee = null; render(); }
  else if (f === 'calcTee') { S.settings.calcTee = e.target.value; render(); }
  else if (f === 'statCourse') { S.settings.statCourse = e.target.value; render(); }
  else if (f === 'import' && e.target.files[0]) importJson(e.target.files[0]);
});
$('#view').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.f === 'q') apiSearch(); });

render();
pull().finally(() => { syncReady = true; if (sync.status === 'pending') push(); else schedulePush(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull(); });
window.addEventListener('online', () => { if (sync.status === 'pending') push(); });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js');
