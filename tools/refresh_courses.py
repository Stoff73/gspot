#!/usr/bin/env python3
"""Refresh courses.js from the UK Golf Course Data API (rapidapi.com).

  UKGOLF_API_KEY=your-rapidapi-key python3 tools/refresh_courses.py

Fetches every club listed in CLUBS, keeps men's 18-hole tee sets with a rating, and rewrites courses.js.
Courses whose id starts with "manual-" in the existing courses.js are kept as they are (no API data for them).
Free plan is rate-limited per minute, so calls are spaced ~13s apart: expect 5-6 minutes for eight clubs.
"""
import json, os, re, subprocess, sys, time, urllib.parse

CLUBS = ['Westerham', 'Woldingham', 'Poult Wood', 'Darenth Valley', 'Wildernesse', 'Nizels', 'Surrey National', 'Royal Blackheath']
HOST = 'uk-golf-course-data-api.p.rapidapi.com'
KEY = os.environ.get('UKGOLF_API_KEY') or (sys.argv[1] if len(sys.argv) > 1 else '')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'courses.js')
if not KEY: sys.exit('Set UKGOLF_API_KEY or pass the key as the first argument')

def get(path):
    for _ in range(6):
        raw = subprocess.run(['curl', '-s', f'https://{HOST}{path}', '-H', f'x-rapidapi-key: {KEY}', '-H', f'x-rapidapi-host: {HOST}'],
                             capture_output=True, text=True).stdout
        try: d = json.loads(raw)
        except ValueError: d = {'message': 'bad response: ' + raw[:80]}
        if isinstance(d, dict) and 'rate limit' in str(d.get('message', '')):
            print('  rate limited, waiting 30s', file=sys.stderr); time.sleep(30); continue
        time.sleep(13)
        return d
    sys.exit('gave up on ' + path)

def course_name(club, c):
    n = c.get('name') or ''
    name = club['name'] if not n or n.lower() in club['name'].lower() else f"{club['name']} – {n}"
    name = name.replace('Poult Wood Golf Club – Poult Wood Golf Centre', 'Poult Wood').replace('The Woldingham Golf Club', 'Woldingham Golf Club')
    return 'Poult Wood 9 Hole (played twice)' if name == 'Poult Wood 9 Hole' else name

# existing manual entries survive
manual = []
if os.path.exists(OUT):
    js = open(OUT).read()
    start = js.index('[', js.index('SEED_COURSES'))
    manual = [c for c in json.loads(js[start:js.rindex(']') + 1]) if c['id'].startswith('manual-')]

courses = {}
for q in CLUBS:
    hits = get('/clubs?search=' + urllib.parse.quote(q)).get('clubs', [])
    print(q, '->', [h['name'] for h in hits], file=sys.stderr)
    if not hits: continue
    club = get('/clubs/' + hits[0]['id'])
    for c in club.get('courses', []):
        full = get('/courses/' + c['id'])
        tees = [t for t in full.get('tee_sets', []) if t.get('gender') != 'Female' and t.get('holes') and len(t['holes']) >= 18
                and t.get('course_rating') and t.get('slope_rating')]
        if not tees: print('  no usable tees for', full.get('name'), file=sys.stderr); continue
        holes = [[h['par'], h['stroke_index'], h['yardage']] for h in sorted(tees[0]['holes'][:18], key=lambda h: h['hole_number'])]
        par = sum(h[0] for h in holes)
        name = course_name(club, full)
        cur = courses.setdefault(name, {'id': 'uk-' + full['id'], 'name': name, 'city': club['address'].get('city') or '', 'holes': holes, 'tees': []})
        for t in tees:
            tn = re.sub(r'\s*\(updated\)|\s*20\d\d|\s*\.$', '', t['name']).strip()
            if t['course_rating'] < par - 12: continue  # a 9-hole tee attached to the 18-hole course
            if any(x['name'] == tn for x in cur['tees']): continue
            cur['tees'].append({'name': tn, 'cr': t['course_rating'], 'slope': t['slope_rating']})

# keep the club order from CLUBS, manual entries slotted where their name matches
ordered = []
for q in CLUBS:
    ordered += [c for c in courses.values() if q.lower().split()[0] in c['name'].lower() and c not in ordered]
    ordered += [c for c in manual if q.lower().split()[0] in c['name'].lower() and c not in ordered]
ordered += [c for c in list(courses.values()) + manual if c not in ordered]

def fmt(c):
    holes = ',\n   '.join(json.dumps(h) for h in c['holes'])
    tees = ',\n   '.join(json.dumps(t, ensure_ascii=False) for t in c['tees'])
    return '{ "id": %s, "name": %s, "city": %s,\n  "holes": [\n   %s\n  ],\n  "tees": [\n   %s\n  ] }' % (
        json.dumps(c['id']), json.dumps(c['name'], ensure_ascii=False), json.dumps(c['city']), holes, tees)

open(OUT, 'w').write(
    f"// Seed courses from the UK Golf Course Data API (rapidapi.com), refreshed {time.strftime('%Y-%m-%d')} by tools/refresh_courses.py. Men's tee sets only.\n"
    "// Entries with a manual- id are hand-entered (no scorecard in the API) and are preserved by the refresh script.\n"
    "// Hole arrays: 18 x [par, strokeIndex, yards from the first listed tee]. Tees: {name, cr, slope}.\n"
    "window.SEED_COURSES = [\n " + ',\n '.join(fmt(c) for c in ordered) + "\n];\n")
for c in ordered: print(c['name'], 'par', sum(h[0] for h in c['holes']), [(t['name'], t['cr'], t['slope']) for t in c['tees']])
print(len(ordered), 'courses written to', OUT)
