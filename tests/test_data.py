"""Integrity checks for the committed snapshot (no network required)."""
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class DataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ops_doc = json.loads((ROOT/'data/operators.json').read_text())
        cls.items_doc = json.loads((ROOT/'data/items.json').read_text())
        cls.ops = cls.ops_doc['operators']
        cls.items = cls.items_doc['items']

    def test_snapshot_and_references(self):
        self.assertEqual(self.ops_doc['source'], self.items_doc['source'])
        self.assertEqual(len(self.ops), len({o['id'] for o in self.ops}))
        self.assertGreater(len(self.ops), 400)
        used = set()
        for o in self.ops:
            rows = [p['evolveCost'] for p in o['phases']]
            rows += [s['cost'] for s in o['skillLevels']]
            rows += [m['cost'] for s in o['skills'] for m in s['mastery']]
            rows += [s['cost'] for m in o['modules'] for s in m['costs']]
            for row in rows:
                for item in row:
                    self.assertIn(item['id'], self.items)
                    self.assertGreater(item['count'], 0)
                    used.add(item['id'])
            for m in o['modules']:
                self.assertEqual([s['stage'] for s in m['costs']], [1,2,3])
                self.assertNotIn('001_', m['id'])
        self.assertEqual(used, set(self.items))

    def test_promotion_lmd_all_rarities(self):
        expected = {3:[10000],4:[15000,60000],5:[20000,120000],6:[30000,180000]}
        for o in self.ops:
            for p in o['phases'][1:]:
                self.assertEqual([x['count'] for x in p['evolveCost'] if x['id']=='4001'],
                                 [expected[o['rarity']][p['phase']-1]])

    def test_edge_cases(self):
        by_id = {o['id']:o for o in self.ops}
        self.assertEqual(by_id['char_285_medic2']['skills'], [])
        self.assertEqual(len(by_id['char_123_fang']['phases']), 2)
        self.assertEqual(by_id['char_123_fang']['skills'][0]['mastery'], [])
        gavial = by_id['char_1026_gvial2']
        self.assertEqual(len(gavial['skills']), 3)
        self.assertEqual([m['type'] for m in gavial['modules']], ['X','Y'])
        self.assertTrue(all(m['missions'] for m in gavial['modules']))
        self.assertIn('D', {m['type'] for o in self.ops for m in o['modules']})

if __name__ == '__main__':
    unittest.main()
