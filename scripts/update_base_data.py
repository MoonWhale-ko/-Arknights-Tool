"""Extract KR base skills; input paths are optional local snapshots for reproducibility."""
import argparse
import datetime
import json
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = 'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master/kr/gamedata/excel/'


def load(path, name):
    if path:
        return json.loads(pathlib.Path(path).read_text())
    with urllib.request.urlopen(SOURCE + name, timeout=60) as response:
        return json.load(response)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--building')
    p.add_argument('--characters')
    args = p.parse_args()
    b = load(args.building, 'building_data.json')
    chars = load(args.characters, 'character_table.json')
    ops = json.loads((ROOT / 'data/operators.json').read_text())['operators']
    result = {'source': SOURCE + 'building_data.json', 'server': 'KR',
              'updatedAt': datetime.datetime.now(datetime.timezone.utc).date().isoformat(),
              'rooms': {}, 'buffs': {}, 'operators': [],
              'constants': {k: b[k] for k in ['controlData', 'manufactData', 'tradingData', 'powerData', 'dormData', 'hireData', 'meetingData', 'manufactManpowerCostByNum', 'tradingManpowerCostByNum', 'manpowerDisplayFactor', 'comfortManpowerRecoverFactor', 'manufactStationBuff', 'laborRecoverTime']},
              'formulas': {k: b['manufactFormulas'][k] for k in ['1', '2', '3', '4']}}
    for k, v in b['rooms'].items():
        result['rooms'][k] = {'name': v['name'], 'maxCount': v.get('maxCount', 1),
                            'phases': [{n: x[n] for n in ['maxStationedNum', 'electricity', 'manpowerCost']} for x in v['phases']]}
    for op in ops:
        base_id = op.get('baseId') or op['id']
        if op.get('isFuture') or base_id not in b['chars'] or op.get('baseId'):
            continue
        slots = []
        for slot in b['chars'][base_id]['buffChar']:
            data = slot.get('buffData')
            if not isinstance(data, list):
                continue
            steps = []
            for step in data:
                bid = step['buffId']
                v = b['buffs'][bid]
                desc = re.sub(r'<[^>]*>', '', v['description']).replace('&nbsp;', ' ')
                result['buffs'][bid] = {k: v[k] for k in ['buffName', 'roomType']}
                result['buffs'][bid]['description'] = desc
                steps.append({'id': bid, 'elite': int(step['cond']['phase'].split('_')[-1]), 'level': step['cond']['level']})
            slots.append(steps)
        meta = chars[base_id]
        result['operators'].append({'id': base_id, 'name': op['name'], 'rarity': op['rarity'],
                                    'maxLevels': [x['maxLevel'] for x in op['phases']],
                                    'tags': list(filter(None, [meta.get(k) for k in ['teamId', 'groupId', 'nationId', 'subProfessionId']])),
                                    'skills': slots})
    (ROOT / 'data/base.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f"Extracted {len(result['operators'])} operators and {len(result['buffs'])} skills")


if __name__ == '__main__':
    main()
