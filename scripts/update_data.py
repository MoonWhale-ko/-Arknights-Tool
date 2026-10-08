#!/usr/bin/env python3
"""Extract a pinned KR snapshot. Python 3 standard library only."""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.request

REPOSITORY = 'ArknightsAssets/ArknightsGamedata'
FILES = ('character_table', 'item_table', 'skill_table', 'uniequip_data',
         'uniequip_table', 'gamedata_const', 'building_data')
ROOT = Path(__file__).resolve().parents[1]


def download(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Arknights-Tool-data-updater'})
    with urllib.request.urlopen(req, timeout=120) as response:
        return response.read()


def extract(raw):
    chars, items, skills = (raw[n] for n in FILES[:3])
    # uniequip_data is a legacy prototype, NOT a fallback for current KR modules.
    assert isinstance(raw['uniequip_data']['equipDict'], dict)
    modules = raw['uniequip_table']
    gold = raw['gamedata_const']['evolveGoldCost']
    used = set()

    def cost(entries):
        result = []
        for entry in entries or []:
            key, count = str(entry['id']), entry['count']
            assert key in items['items'], f'Unknown item: {key}'
            assert isinstance(count, int) and count > 0, entry
            used.add(key)
            result.append({'id': key, 'count': count, 'type': entry['type']})
        return result

    operators = []
    for cid, c in chars.items():
        if not cid.startswith('char_') or c['isNotObtainable']:
            continue
        rarity = int(c['rarity'].split('_')[1])
        op = {k: c[k] for k in ('name', 'profession', 'subProfessionId', 'maxPotentialLevel')}
        op.update(id=cid, rarity=rarity, phases=[], skillLevels=[], skills=[], modules=[])
        for phase, p in enumerate(c['phases']):
            entries = list(p['evolveCost'] or [])
            lmd = gold[rarity - 1][phase - 1] if phase else 0
            assert lmd >= 0, (cid, phase)
            if lmd:
                assert not any(str(e['id']) == '4001' for e in entries)
                entries.append({'id': '4001', 'count': lmd, 'type': 'GOLD'})
            op['phases'].append({'phase': phase, 'maxLevel': p['maxLevel'],
                                 'evolveCost': cost(entries)})
        for i, level in enumerate(c['allSkillLvlup']):
            op['skillLevels'].append({'from': i+1, 'to': i+2,
                'unlockCondition': level['unlockCond'], 'cost': cost(level['lvlUpCost'])})
        for i, s in enumerate(c['skills']):
            if not s['skillId']:
                continue
            sk = {'index': i+1, 'id': s['skillId'],
                  'name': skills[s['skillId']]['levels'][0]['name'],
                  'unlockPhase': s['unlockCond']['phase'],
                  'unlockCondition': s['unlockCond'], 'mastery': []}
            for j, m in enumerate(s['levelUpCostCond']):
                sk['mastery'].append({'level': j+1, 'time': m['lvlUpTime'],
                    'unlockCondition': m['unlockCond'], 'cost': cost(m['levelUpCost'])})
            op['skills'].append(sk)
        for mid in modules['charEquip'].get(cid, []):
            m = modules['equipDict'][mid]
            assert m['charId'] == cid
            if m['type'] == 'INITIAL':
                continue
            assert m['type'] == 'ADVANCED' and m['itemCost'], mid
            missions = [modules['missionList'][key] for key in m['missionList']]
            op['modules'].append({'id': mid, 'name': m['uniEquipName'],
                'type': m['typeName2'], 'typeIcon': m['typeIcon'],
                'unlockPhase': m['unlockEvolvePhase'], 'unlockLevel': m['unlockLevel'],
                'unlockFavorPointsByStage': m['unlockFavors'],
                'missions': [{'id': x['uniEquipMissionId'], 'description': x['desc'],
                              'stageId': x['jumpStageId']} for x in missions],
                'costs': [{'stage': int(stage), 'cost': cost(entries)}
                          for stage, entries in sorted(m['itemCost'].items(), key=lambda x: int(x[0]))]})
        operators.append(op)
    operators.sort(key=lambda x: (x['name'], x['id']))
    compact_items = {key: {'id': key, 'name': items['items'][key]['name'],
                          'iconId': items['items'][key]['iconId']} for key in sorted(used)}
    assert operators and compact_items
    return operators, compact_items


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ref', default='master', help='Upstream ref; resolved to one immutable commit')
    parser.add_argument('--source-dir', type=Path, help='Read downloaded files; requires --commit and --source-date')
    parser.add_argument('--commit')
    parser.add_argument('--source-date')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'data')
    parser.add_argument('--future-source-dir', type=Path, help='Optional pinned CN files with source.json')
    args = parser.parse_args()
    if args.source_dir:
        if not args.commit or not args.source_date:
            parser.error('--source-dir requires --commit and --source-date')
        sha, date = args.commit, args.source_date
        blobs = {n: (args.source_dir / (n+'.json')).read_bytes() for n in FILES}
    else:
        meta = json.loads(download(f'https://api.github.com/repos/{REPOSITORY}/commits/{args.ref}'))
        sha, date = meta['sha'], meta['commit']['committer']['date']
        def get(name):
            return name, download(f'https://raw.githubusercontent.com/{REPOSITORY}/{sha}/kr/gamedata/excel/{name}.json')
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            blobs = dict(pool.map(get, FILES))
    ops, items = extract({n: json.loads(b) for n, b in blobs.items()})
    growth = extract_growth({n: json.loads(b) for n, b in blobs.items()}, items)
    metadata = {'version': 2, 'source': {'repository': REPOSITORY, 'locale': 'kr',
        'commit': sha, 'updatedAt': date,
        'sha256': {n+'.json': hashlib.sha256(b).hexdigest() for n, b in blobs.items()}}}
    # Validate the entire snapshot before touching either output. No download at page runtime.
    args.output_dir.mkdir(parents=True, exist_ok=True)
    branches = json.loads(blobs['uniequip_table'])['subProfDict']
    professions = {o['subProfessionId']: branches[o['subProfessionId']]['subProfessionName'] for o in ops}
    for name, payload in [('operators', ops), ('items', items), ('professions', professions)]:
        target = args.output_dir / (name+'.json')
        temp = target.with_suffix('.json.tmp')
        temp.write_text(json.dumps({**metadata, name: payload}, ensure_ascii=False,
                                   separators=(',', ':'))+'\n', encoding='utf-8')
        temp.replace(target)
    target = args.output_dir / 'growth.json'
    temp = target.with_suffix('.json.tmp')
    temp.write_text(json.dumps({**metadata, **growth}, ensure_ascii=False,
                              separators=(',', ':'))+'\n', encoding='utf-8')
    temp.replace(target)
    print(f'{len(ops)} operators, {len(items)} items, {sum(len(o["modules"]) for o in ops)} modules; source {sha}')
    if (ROOT / 'data/future-names.json').exists():
        from update_future_data import update_future
        update_future(args.output_dir, args.future_source_dir, args.ref)


