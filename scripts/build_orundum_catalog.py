"""Build private Orundum test inputs from pinned KR game tables, never player exports."""
import argparse,json,pathlib
parser=argparse.ArgumentParser();parser.add_argument('tables',type=pathlib.Path);args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
load=lambda name:json.loads((args.tables/(name+'.json')).read_text())
h=load('handbook_info_table');c=load('campaign_table');s=load('stage_table')['stages']
names=json.loads((root/'data/account-characters.json').read_text())['characters']
paradox=[]
for x in h['handbookStageData'].values():
 amount=sum(r['count']for r in x['rewardItem'] or [] if r['id']=='4003')
 if amount:paradox.append(dict(id=x['stageId'],charId=x['charId'],name=names.get(x['charId'],{}).get('name',x['charId']),title=x['name'],amount=amount,unlock=x['unlockParam'],start=x['stageGetTime']))
windows={sid:[]for sid in c['campaigns']}
def add(ids,w,kind):
 for sid in ids:
  if sid in windows:windows[sid].append(dict(start=w['startTs'],end=w['endTs'],kind=kind))
for w in c['campaignGroups'].values():add(w['activeCamps'],w,'상시 섬멸')
for w in c['campaignRotateStageOpenTimes']:add([w['stageId']],w,'섬멸 의뢰')
for w in c['campaignTrainingStageOpenTimes']:add(w['stages'],w,'섬멸 모의 작전')
rotateIds={w['stageId']for w in c['campaignRotateStageOpenTimes']}
for w in c['campaignTrainingAllOpenTimes']:add(rotateIds,w,'모의 작전 전면 개방')
annihilation=[]
for sid,x in c['campaigns'].items():
 rewards=[]
 for index,r in enumerate(x['breakLadders']):
  amount=sum(i['count']for i in r['rewards'] or [] if i['id']=='4003')
  if amount:rewards.append(dict(index=index,kills=r['killCnt'],amount=amount))
 if not rewards:continue
 st=s.get(sid,{})
 annihilation.append(dict(id=sid,name=st.get('name') or sid,region=st.get('code') or '',rewards=rewards,windows=windows[sid]))
m=load('mission_table');a=load('activity_table');check=load('checkin_table')
missionRewards=[]
for source in ['periodicalRewards','weeklyRewards']:
 groups={}
 for row in m[source].values():groups.setdefault(row['groupId'],[]).append(row)
 for gid,items in groups.items():
  threshold=0
  for row in sorted(items,key=lambda x:x['sortIndex']):
   threshold+=row['periodicalPointCost']
   missionRewards.append(dict(id=row['id'],group=gid,type=row['type'],cost=row['periodicalPointCost'],threshold=threshold,amount=sum(i['count']for i in row.get('rewards') or [] if i['id']=='4003'),start=row.get('beginTime',0),end=row.get('endTime',4102340399)))
events=[]
for aid,meta in a['basicInfo'].items():
 typ=meta['type'];body=a['activity'].get(typ,{}).get(aid) or a['dynActs'].get(aid) or {}
 rewards=[]
 for key,row in (body.get('checkInList') or {}).items():
  amount=sum(i['count']for i in row.get('itemList') or [] if i['id']=='4003')
  if amount:rewards.append(dict(index=int(key),order=row['order'],amount=amount))
 perDay=sum(i['count']for i in body.get('rewardItemPerDay') or [] if i['id']=='4003')
 if rewards or perDay or typ in ['PRAY_ONLY','FLOAT_PARADE','BLESS_ONLY']:events.append(dict(id=aid,type=typ,name=meta['name'],start=meta['startTime'],end=meta['endTime'],rewardEnd=meta['rewardEndTime'],rewards=rewards,perDay=perDay,days=body.get('dayCount',body.get('constData',{}).get('dayCount',0)),random=typ in ['PRAY_ONLY','FLOAT_PARADE','BLESS_ONLY']))
monthly=[]
for gid,g in check['groups'].items():
 rewards=[dict(index=i,amount=x['count'])for i,x in enumerate(g['items'])if x['itemId']=='4003']
 if rewards:monthly.append(dict(id=gid,start=g['signStartTime'],end=g['signEndTime'],rewards=rewards))
out=dict(version=2,source='ArknightsAssets/ArknightsGamedata KR',revision='db6f9ef8046ad17dbebe3ff1d0dd88844a5bc78c',paradox=paradox,annihilation=annihilation,missionRewards=missionRewards,dailyPeriods=m['dailyMissionPeriodInfo'],events=events,monthly=monthly,subscriptions=[v for rows in check['monthlySubItem'].values()for v in rows])
(root/'workers/admin/public/orundum/catalog.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
print('Built',len(paradox),'paradox and',len(annihilation),'annihilation maps')
