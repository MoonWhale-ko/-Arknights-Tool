"""Resolve action-specific prefab references before aggregating effect requirements.
Uses an inventory from analyze_illust_effects.py and the same local resource cache.
"""
import argparse,collections,json,pathlib
from analyze_illust_effects import analyze,UnityPy

def augment(root,inventory):
 if any('sharedEffects' in r for r in inventory['models']):raise ValueError('Input already includes shared effects; use the unaugmented inventory.')
 library=root/'arts/dynchars/effect.ab'
 if not library.exists():raise FileNotFoundError(library)
 env=UnityPy.load(str(library));objects={o.path_id:o for o in env.objects};trees={};assets={};shaders={}
 for obj in objects.values():
  if obj.type.name=='AssetBundle':
   for name,info in obj.read_typetree().get('m_Container',[]):assets[name.lower().removesuffix('.prefab')]=info['asset']['m_PathID']
 for path in [root/'[uc]shaders.ab',root/'[uc]uishaders.ab',*(root/'shaders').glob('*.ab')]:
  if not path.exists():continue
  shared=UnityPy.load(str(path))
  for obj in shared.objects:
   if obj.type.name=='Shader':
    d=obj.read_typetree();shaders[obj.path_id]=d.get('m_ParsedForm',{}).get('m_Name',d.get('m_Name','unknown'))
 def tree(oid):
  if oid not in trees:trees[oid]=objects[oid].read_typetree()
  return trees[oid]
 def collect(root_ids):
  selected={};queue=list(root_ids)
  while queue:
   oid=queue.pop()
   if not oid or oid in selected or oid not in objects:continue
   obj=objects[oid];selected[oid]=obj;d=tree(oid);kind=obj.type.name
   if kind=='GameObject':queue.extend(x['component']['m_PathID'] for x in d['m_Component'])
   elif kind=='Transform':
    queue.append(d['m_GameObject']['m_PathID']);queue.extend(x['m_PathID'] for x in d['m_Children'])
   elif kind in ['MeshRenderer','SkinnedMeshRenderer','ParticleSystemRenderer']:
    queue.extend(x['m_PathID'] for x in d.get('m_Materials',[]) if x['m_FileID']==0)
   elif kind=='ParticleSystem':
    def links(value):
     if isinstance(value,dict):
      if value.get('m_FileID')==0 and value.get('m_PathID') in objects and objects[value['m_PathID']].type.name=='ParticleSystem':
       linked=tree(value['m_PathID']);queue.append(linked['m_GameObject']['m_PathID'])
      else:
       for v in value.values():links(v)
     elif isinstance(value,list):
      for v in value:links(v)
    links(d.get('SubModule',{}))
  return selected
 for row in inventory['models']:
  refs=row.get('externalEffects',[])
  if not refs:continue
  ids=[];missing=[]
  for ref in refs:
   matches=[oid for key,oid in assets.items() if key.endswith(ref.lower().removesuffix('.prefab'))]
   if len(matches)!=1:missing.append(ref)
   else:ids.extend(matches)
  subset=collect(ids);shared=analyze(library,row['model'],shaders,subset)
  row['sharedEffects']={'references':len(refs),'resolved':len(refs)-len(missing),'unresolved':missing,'objects':len(subset),'emitters':shared['emitters']}
  for key in ['rigid','skinned','animators','emitters','trails','boneFollowers','uvScrollers','textureRotators']:row[key]+=shared[key]
  for key in ['modules','shapes','renderModes','behaviors']:row[key]=dict(collections.Counter(row[key])+collections.Counter(shared[key]))
  row['shaders']=sorted(set(row['shaders'])|set(shared['shaders']));row['postProcessing']=row['postProcessing'] or shared['postProcessing']
 counters={name:collections.Counter() for name in ['modules','shapes','renderModes','shaders','behaviors']}
 for row in inventory['models']:
  for name in counters:counters[name].update(row[name] if name=='shaders' else row[name].keys())
 inventory['familiesByModels']={k:dict(v.most_common()) for k,v in counters.items()};inventory['sharedReferenceCoverage']={'models':sum(bool(r.get('sharedEffects')) for r in inventory['models']),'references':sum(r.get('sharedEffects',{}).get('references',0) for r in inventory['models']),'unresolved':sum(len(r.get('sharedEffects',{}).get('unresolved',[])) for r in inventory['models'])};return inventory

def main():
 p=argparse.ArgumentParser();p.add_argument('--resources',required=True);p.add_argument('--inventory',required=True);p.add_argument('--output',required=True);a=p.parse_args();j=augment(pathlib.Path(a.resources),json.load(open(a.inventory)));pathlib.Path(a.output).write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n');print(j['sharedReferenceCoverage'])
if __name__=='__main__':main()
