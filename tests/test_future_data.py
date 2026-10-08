import copy
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import update_future_data as updater


class FutureDataTests(unittest.TestCase):
    def setUp(self):
        self.docs = {n: json.loads((ROOT / 'data' / (n+'.json')).read_text())
                     for n in ('operators', 'items', 'professions', 'growth', 'item-images')}
        self.names = json.loads((ROOT / 'data/future-names.json').read_text())

    def test_real_future_records_and_shared_cost_references(self):
        future = [o for o in self.docs['operators']['operators'] if o.get('isFuture')]
        released = {o['id'] for o in self.docs['operators']['operators'] if not o.get('isFuture')}
        self.assertEqual({o['id'] for o in future}, set(self.names['operators']) - released)
        for o in future:
            self.assertEqual(o['name'], self.names['operators'][o['id']])
            self.assertEqual(o['dataLocale'], 'cn')
            self.assertFalse(o['nameIsOfficial'])
            self.assertIn(o['subProfessionId'], self.docs['professions']['professions'])
            token = self.docs['growth']['potentials'][o['id']]
            self.assertIn(token['id'], self.docs['growth']['tokenItems'])
            for alternative in token['alternatives']:
                self.assertIn(alternative['id'], self.docs['growth']['tokenItems'])
        by_id = {o['id']: o for o in future}
        for cid in ('char_1015_aglna2', 'char_1052_kalts2', 'char_4227_gallus', 'char_4215_buddy', 'char_4220_kormr', 'char_4234_pedro'):
            if cid in by_id:
                self.assertEqual(by_id[cid]['modules'], [])
        if 'char_4227_gallus' in by_id:
            self.assertEqual(len(by_id['char_4227_gallus']['phases']), 1)
        if 'char_4228_closur' in by_id:
            self.assertEqual(len(by_id['char_4228_closur']['skills']), 3)
            self.assertEqual(len(by_id['char_4228_closur']['modules']), 1)
        source = self.docs['operators']['futureSource']
        for doc in self.docs.values():
            self.assertEqual(doc['futureSource'], source)

    def test_kr_release_wins_and_future_refresh_is_repeatable(self):
        cid = 'char_4228_closur'
        official = next(o for o in self.docs['operators']['operators'] if o['id'] == cid)
        official.pop('isFuture', None)
        official.update(name='공식 한국어 이름', dataLocale='kr', nameIsOfficial=True)
        expected = copy.deepcopy(official)
        raw = {'item_table': {'items': {**self.docs['growth']['items'], **self.docs['items']['items']}},
               'uniequip_table': {'subProfDict': {}}}
        cn = copy.deepcopy(self.docs['operators']['operators'])
        growth = copy.deepcopy(self.docs['growth'])
        expected_count = sum(bool(o.get('isFuture')) for o in self.docs['operators']['operators'])
        with patch.object(updater, 'extract', return_value=(cn, {})), patch.object(updater, 'extract_growth', return_value=growth):
            self.assertEqual(updater.merge_future(raw, self.docs, self.names, {'locale': 'cn'}), expected_count)
            once = copy.deepcopy(self.docs)
            self.assertEqual(updater.merge_future(raw, self.docs, self.names, {'locale': 'cn'}), expected_count)
        self.assertEqual(self.docs, once)
        current = next(o for o in self.docs['operators']['operators'] if o['id'] == cid)
        self.assertEqual(current, expected)
        self.assertNotIn('isFuture', current)


if __name__ == '__main__':
    unittest.main()
