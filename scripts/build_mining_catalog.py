import json,pathlib,argparse
parser=argparse.ArgumentParser(description='Build the private mining test catalog from pinned KR game tables.')
parser.add_argument('tables',type=pathlib.Path,help='Directory containing stage/zone/activity/retro/medal_table.json')
args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]/'workers/admin/public/mining'
load=lambda n:json.load(open(args.tables/(n+'_table.json')))
s,z,a,r,m=map(load,['stage','zone','activity','retro','medal'])
rows={}
for sid,st in s['stages'].items():
 if st['stageType'] not in ['MAIN','SUB','DAILY','GUIDE','ACTIVITY','SPECIAL_STORY']:continue
 if not st.get('diamondOnceDrop',0):continue
 zone=z['zones'].get(st['zoneId'],{});act=a['basicInfo'].get(a['zoneToActivity'].get(st['zoneId']),{})
 cat='event' if st['stageType']=='ACTIVITY' else 'main' if st['stageType'] in ['MAIN','SUB'] else 'other'
 if cat=='event' and not act:continue
 v=s['stageValidInfo'].get(sid,{})
 rows[sid]=dict(id=sid,code=st['code'],name=st['name'],zone=st['zoneId'],group=act.get('name') or zone.get('zoneNameSecond') or st['zoneId'],category=cat,mode='험지 작전' if st['difficulty']=='SIX_STAR' else '강습' if st['difficulty']=='FOUR_STAR' else 'H 스테이지' if st['code'].startswith('H') else st.get('diffGroup') if st.get('diffGroup') not in [None,'NONE'] else '일반',op=st['diamondOnceDrop'],story=st.get('isStoryOnly',False),start=v.get('startTs',act.get('startTime',0)),end=v.get('endTs',act.get('endTime',-1)))
for row in rows.values():
 row['routes']=[dict(type='event' if row['category']=='event' else 'permanent',start=row['start'],end=row['end'])]
for sid,st in r['stageList'].items():
 if st.get('diamondOnceDrop',0)<=0:continue
 retroId=r['zoneToRetro'].get(st['zoneId']);retro=r['retroActList'].get(retroId);v=r['stageValidInfo'].get(sid,{})
 if not retro:continue
 previous=rows.get(sid,{})
 routes=previous.get('routes',[])+[dict(type='permanent',start=max(v.get('startTs',0),retro.get('startTime',0)),end=v.get('endTs',-1))]
 rows[sid]=dict(id=sid,code=st['code'],name=st['name'],zone=st['zoneId'],group=retro.get('name') or st['zoneId'],category='main' if retroId.startswith('permanent_main_') else 'side',mode='험지 작전' if st['difficulty']=='SIX_STAR' else 'H 스테이지' if st['code'].startswith('H') and not st['code'].startswith('HS') else '강습' if st['difficulty']=='FOUR_STAR' else '일반',op=st['diamondOnceDrop'],story=st.get('isStoryOnly',False),routes=routes,retroId=retroId,start=max(v.get('startTs',0),retro.get('startTime',0)),end=v.get('endTs',-1))
for row in rows.values():
 row['kind']='스토리' if row['story'] else '튜토리얼' if '-TR-' in row['code'] or row['code'].startswith('TR-') else '전투'
 if row['id'].startswith('act42side_'):
  row['availabilityHint']='복각 대기'
  row['hintNote']='11월 복각 예상 일정이 공유됨 · 공식 개방 시각 미확인'
  row['hintSource']='https://gall.dcinside.com/mgallery/board/view/?id=mibj&no=6167245'
 row['weekdays']=z['weeklyAdditionInfo'].get(row['zone'],{}).get('daysOfWeek')
rules=[]
for medal in m['medalList']:
 p=medal.get('unlockParam',[])
 if medal.get('template')=='PassStageSome' and len(p)==3 and p[0] in ['3','4']:
  ids=p[1].split(';')
  if int(p[2])==len(ids): rules.append(dict(id=medal['medalId'],stages=ids,count=len(ids)))
# Keep zero-OP prerequisites in the graph, but never in the reward total.
definitions={**s['stages'],**r['stageList']}
graph={sid:dict(code=st.get('code'),story=st.get('isStoryOnly',False),requires=st.get('unlockCondition') if isinstance(st.get('unlockCondition'),list) else []) for sid,st in definitions.items()}
# Zone entry gates are negative evidence only: launch events may temporarily bypass them.
for sid,node in graph.items():
 original=s['stages'].get(sid,{})
 zoneId=original.get('zoneId')
 zone=z['mainlineAdditionInfo'].get(zoneId,{})
 previous=z['mainlineAdditionInfo'].get(zone.get('preposedZoneId'),{})
 if previous.get('endStageId'):
  node['zoneRequires']=previous['endStageId']
  activity=a['basicInfo'].get(a['zoneToActivity'].get(zoneId),{})
  if activity.get('type')=='TYPE_MAINSS':node['entryWindow']=dict(start=activity['startTime'],end=activity['endTime'],requires='main_03-08')
completionLinks=[]
for group in s['diffGroupTable'].values():
 for higher,lower in [('toughId','normalId'),('normalId','easyId')]:
  if group.get(higher) and group.get(lower):completionLinks.append([group[higher],group[lower]])
for sid,st in definitions.items():
 if st.get('sixStarStageId'):completionLinks.append([st['sixStarStageId'],sid])
milestones=[]
simulation=[]
for gid,group in s['sixStarMilestoneInfo'].items():
 ids=group['stageIdList']
 simulation.append(dict(id=gid,stages=ids))
 for milestone in group['milestoneDataList']:
  if milestone.get('unlockStageId') in rows:rows[milestone['unlockStageId']]['pointGate']=dict(group=gid,point=milestone['nodePoint'])
  op=sum(x['count'] for x in milestone['rewardList'] if x['id']=='4002') if isinstance(milestone['rewardList'],list) else 0
  if not op:continue
  # Eligibility follows the union of the actual battle stage routes.
  routes=[]
  for sid in ids:
   for route in rows.get(sid,{}).get('routes',[]):
    if route not in routes:routes.append(route)
  first=rows[ids[0]]
  milestones.append(dict(id=milestone['id'],groupId=gid,threshold=milestone['nodePoint'],idType='milestone',op=op,code=f"{gid.split('_')[-1]}지역 누적 {milestone['nodePoint']}P",name='누적 별 포인트 보상',group=first['group'],category='main',mode='누적 보상',kind='누적 보상',story=False,routes=routes,start=0,end=-1))

(root/'catalog.json').write_text(json.dumps(dict(version=2,source='ArknightsAssets/ArknightsGamedata KR',revision='db6f9ef8046ad17dbebe3ff1d0dd88844a5bc78c',stages=list(rows.values()),medals=rules,forceOpen=list(s['forceOpenTable'].values()),graph=graph,completionLinks=completionLinks,milestones=milestones,simulation=simulation),ensure_ascii=False,separators=(',',':')))
print('Catalog',len(rows),'stages',len(rules),'medal rules')
