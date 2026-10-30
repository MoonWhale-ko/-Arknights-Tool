"""Export supported PC Mizuki particles, preserving native action/delay/bone bindings.
Usage: python scripts/export_mizuki_particles.py RESOURCE_ROOT
Unsupported modules and unresolved external textures are recorded, never substituted.
"""
import sys,json,pathlib,hashlib
import numpy as np
from analyze_illust_effects import UnityPy
root=pathlib.Path(sys.argv[1]);path=root/'arts/dynchars/char_437_mizuki_sale#7.ab'
env=UnityPy.load(str(path));objects={o.path_id:o for o in env.objects};cache={}
def data(i):
 if i not in cache:cache[i]=objects[i].read_typetree()
 return cache[i]
def components(go):return [(c['component']['m_PathID'],objects[c['component']['m_PathID']].type.name) for c in data(go)['m_Component']]
transforms={i:data(i) for i,o in objects.items() if o.type.name=='Transform'};bygo={t['m_GameObject']['m_PathID']:i for i,t in transforms.items()};matrices={}
def matrix(i):
 if i in matrices:return matrices[i]
 t=transforms[i];q=t['m_LocalRotation'];x,y,z,w=[q[k] for k in 'xyzw'];s=t['m_LocalScale'];p=t['m_LocalPosition'];a=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w,p['x']],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w,p['y']],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y,p['z']],[0,0,0,1.]])
 a[:3,:3]=a[:3,:3]@np.diag([s[k] for k in 'xyz']);parent=t['m_Father']['m_PathID'];matrices[i]=matrix(parent)@a if parent in transforms else a;return matrices[i]
renderer_id=1331848235275187917;renderer=data(renderer_id);spine=bygo[renderer['m_GameObject']['m_PathID']];inverse=np.linalg.inv(matrix(spine));units=1/data(renderer['skeletonDataAsset']['m_PathID'])['scale'];controller=next(data(i) for i,o in objects.items() if o.type.name=='MonoBehaviour' and data(i).get('_skeleton',{}).get('m_PathID')==renderer_id);actions={b['particle']['m_PathID']:{1:'special',3:'interact'}[b['action']] for b in controller['_particles']}
shaders={}
for f in [root/'[uc]shaders.ab',root/'[uc]uishaders.ab']:
 for o in UnityPy.load(str(f)).objects:
  if o.type.name=='Shader':shaders[o.path_id]=o.read_typetree()['m_ParsedForm']['m_Name']
