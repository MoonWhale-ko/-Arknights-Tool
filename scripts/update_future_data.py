#!/usr/bin/env python3
"""Add named CN operators absent from the bundled KR snapshot, using stable IDs."""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
from update_data import FILES, REPOSITORY, ROOT, download, extract, extract_growth


def merge_future(raw, docs, names, source):
    # Rebuild the overlay; KR entries always win, including newly released units.
    kr = [o for o in docs['operators']['operators'] if not o.get('isFuture')]
    kr_ids = {o['id'] for o in kr}
    cn, _ = extract(raw)
    by_id = {o['id']: o for o in cn}
    future = []
    for cid, name in names['operators'].items():
        if cid in kr_ids:
            continue
        op = by_id[cid]
        op.update(name=name, originalName=op['name'], isFuture=True,
                  dataLocale='cn', nameIsOfficial=False)
        future.append(op)
    used = set()
    for op in future:
        rows = [p['evolveCost'] for p in op['phases']]
        rows += [s['cost'] for s in op['skillLevels']]
        rows += [m['cost'] for s in op['skills'] for m in s['mastery']]
        rows += [s['cost'] for m in op['modules'] for s in m['costs']]
        used.update(x['id'] for row in rows for x in row)
    cn_items = {i: {'id': i, 'name': raw['item_table']['items'][i]['name'],
                    'iconId': raw['item_table']['items'][i]['iconId'], 'nameLocale': 'cn'}
                for i in used}
    for cid, name in names.get('items', {}).items():
        if cid in cn_items:
            cn_items[cid].update(name=name, nameLocale='ko-unofficial')
    growth = extract_growth(raw, cn_items)
    # The shared level-cost tables must agree before we use KR tables for future units.
    for key in ('levelExp', 'levelGold', 'expItems'):
        assert growth[key] == docs['growth'][key], f'CN/KR {key} differs'
    docs['operators']['operators'] = sorted(kr + future, key=lambda o: (o['name'], o['id']))
    for cid in names['operators']:
        if cid not in kr_ids:
            docs['growth']['potentials'].pop(cid, None)
    for op in future:
        cid = op['id']
        if cid in growth['potentials']:
            token = growth['potentials'][cid]
            docs['growth']['potentials'][cid] = token
            for tid in [token['id']] + [a['id'] for a in token['alternatives']]:
                info = growth['tokenItems'][tid].copy()
                if tid == token['id']:
                    info['name'] = op['name'] + '의 증표'
                    info['isFuture'] = True
                docs['growth']['tokenItems'].setdefault(tid, info)
        branch = op['subProfessionId']
        if branch not in docs['professions']['professions']:
            docs['professions']['professions'][branch] = names['professions'].get(branch) or raw['uniequip_table']['subProfDict'][branch]['subProfessionName']
    for key, value in growth['items'].items():
        info = {**value, 'nameLocale': 'cn'}
        if key in names.get('items', {}):
            info.update(name=names['items'][key], nameLocale='ko-unofficial')
        if docs['growth']['items'].get(key, {}).get('nameLocale'):
            docs['growth']['items'][key] = info
        else:
            docs['growth']['items'].setdefault(key, info)
    for key, value in growth['recipes'].items():
        docs['growth']['recipes'].setdefault(key, value)
    docs['items']['items'].update({k: v for k, v in cn_items.items()
                                 if k not in docs['items']['items'] or docs['items']['items'][k].get('nameLocale')})
    # Drop material references no longer used after a previous future snapshot.
    all_used = set()
    for op in docs['operators']['operators']:
        rows = [p['evolveCost'] for p in op['phases']] + [s['cost'] for s in op['skillLevels']]
        rows += [m['cost'] for s in op['skills'] for m in s['mastery']]
        rows += [s['cost'] for m in op['modules'] for s in m['costs']]
        all_used.update(x['id'] for row in rows for x in row)
    docs['items']['items'] = {i: docs['items']['items'][i] for i in sorted(all_used)}
    for doc in docs.values():
        doc['futureSource'] = source
    for cid, item in docs['items']['items'].items():
        if cid not in docs['item-images']['items'] or item.get('nameLocale'):
            url = 'https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/items/icons/'+item['iconId'].lower()+'.png'
            docs['item-images']['items'][cid] = {'name': item['name'], 'url': url,
                'referenceUrl': url, 'iconId': item['iconId']}
    return len(future)


def update_future(output_dir, source_dir=None, ref='master'):
    names = json.loads((ROOT / 'data/future-names.json').read_text())
    if source_dir:
        meta = json.loads((source_dir / 'source.json').read_text())
        blobs = {n: (source_dir / (n+'.json')).read_bytes() for n in FILES}
    else:
        meta = json.loads(download(f'https://api.github.com/repos/{REPOSITORY}/commits/{ref}'))
        def get(n):
            return n, download(f'https://raw.githubusercontent.com/{REPOSITORY}/{meta["sha"]}/cn/gamedata/excel/{n}.json')
        with concurrent.futures.ThreadPoolExecutor(max_workers=7) as pool:
            blobs = dict(pool.map(get, FILES))
    source = {'repository': REPOSITORY, 'locale': 'cn', 'commit': meta['sha'],
              'updatedAt': meta['commit']['committer']['date'], 'nameSource': names['nameSource'],
              'sha256': {n+'.json': hashlib.sha256(b).hexdigest() for n, b in blobs.items()}}
    docs = {n: json.loads((output_dir / (n+'.json')).read_text())
            for n in ('operators', 'items', 'professions', 'growth', 'item-images')}
    count = merge_future({n: json.loads(b) for n, b in blobs.items()}, docs, names, source)
    for n, doc in docs.items():
        target = output_dir / (n+'.json')
        temp = target.with_suffix('.json.tmp')
        temp.write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':'))+'\n')
        temp.replace(target)
    print(f'{count} future operators; CN source {meta["sha"]}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path)
    parser.add_argument('--ref', default='master')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'data')
    args = parser.parse_args()
    update_future(args.output_dir, args.source_dir, args.ref)
