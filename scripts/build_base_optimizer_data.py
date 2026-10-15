"""Bundle pinned KR game data for the offline base planner (no runtime upstream fetch)."""
import argparse, hashlib, json, pathlib, re

def build(building_path, characters_path, output):
    raw=pathlib.Path(building_path).read_bytes(); b=json.loads(raw)
    chars=json.loads(pathlib.Path(characters_path).read_text())
    local=json.loads(pathlib.Path('data/operators.json').read_text())['operators']
    groups={o['id']:o.get('sharedGroup',o['id']) for o in local}
    result={'version':1,'source':{'repository':'ArknightsAssets/ArknightsGamedata','server':'kr','blob':hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()},'characters':{},'buffs':{},'recipes':{},'dorms':b['dormData']['phases'],'factory':b['manufactData'],'meeting':b['meetingData'],'hire':b['hireData'],'control':b['controlData'],'workerCost':b['manufactManpowerCostByNum']}
    for id,v in b['chars'].items():
        c=chars.get(id)
        if not c:continue
        result['characters'][id]={'id':id,'rarity':int(c['rarity'].split('_')[-1]),'name':c['name'],'identity':groups.get(id,id),'groups':[s for s in [c.get('nationId'),c.get('groupId'),c.get('teamId')] if s], 'alter':c.get('isSpChar',False),'subclass':c.get('subProfessionId'),'maxMorale':v['maxManpower']/b['manpowerDisplayFactor'],'chains':[[{'id':r['buffId'],'elite':int(r['cond']['phase'][-1]),'level':r['cond']['level']} for r in g['buffData']] for g in v['buffChar'] if isinstance(g['buffData'],list)]}
    for id,v in b['buffs'].items():
        if v['roomType'] in ['MANUFACTURE','CONTROL','POWER','HIRE','TRADING','DORMITORY','MEETING']:
            result['buffs'][id]={'id':id,'name':v['buffName'],'room':v['roomType'],'description':re.sub('<[^>]*>','',v['description']),'base':v['efficiency']/100,'targets':v['targets'] if isinstance(v['targets'],list) else []}
    for id in ['1','2','3','4','13','14']:
        r=b['manufactFormulas'][id]
        result['recipes'][id]={'id':id,'itemId':r['itemId'],'category':r['formulaType'],'seconds':r['costPoint'],'weight':r['weight'],'count':r['count'],'unlockLevel':r['requireRooms'][0]['roomLevel'],'xp':{'2001':200,'2002':400,'2003':1000}.get(r['itemId'],0),'costs':r['costs'] if isinstance(r['costs'],list) else []}
    pathlib.Path(output).write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
    print('Bundled',len(result['characters']),'operators and',len(result['buffs']),'skills')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('building');p.add_argument('characters');p.add_argument('--output',default='data/base-optimizer.json');a=p.parse_args();build(a.building,a.characters,a.output)