out=pathlib.Path(__file__).resolve().parents[1]/'workers/admin/public/wardrobe/effects/mizuki-sale7';scene=json.loads((out/'scene.json').read_text());emitters=[];skipped=[];textures={}
for i,o in objects.items():
 if o.type.name!='ParticleSystem':continue
 ps=data(i);go=ps['m_GameObject']['m_PathID'];g=data(go);tr=bygo[go];anc=[];a=tr
 while a in transforms:anc.append(a);a=transforms[a]['m_Father']['m_PathID']
 if not ps['EmissionModule']['enabled'] or any(not data(transforms[a]['m_GameObject']['m_PathID'])['m_IsActive'] for a in anc):continue
 reason=None;action=None;bone=None;anchor=spine;delay=ps['startDelay']['scalar']
 for a in anc:
  ag=transforms[a]['m_GameObject']['m_PathID']
  if ag in actions:action=actions[ag]
  for c,kind in components(ag):
   if kind!='MonoBehaviour':continue
   d=data(c)
   if '_delayTime' in d:delay+=d['_delayTime']
   if 'boneName' in d:
    if bone or d['skeletonRenderer']['m_PathID']!=renderer_id or d.get('useAppliedLocalScale') or not d.get('followXYPosition'):reason='unsupported bone follower'
    bone={k:d[k] for k in ['boneName','followBoneRotation','followLocalScale','followSkeletonFlip']};anchor=a
 r=next(data(c) for c,k in components(go) if k=='ParticleSystemRenderer');mat=data(r['m_Materials'][0]['m_PathID']);props=mat['m_SavedProperties'];shader=shaders.get(mat['m_Shader']['m_PathID']);tex=dict(props['m_TexEnvs']).get('_MainTex')
 bad=[k for k in ['VelocityModule','ClampVelocityModule','ForceModule','NoiseModule','RotationModule','TrailModule','UVModule'] if ps[k]['enabled']]
 if bad:reason='unsupported modules: '+','.join(bad)
 if r['m_RenderMode']!=0 or ps['InitialModule']['size3D'] or ps['InitialModule']['rotation3D']:reason='unsupported renderer/3D size'
 shape=ps['ShapeModule']
 if shape['enabled'] and (shape['type']!=5 or any(shape['m_Rotation'].values())):reason='unsupported shape'
 if shader!='Torappu/Particles-L2D/Additive':reason='unsupported shader: '+str(shader)
 if not tex or tex['m_Texture']['m_FileID']!=0:reason='unresolved external texture'
 if ps['startDelay']['minMaxState']!=0 or ps['EmissionModule']['rateOverTime']['minMaxState']!=0 or ps['EmissionModule']['rateOverDistance']['scalar']!=0:reason='unsupported emission curve'
 if ps['InitialModule']['gravityModifier']['scalar']!=0:reason='gravity'
 if any(b['cycleCount']!=1 or b['probability']!=1 or b['countCurve']['minMaxState']!=0 for b in ps['EmissionModule']['m_Bursts']):reason='unsupported burst'
 if reason:skipped.append({'name':g['m_Name'],'sourcePathId':str(i),'reason':reason});continue
 tid=tex['m_Texture']['m_PathID']
 if tid not in textures:
  name='particle-native-'+str(len(textures))+'.png';objects[tid].read().image.save(out/name);textures[tid]=name
 world=inverse@matrix(tr);relative=np.linalg.inv(matrix(anchor))@matrix(tr) if bone else world
 initial={k:ps['InitialModule'][k] for k in ['startLifetime','startSpeed','startSize','startRotation','startColor','maxNumParticles']}
 emitters.append({'name':g['m_Name'],'sourcePathId':str(i),'matrix':relative.tolist(),'units':units,'initial':initial,'emission':{'rateOverTime':ps['EmissionModule']['rateOverTime'],'bursts':ps['EmissionModule']['m_Bursts']},'shape':{k:shape[k] for k in ['enabled','type','m_Scale','m_Position']},'size':{k:ps['SizeModule'][k] for k in ['enabled','curve']},'color':ps['ColorModule'],'duration':ps['lengthInSec'],'looping':ps['looping'],'delay':delay,'prewarm':ps['prewarm'],'simulationSpeed':ps['simulationSpeed'],'sortingOrder':r['m_SortingOrder'],'depth':float(world[2,3]),'texture':textures[tid],'tint':dict(props['m_Colors'])['_TintColor'],'textureST':[tex['m_Scale']['x'],tex['m_Scale']['y'],tex['m_Offset']['x'],tex['m_Offset']['y']],**({'action':action} if action else {}),**({'bone':bone} if bone else {})})
# Keep the two earlier ambient systems first for stable texture/test comparisons.
order={'-12809099636902195':0,'2005376370269288141':1};emitters.sort(key=lambda e:order.get(e['sourcePathId'],2))
def compact(v):
 if isinstance(v,list):return [compact(x) for x in v]
 if not isinstance(v,dict):return v
 if 'minMaxState' in v and 'scalar' in v:
  state=v['minMaxState'];keys=['minMaxState','scalar']+(['minScalar'] if state==3 else ['maxCurve'] if state==1 else ['minCurve','maxCurve'] if state==2 else [])
  return {k:compact(v[k]) for k in keys}
 if 'minMaxState' in v and 'maxColor' in v:
  keys={0:['maxColor'],1:['maxGradient'],2:['minColor','maxColor'],3:['minGradient','maxGradient']}[v['minMaxState']]
  return {k:compact(v[k]) for k in ['minMaxState',*keys]}
 if 'm_NumColorKeys' in v:
  keys=['m_Mode','m_NumColorKeys','m_NumAlphaKeys']+[f'key{i}' for i in range(max(v['m_NumColorKeys'],v['m_NumAlphaKeys']))]+[f'ctime{i}' for i in range(v['m_NumColorKeys'])]+[f'atime{i}' for i in range(v['m_NumAlphaKeys'])]
  return {k:compact(v[k]) for k in keys}
 return {k:compact(x) for k,x in v.items()}
emitters=compact(emitters)
scene.update(emitters=emitters,particleSource={'bundle':path.name,'md5':hashlib.md5(path.read_bytes()).hexdigest(),'platform':'Windows','supported':len(emitters),'skipped':skipped},scope='Original rigid backgrounds and supported native additive point/box particles. Other shaders and particle modules remain excluded.')
(out/'scene.json').write_text(json.dumps(scene,ensure_ascii=False,indent=2)+'\n');print('Exported',len(emitters),'systems,',len(textures),'textures;',len(skipped),'unsupported systems')
