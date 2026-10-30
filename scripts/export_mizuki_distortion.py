"""Export two original anchored-distortion meshes, resolving external CAB references.
Usage: python scripts/export_mizuki_distortion.py MODEL_AB DEPENDENCY_AB
Source files stay external; shader equations are implemented in illust-effects-canvas.mjs.
"""
import sys,pathlib,json,numpy as np
from analyze_illust_effects import UnityPy
from UnityPy.helpers.MeshHelper import MeshHandler
model=UnityPy.load(sys.argv[1]);dependency=UnityPy.load(sys.argv[2]);assets={a.name.lower():a for a in [*model.assets,*dependency.assets]};objects={o.path_id:o for o in model.objects};cache={}
def data(i):
 if i not in cache:cache[i]=objects[i].read_typetree()
 return cache[i]
def resolve(ptr,owner):
 asset=owner.assets_file
 if ptr['m_FileID']:
  name=asset.externals[ptr['m_FileID']-1].path.split('/')[-1].lower()
  if name not in assets:raise ValueError('Missing original external asset '+name)
  asset=assets[name]
 return asset.objects[ptr['m_PathID']]
transforms={i:data(i) for i,o in objects.items() if o.type.name=='Transform'};bygo={d['m_GameObject']['m_PathID']:i for i,d in transforms.items()};matrices={}
def matrix(i):
 if i in matrices:return matrices[i]
 t=transforms[i];x,y,z,w=[t['m_LocalRotation'][k] for k in 'xyzw'];s=t['m_LocalScale'];p=t['m_LocalPosition'];a=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w,p['x']],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w,p['y']],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y,p['z']],[0,0,0,1.]])
 a[:3,:3]=a[:3,:3]@np.diag([s[k] for k in 'xyz']);parent=t['m_Father']['m_PathID'];matrices[i]=matrix(parent)@a if parent in transforms else a;return matrices[i]
r=data(1331848235275187917);inverse=np.linalg.inv(matrix(bygo[r['m_GameObject']['m_PathID']]));units=1/data(r['skeletonDataAsset']['m_PathID'])['scale'];out=pathlib.Path(__file__).resolve().parents[1]/'workers/admin/public/wardrobe/effects/mizuki-sale7';scene=json.loads((out/'scene.json').read_text());names={'sekuai_dm','sekua3_dm'};scene['layers']=[l for l in scene['layers'] if l['name'] not in names]
texfiles={5131277058347620076:'texture-91.png',-408640440388553796:'texture-92.png',3598337627453241146:'texture-93.png'}
for i,o in objects.items():
 if o.type.name!='MeshRenderer':continue
 rr=data(i);go=rr['m_GameObject']['m_PathID'];g=data(go)
 if g['m_Name'] not in names:continue
 assert rr['m_Enabled'] and g['m_IsActive'];comps=[objects[c['component']['m_PathID']] for c in g['m_Component']];mf=next(c.read_typetree() for c in comps if c.type.name=='MeshFilter');matobj=resolve(rr['m_Materials'][0],o);mat=matobj.read_typetree();props=mat['m_SavedProperties'];floats=dict(props['m_Floats']);assert not floats['_ToggleUseDisturb2'] and not floats['_ToggleUseDissolve'];textures={}
 for k,v in props['m_TexEnvs']:
  if k not in ['_MainTex','_DisturTex']:continue
  obj=resolve(v['m_Texture'],matobj);image=obj.read();filename=texfiles[obj.path_id];image.image.save(out/filename);tree=obj.read_typetree();wrap=tree['m_TextureSettings'].get('m_WrapU',tree['m_TextureSettings'].get('m_WrapMode',1));textures[k]={'file':filename,'name':image.m_Name,'sourcePathId':str(obj.path_id),'scale':v['m_Scale'],'offset':v['m_Offset'],'wrap':wrap}
 mesh=MeshHandler(resolve(mf['m_Mesh'],o).read());mesh.process();assert all(c[:3]==(255,255,255) for c in mesh.m_Colors);world=inverse@matrix(bygo[go]);points=[world@np.array([*v,1]) for v in mesh.m_Vertices]
 scene['layers'].append({'name':g['m_Name'],'vertices':[[round(float(p[0])*units,5),round(-float(p[1])*units,5)] for p in points],'uv':[list(v[:2]) for v in mesh.m_UV0],'triangles':[list(t) for group in mesh.get_triangles() for t in group],'vertexAlpha':[c[3]/255 for c in mesh.m_Colors],'vertexTint':[1,1,1,1],'depth':float(world[2,3]),'sortingOrder':rr['m_SortingOrder'],'shader':{'name':'Torappu/Particles-L2D/Disturb/Disturb Anchor (AlphaBlend)'},'textures':textures,'floats':floats,'colorsUniform':dict(props['m_Colors']),'uvScroll':{},'sourceRenderer':str(i)})
scene['scope']='Original rigid backgrounds, two original anchored distortion meshes and supported native particles; other unsupported modules remain excluded.';(out/'scene.json').write_text(json.dumps(scene,ensure_ascii=False,indent=2)+'\n');print('Exported anchored distortion layers',[(l['name'],len(l['vertices'])) for l in scene['layers'] if l['name'] in names])
