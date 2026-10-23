import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from admin_refresh import catalog, migrate_aliases


def char(name, rarity='TIER_6', hidden=False):
    return {'name': name, 'rarity': rarity, 'isNotObtainable': hidden}


class AdminCatalogTests(unittest.TestCase):
    def test_name_changes_keep_old_names_and_aliases_without_overwriting_new_aliases(self):
        doc = {'aliases': {'비공식 이름': ['별칭'], '공식 이름': ['새 별칭']}}
        result = migrate_aliases(doc, [{'id': 'char_1', 'name': '비공식 이름'}], [{'id': 'char_1', 'name': '공식 이름'}])
        self.assertEqual(result['aliases'], {'공식 이름': ['새 별칭', '별칭', '비공식 이름']})
        self.assertEqual(migrate_aliases(result, [{'id': 'char_1', 'name': '비공식 이름'}], [{'id': 'char_1', 'name': '공식 이름'}]), result)

    def test_official_kr_names_win_and_future_candidates_are_not_auto_published(self):
        kr = {'character_table': {'char_1_a': char('공식 이름'), 'char_hidden': char('숨김', hidden=True)}}
        cn = {'character_table': {'char_1_a': char('原名'), 'char_2_b': char('新角色'), 'trap_1': char('장치')}}
        result = catalog(kr, cn, {'commit': 'snapshot'})
        self.assertEqual(result['operators'], [
            {'id': 'char_1_a', 'name': '공식 이름', 'rarity': 6, 'krReleased': True},
            {'id': 'char_2_b', 'name': '新角色', 'rarity': 6, 'krReleased': False},
        ])
        self.assertEqual(result['source'], {'commit': 'snapshot'})
