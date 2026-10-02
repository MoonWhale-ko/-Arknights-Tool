#!/usr/bin/env python3
"""Refresh the small trust conversion table from the operator snapshot commit."""
import hashlib
import json
from pathlib import Path
import urllib.request
root = Path(__file__).resolve().parents[1]
source = json.loads((root / 'data/operators.json').read_text())['source']
url = f"https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/{source['commit']}/kr/gamedata/excel/favor_table.json"
raw = urllib.request.urlopen(url, timeout=30).read()
frames = [{'points': f['data']['favorPoint'], 'percent': f['data']['percent']} for f in json.loads(raw)['favorFrames']]
assert frames[0] == {'points': 0, 'percent': 0} and frames[-1]['percent'] == 200
assert all(a['points'] < b['points'] and a['percent'] < b['percent'] for a, b in zip(frames, frames[1:]))
result = {'version': 1, 'source': {k: source[k] for k in ('repository', 'locale', 'commit')}, 'frames': frames}
result['source']['sha256'] = hashlib.sha256(raw).hexdigest()
(root / 'data/account-favor.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
