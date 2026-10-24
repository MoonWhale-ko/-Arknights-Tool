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
out=dict(version=1,source='ArknightsAssets/ArknightsGamedata KR',revision='db6f9ef8046ad17dbebe3ff1d0dd88844a5bc78c',paradox=paradox,annihilation=annihilation)
(root/'workers/admin/public/orundum/catalog.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
print('Built',len(paradox),'paradox and',len(annihilation),'annihilation maps')
