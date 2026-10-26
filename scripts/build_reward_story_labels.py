"""Extract reward labels from the pinned KR storyline ownership and zone metadata."""
import argparse,json,pathlib
parser=argparse.ArgumentParser();parser.add_argument('tables',type=pathlib.Path);args=parser.parse_args()
load=lambda name:json.loads((args.tables/(name+'_table.json')).read_text())
s,z,r,a=map(load,['stage','zone','retro','activity'])
lines={}
for line in s['storylines'].values():
 if line['storylineId']=='mainLine':continue
 for location in line['locations'].values():
  # BEFORE/AFTER links are recommendations, not membership in this storyline.
  if location['locationType']!='STORY_SET':continue
  story=s['storylineStorySets'].get(location.get('relevantStorySetId'),{})
  ss=story.get('ssData') or {}
  for key in [story.get('relevantActivityId'),ss.get('reopenActivityId'),ss.get('retroActivityId')]:
   if key:lines[key]=line['storylineName']
# Collab operations live outside the normal storyline list.
for key in ['act17d0','act1r6sre','act24side','act32side','act36side','act45side']:
 if key in a['basicInfo']:lines[key]='콜라보레이션'
for retro in r['retroActList'].values():
 label=lines.get(retro['retroId']) or next((lines[k] for k in retro['linkedActId'] if k in lines),None)
 if label:
  lines[retro['retroId']]=label
  for key in retro['linkedActId']:lines[key]=label
zones={}
for key,zone in z['zones'].items():
 if zone['type'] in ['MAINLINE','MAINLINE_RETRO'] and str(zone.get('zoneNameTitleCurrent','')).isdigit():
  zones[key]='메인 스토리 · '+str(int(zone['zoneNameTitleCurrent']))+'지역'
 else:
  activity=a['zoneToActivity'].get(key);retro=r['zoneToRetro'].get(key)
  label=lines.get(retro) or lines.get(activity)
  if label:zones[key]='사이드 스토리 · '+label
out=pathlib.Path(__file__).resolve().parents[1]/'workers/admin/public/mining/story-labels.mjs'
out.write_text('// Generated from KR stage/zone/retro/activity tables at db6f9ef; do not infer membership from BEFORE links.\nconst zones='+json.dumps(zones,ensure_ascii=False,separators=(',',':'))+';\nexport function storyLabel(stage){if(zones[stage.zone])return zones[stage.zone];if(stage.category===\'main\'&&/^main_\\d+$/.test(stage.groupId||\'\'))return \'메인 스토리 · \'+Number(stage.groupId.split(\'_\')[1])+\'지역\';return \'\';}\n')
print('Story labels:',len(zones),'zones')
