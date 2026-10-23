#!/usr/bin/env python3
"""Refresh generated site data and a compact admin catalog from pinned public snapshots."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from update_data import FILES, REPOSITORY, ROOT, download, merged_characters
from concurrent.futures import ThreadPoolExecutor


def catalog(kr, cn, source):
    kr_chars = merged_characters(kr)
    cn_chars = merged_characters(cn)
    rows = []
    for cid, char in {**cn_chars, **kr_chars}.items():
        if not cid.startswith('char_') or char.get('isNotObtainable'):
            continue
        rows.append({'id': cid, 'name': char['name'],
                     'rarity': int(char['rarity'].split('_')[-1]),
                     'krReleased': cid in kr_chars and not kr_chars[cid].get('isNotObtainable')})
    return {'version': 1, 'source': source, 'operators': sorted(rows, key=lambda x: x['id'])}


def migrate_aliases(doc, before, after):
    """Keep search aliases when a CN placeholder becomes an official KR name."""
    current = {op['id']: op['name'] for op in after}
    current_names = set(current.values())
    for op in before:
        old = op['name']
        new = current.get(op['id'])
        if not new or new == old:
            continue
        previous = doc['aliases'].get(old, [])
        doc['aliases'][new] = list(dict.fromkeys(doc['aliases'].get(new, []) + previous + [old]))
        if old not in current_names:
            doc['aliases'].pop(old, None)
    return doc


def main():
    # A single Git commit pins both locales; never mix independently moving master URLs.
    meta = json.loads(download(f'https://api.github.com/repos/{REPOSITORY}/commits/master'))
    sha, date = meta['sha'], meta['commit']['committer']['date']
    with tempfile.TemporaryDirectory(prefix='arknights-admin-') as tmp:
        tmp = Path(tmp)
        def get(pair):
            locale, name = pair
            blob = download(f'https://raw.githubusercontent.com/{REPOSITORY}/{sha}/{locale}/gamedata/excel/{name}.json')
            return locale, name, blob
        pairs = [(locale, name) for locale in ('kr', 'cn') for name in FILES + ('char_patch_table',)]
        with ThreadPoolExecutor(max_workers=6) as pool:
            for locale, name, blob in pool.map(get, pairs):
                (tmp / locale).mkdir(exist_ok=True)
                (tmp / locale / (name + '.json')).write_bytes(blob)
        for locale in ('kr', 'cn'):
            (tmp / locale / 'source.json').write_text(json.dumps({'sha': sha, 'commit': {'committer': {'date': date}}}))
        images_path = ROOT / 'data/item-images.json'
        saved_images = json.loads(images_path.read_text())
        old_operators = json.loads((ROOT / 'data/operators.json').read_text())['operators']
        subprocess.run([sys.executable, str(ROOT / 'scripts/update_data.py'),
                        '--source-dir', str(tmp / 'kr'), '--commit', sha, '--source-date', date,
                        '--future-source-dir', str(tmp / 'cn')], cwd=ROOT, check=True)
        alias_path = ROOT / 'data/operator-aliases.json'
        aliases = migrate_aliases(json.loads(alias_path.read_text()), old_operators,
                                  json.loads((ROOT / 'data/operators.json').read_text())['operators'])
        alias_path.write_text(json.dumps(aliases, ensure_ascii=False, indent=2) + '\n')
        # Keep manually maintained URLs through future-data generation.
        images = json.loads(images_path.read_text())
        images['items'].update(saved_images['items'])
        items = json.loads((ROOT / 'data/items.json').read_text())['items']
        for iid, item in items.items():
            if iid not in images['items']:
                icon = item['iconId'].lower()
                images['items'][iid] = {'name': item['name'], 'iconId': item['iconId'],
                    'url': f'https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/items/icons/{icon}.png'}
        growth = json.loads((ROOT / 'data/growth.json').read_text())
        canonical_items = {**growth['items'], **items, **growth['tokenItems']}
        for iid, image in images['items'].items():
            if iid in canonical_items:
                image['name'] = canonical_items[iid]['name']
        images_path.write_text(json.dumps(images, ensure_ascii=False, separators=(',', ':')) + '\n')
        token_path = ROOT / 'data/token-image-sources.json'
        token_sources = json.loads(token_path.read_text())
        for item in token_sources['items']:
            if item['id'] in growth['tokenItems']:
                item['name'] = growth['tokenItems'][item['id']]['name']
        token_path.write_text(json.dumps(token_sources, ensure_ascii=False, indent=2) + '\n')
        subprocess.run([sys.executable, str(ROOT / 'scripts/build_base_optimizer_data.py'),
                        str(tmp / 'kr/building_data.json'), str(tmp / 'kr/character_table.json')], cwd=ROOT, check=True)
        subprocess.run([sys.executable, str(ROOT / 'scripts/update_account_favor.py')], cwd=ROOT, check=True)
        raw = {locale: {name: json.loads((tmp / locale / (name + '.json')).read_text())
                        for name in ('character_table', 'char_patch_table')} for locale in ('kr', 'cn')}
        payload = catalog(raw['kr'], raw['cn'], {'repository': REPOSITORY, 'commit': sha, 'updatedAt': date})
        (ROOT / 'data/admin-catalog.json').write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'Admin refresh prepared at {sha}; validation must pass before commit.')


if __name__ == '__main__':
    main()
