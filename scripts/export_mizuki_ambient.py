"""Export two native Mizuki ambient billboard systems and the original camera frame.
Usage: python scripts/export_mizuki_ambient.py RESOURCE_ROOT
Requires UnityPy/numpy. Source bundles remain external to the repository.
Only point/box emitters with constant rate and size/color lifetime curves are used.
"""
import sys,json,pathlib,numpy as np,UnityPy
from analyze_illust_effects import unpack
root=pathlib.Path(sys.argv[1]);env=UnityPy.load(str(root/'arts/dynchars/char_437_mizuki_sale#7.ab'));objects={o.path_id:o for o in env.objects};cache={}
def data(i):
 if i not in cache:cache[i]=objects[i].read_typetree()
 return cache[i]
transforms={i:data(i) for i,o in objects.items() if o.type.name=='Transform'}
def matrix(i):
 t=transforms[i];q=t['m_LocalRotation'];x,y,z,w=[q[k] for k in 'xyzw'];s=t['m_LocalScale'];p=t['m_LocalPosition'];a=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w,p['x']],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w,p['y']],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y,p['z']],[0,0,0,1.]])
 a[:3,:3]=a[:3,:3]@np.diag([s[k] for k in 'xyz']);parent=t['m_Father']['m_PathID'];return matrix(parent)@a if parent in transforms else a
renderer=data(1331848235275187917);spine=next(i for i,t in transforms.items() if t['m_GameObject']['m_PathID']==renderer['m_GameObject']['m_PathID']);world=matrix(spine);inverse=np.linalg.inv(world);units=1/data(renderer['skeletonDataAsset']['m_PathID'])['scale']
controller=next(data(i) for i,o in objects.items() if o.type.name=='MonoBehaviour' and data(i).get('_skeleton',{}).get('m_PathID')==1331848235275187917)
out=pathlib.Path(__file__).resolve().parents[1]/'workers/admin/public/wardrobe/effects/mizuki-sale7';scene=json.loads((out/'scene.json').read_text());scene['emitters']=[]
for i in [-12809099636902195,2005376370269288141]:
 ps=data(i);go=ps['m_GameObject']['m_PathID'];g=data(go);r=next(data(c['component']['m_PathID']) for c in g['m_Component'] if objects[c['component']['m_PathID']].type.name=='ParticleSystemRenderer');mat=data(r['m_Materials'][0]['m_PathID']);tr=next(i for i,t in transforms.items() if t['m_GameObject']['m_PathID']==go);m=inverse@matrix(tr)
 assert r['m_RenderMode']==0 and ps['InitialModule']['size3D']==False and ps['InitialModule']['rotation3D']==False
 assert not any(ps[k]['enabled'] for k in ['VelocityModule','NoiseModule','ForceModule','UVModule','TrailModule'])
 assert not ps['ShapeModule']['enabled'] or (ps['ShapeModule']['type']==5 and all(v==0 for v in ps['ShapeModule']['m_Rotation'].values()))
 assert ps['EmissionModule']['rateOverTime']['minMaxState']==0
 for burst in ps['EmissionModule']['m_Bursts']:
  assert burst['cycleCount']==1 and burst['probability']==1 and burst['time']==0 and burst['countCurve']['minMaxState']==0
 # These are active ambient children of the primary skeleton, not special-action prefabs.
 ancestor=tr
 while ancestor in transforms:
  assert data(transforms[ancestor]['m_GameObject']['m_PathID']).get('m_IsActive',True)
  ancestor=transforms[ancestor]['m_Father']['m_PathID']
 tex=dict(mat['m_SavedProperties']['m_TexEnvs'])['_MainTex'];obj=objects[tex['m_Texture']['m_PathID']].read();name='particle-'+str(len(scene['emitters']))+'.png';obj.image.save(out/name)
 initial={k:ps['InitialModule'][k] for k in ['startLifetime','startSpeed','startSize','startRotation','startColor','maxNumParticles']}
 scene['emitters'].append({'name':g['m_Name'],'sourcePathId':str(i),'matrix':m.tolist(),'units':units,'initial':initial,'emission':{'rateOverTime':ps['EmissionModule']['rateOverTime'],'bursts':ps['EmissionModule']['m_Bursts']},'shape':{k:ps['ShapeModule'][k] for k in ['enabled','type','m_Scale','m_Position']},'size':{k:ps['SizeModule'][k] for k in ['enabled','curve']},'color':ps['ColorModule'],'duration':ps['lengthInSec'],'prewarm':ps['prewarm'],'simulationSpeed':ps['simulationSpeed'],'sortingOrder':r['m_SortingOrder'],'depth':float(m[2,3]),'texture':name,'tint':dict(mat['m_SavedProperties']['m_Colors'])['_TintColor'],'textureST':[tex['m_Scale']['x'],tex['m_Scale']['y'],tex['m_Offset']['x'],tex['m_Offset']['y']]})
(out/'scene.json').write_text(json.dumps(scene,ensure_ascii=False,indent=2)+'\n')
manifest=out.parents[1]/'illust-models.json';models=json.loads(manifest.read_text());half=controller['_cameraSize']*units
entry=models['dyn_illust_437_mizuki_sale#7'];entry['nativeCameraFrame']={'x':-half-float(world[0,3])*units,'y':-half+float(world[1,3])*units,'width':2*half,'height':2*half}
if not entry.get('referenceAlignment'):
 entry['frame']=entry['nativeCameraFrame'];entry['frameSource']='native cameraSize and primary skeleton world transform'
manifest.write_text(json.dumps(models,ensure_ascii=False,indent=2)+'\n');print('Exported native frame and',len(scene['emitters']),'ambient systems')
