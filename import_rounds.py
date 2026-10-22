# Builds gspot-import.json from paper cards. The app scores rounds that lack a differential on import (app.js normalise()).
# 'tee' must be the tee actually played: CR/Slope come from it. Surrey National (Yellow), Wildernesse (White), Poult Wood (Yellow) confirmed by CSJ 2026-10-15.
# Royal Blackheath (Purple), Westerham (White, card total 98 as entered) confirmed by CSJ 2026-10-22.
import json, re
from pathlib import Path

base = Path(__file__).resolve().parent
text = (base / 'courses.js').read_text()
seed = json.loads(re.search(r'window\.SEED_COURSES\s*=\s*(\[.*\]);', text, re.S).group(1))
by_name = {c['name']: c for c in seed}

records = [
    {
        'date': '2026-05-15', 'course': 'Westerham Golf Club', 'tee': 'White', 'hcp': 16,
        'name': 'Kantar Epic 2', 'front': [[6,1],[5,2],[6,2],[4,1],[5,3],[5,3],[7,0],[4,2],[5,2]],
        'back': [[6,2],[4,2],[5,2],[6,0],[6,1],[7,0],[7,0],[5,2],[5,2]],
    },
    {
        'date': '2026-06-28', 'course': 'Surrey National Golf Club', 'tee': 'Yellow', 'hcp': 16,
        'name': 'Mozzies vs Lemon & Herb', 'front': [[4,3],[5,2],[3,3],[5,2],[5,2],[5,2],[4,1],[4,3],[5,2]],
        'back': [[4,3],[6,1],[6,2],[3,2],[6,2],[5,2],[5,2],[4,3],[5,2]],
    },
    {
        'date': '2026-07-14', 'course': 'Royal Blackheath Golf Club', 'tee': 'Purple', 'hcp': 22,
        'name': "Chris's Individual Game", 'front': [[7,1],[6,2],[4,4],[4,2],[7,0],[6,2],[5,2],[5,1],[5,2]],
        'back': [[7,0],[4,3],[4,2],[7,1],[4,4],[4,3],[4,2],[5,3],[6,1]],
    },
    {
        'date': '2026-07-20', 'course': 'Wildernesse Golf Club', 'tee': 'White', 'hcp': 20,
        'name': "Chris's Individual Game", 'front': [[4,3],[5,2],[6,2],[5,2],[4,2],[5,3],[6,1],[5,2],[6,1]],
        'back': [[3,3],[6,2],[7,1],[2,4],[4,3],[5,1],[4,4],[6,1],[5,3]],
    },
    {
        'date': '2026-07-22', 'course': 'Poult Wood', 'tee': 'Yellow', 'hcp': 17,
        'name': "Chris's Individual Game", 'front': [[5,2],[6,1],[5,2],[7,1],[2,4],[6,1],[5,1],[5,2],[6,1]],
        'back': [[5,2],[6,1],[4,2],[5,2],[3,3],[5,2],[5,1],[4,2],[6,1]],
    },
    {
        'date': '2026-08-22', 'course': 'Wildernesse Golf Club', 'tee': 'White', 'hcp': 20,
        'name': "Chris's Individual Game", 'front': [[4,3],[5,2],[5,3],[5,2],[4,2],[5,3],[6,1],[3,4],[5,2]],
        'back': [[3,3],[6,2],[8,0],[3,3],[5,2],[4,2],[5,3],[6,1],[6,2]],
    },
]

rounds = []
for i, rec in enumerate(records, 1):
    course = by_name[rec['course']]
    tee = next(t for t in course['tees'] if t['name'] == rec['tee'])
    pairs = rec['front'] + rec['back']
    holes = []
    for n, ((score, putts), spec) in enumerate(zip(pairs, course['holes']), 1):
        holes.append({'n': n, 'par': spec[0], 'si': spec[1], 'yds': spec[2], 'rank': spec[1], 'score': score, 'putts': putts, 'fir': None, 'gir': None})
    rounds.append({
        'id': f'import-{i}-{rec["date"]}', 'date': rec['date'], 'courseId': course['id'],
        'courseName': course['name'], 'teeName': tee['name'],
        'cr': tee['cr'], 'slope': tee['slope'],
        'par': sum(h[0] for h in course['holes']), 'nHoles': 18, 'which': 'all', 'pcc': 0,
        'courseHcp': rec['hcp'], 'holes': holes,
        'gross': sum(x[0] for x in pairs), 'putts': sum(x[1] for x in pairs),
        'sourceGameName': rec['name'], 'sourceHcp': rec['hcp'],
    })

state = {'courses': seed, 'rounds': rounds, 'settings': {}, 'draft': None, 'tab': 'rounds'}
(base / 'gspot-import.json').write_text(json.dumps(state, indent=2))
print(json.dumps({'courses': len(seed), 'rounds': len(rounds), 'holes': sum(len(r['holes']) for r in rounds), 'path': str(base / 'gspot-import.json')}))
