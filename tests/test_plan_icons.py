import unittest
from pathlib import Path
import xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parents[1]
ICONS=ROOT/'assets/icons/progress/plans'
def local(e):return e.tag.split('}')[-1]
class PlanIcons(unittest.TestCase):
 def test_potential_only_new_segments(self):
  for target in range(2,6):
   for current in range(1,target):
    svg=E.parse(ICONS/f'potential-p{target}-from-p{current}.svg').getroot()
    yellow=[e for e in svg if e.get('style')=='fill:#f1ca61']
    self.assertEqual(len(yellow),target-current)
    self.assertTrue(all(e.get('class') in ['st0','st1'] for e in yellow))
    self.assertEqual(len([e for e in svg if e.get('class')=='st2']),5)
 def test_potential_max_white_only_no_glow(self):
  svg=E.parse(ICONS/'potential-p6.svg').getroot()
  self.assertEqual(len([e for e in svg if e.get('fill')=='#03b2ff']),5)
  self.assertEqual(len([e for e in svg if e.get('fill')=='#f1ca61']),5)
  self.assertFalse(any(local(e) in ['filter','use'] for e in svg.iter()))
 def test_mastery_new_hexagons_only(self):
  for target in range(1,4):
   for current in range(target):
    svg=E.parse(ICONS/f'mastery-m{target}-from-m{current}.svg').getroot()
    groups=[e for e in svg if local(e)=='g']
    self.assertEqual(len([g for g in groups if all(e.get('style')=='fill:#f1ca61' for e in g)]),target-current)
    self.assertFalse(any(e.get('style') for e in svg if local(e) in ['path','polygon']))
    self.assertTrue(any(e.get('class')=='st1' for e in svg))