def extract_growth(raw, site_items):
    """Level costs and relevant recipes, including their ingredient closure."""
    building = raw['building_data']
    source_items = raw['item_table']['items']
    needed = set(site_items) | set(raw['item_table']['expItems'])
    formulas = []
    for key, room in [('workshopFormulas', 'WORKSHOP'), ('manufactFormulas', 'MANUFACTURE')]:
        for f in building[key].values():
            # Keep training-material recipes and chip conversions, excluding free production.
            if not f['costs'] or f['formulaType'] not in ('F_EVOLVE', 'F_SKILL', 'F_ASC'):
                continue
            formulas.append({'id': room+':'+f['formulaId'], 'itemId': f['itemId'],
                'count': f['count'], 'cost': f['costs'], 'goldCost': f.get('goldCost', 0),
                'room': room, 'requirements': f['requireRooms'],
                'stages': f['requireStages'] or []})
    recipes = {}
    while True:
        before = len(needed)
        for f in formulas:
            if f['itemId'] in needed:
                recipes.setdefault(f['itemId'], {})[f['id']] = f
                needed.update(str(x['id']) for x in f['cost'])
        if len(needed) == before:
            break
    compact = {key: {'id': key, 'name': source_items[key]['name'],
                    'iconId': source_items[key]['iconId']} for key in sorted(needed)}
    const = raw['gamedata_const']
    potentials, token_items = {}, {}
    for cid, c in raw['character_table'].items():
        if not cid.startswith('char_') or c['isNotObtainable']:
            continue
        activity = bool(c['canUseActivityPotentialItem'] and c['activityPotentialItemId'])
        token = c['potentialItemId'] or (c['activityPotentialItemId'] if activity else None)
        if not token or token not in source_items:
            continue
        alternatives = []
        if c['canUseGeneralPotentialItem']:
            rarity = str(int(c['rarity'].split('_')[1])-1)
            general = raw['item_table']['potentialItems'][rarity][c['profession']]
            if general in source_items:
                alternatives.append({'id': general, 'count': const['commonPotentialLvlUpCount']})
        potentials[cid] = {'id': token, 'activity': activity, 'alternatives': alternatives}
        for key in [token] + [a['id'] for a in alternatives]:
            i = source_items[key]
            token_items[key] = {'id': key, 'name': i['name'], 'iconId': i['iconId'], 'category': 'potential',
                                'rarity': int(i['rarity'].split('_')[1])}
    return {'levelExp': const['characterExpMap'], 'levelGold': const['characterUpgradeCostMap'],
        'expItems': {key: v['gainExp'] for key, v in raw['item_table']['expItems'].items()},
        'items': compact, 'recipes': {key: list(v.values()) for key, v in recipes.items()},
        'potentials': potentials, 'tokenItems': token_items}


if __name__ == '__main__':
    main()
