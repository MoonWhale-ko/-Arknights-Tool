"""Export supported native rigid layers; never substitute unsupported Unity effects.
Usage: python scripts/export_illust_scene.py RESOURCE_ROOT BUNDLE OUTPUT --skin ID
"""
import argparse,json,pathlib
import numpy as np,UnityPy
from UnityPy.helpers.MeshHelper import MeshHandler
from analyze_illust_effects import unpack  # registers native bundle decompression

def export(root,bundle,out,skin):
 env=UnityPy.load(str(root/'arts/dynchars'/bundle),str(root/'[uc]shaders.ab'))
 objects={o.path_id:o for o in env.objects};cache={}
 def data(i):
  if i not in cache:cache[i]=objects[i].read_typetree()
  return cache[i]
 def components(go):return [objects[c['component']['m_PathID']] for c in data(go)['m_Component']]
 transforms={i:data(i) for i,o in objects.items() if o.type.name=='Transform'}
 def transform(go):return next(c.path_id for c in components(go) if c.type.name=='Transform')
 matrices={}
 def matrix(tid):
  if tid in matrices:return matrices[tid]
  t=transforms[tid];q=t['m_LocalRotation'];x,y,z,w=[q[k] for k in 'xyzw'];s=t['m_LocalScale'];p=t['m_LocalPosition']
  a=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w,p['x']],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w,p['y']],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y,p['z']],[0,0,0,1.]])
  a[:3,:3]=a[:3,:3]@np.diag([s[k] for k in 'xyz']);parent=t['m_Father']['m_PathID'];matrices[tid]=matrix(parent)@a if parent in transforms else a
  return matrices[tid]
 renderers=[(i,data(i)) for i,o in objects.items() if o.type.name=='MonoBehaviour' and 'skeletonDataAsset' in data(i)]
 primary=[(i,d) for i,d in renderers if data(d['skeletonDataAsset']['m_PathID']).get('m_Name','').startswith('dyn_illust_char_')]
 if len(primary)!=1:raise ValueError('Ambiguous main illustration skeleton')
 renderer_id,renderer=primary[0];spine=transform(renderer['m_GameObject']['m_PathID']);inverse=np.linalg.inv(matrix(spine));units=1/data(renderer['skeletonDataAsset']['m_PathID'])['scale']
 out.mkdir(parents=True,exist_ok=True);textures={};layers=[];skipped=[]
 def texture(ptr):
  tid=ptr['m_PathID']
  if tid not in textures:
   obj=objects[tid].read();name=f'texture-{len(textures)}.png';obj.image.save(out/name);textures[tid]={'file':name,'name':obj.m_Name,'wrap':obj.m_TextureSettings.m_WrapMode}
  return textures[tid]
 for i,o in objects.items():
  if o.type.name!='MeshRenderer':continue
  r=data(i);go=r['m_GameObject']['m_PathID'];cs=components(go);mf=next((data(c.path_id) for c in cs if c.type.name=='MeshFilter'),None)
  if not mf or not mf['m_Mesh']['m_PathID']:continue
  name=data(go)['m_Name'];tid=transform(go);anc=[];p=tid
  while p in transforms:anc.append(p);p=transforms[p]['m_Father']['m_PathID']
  reason=None;followers=[]
  if not r.get('m_Enabled',True):reason='disabled renderer'
  # Only the primary illustration subtree; portrait and special-action variants are separate scenes.
  if spine not in anc:reason='outside primary skeleton subtree'
  for a in anc[:anc.index(spine)] if spine in anc else []:
   ag=transforms[a]['m_GameObject']['m_PathID']
   if not data(ag).get('m_IsActive',True):reason='inactive object'
   for c in components(ag):
    d=data(c.path_id)
    if c.type.name in ['Animator','Animation'] and d.get('m_Enabled',True):reason='animated Unity transform'
    if c.type.name=='MonoBehaviour' and d.get('m_Enabled',True):
     if 'boneName' in d:followers.append((a,d))
     if '_rotateTex1' in d:reason='texture rotation'
  hierarchy_reason=reason
  binding=None
  if followers:
   a,f=followers[0]
   if len(followers)>1 or f['skeletonRenderer']['m_PathID']!=renderer_id or f.get('useAppliedLocalScale') or not f.get('followXYPosition',f.get('followXY',True)) or transforms[a]['m_Father']['m_PathID']!=spine:reason='unsupported bone follower hierarchy'
   else:binding={k:f[k] for k in ['boneName','followBoneRotation','followLocalScale','followSkeletonFlip'] if k in f}
  if len(r['m_Materials'])!=1:reason='multiple materials'
  mat=data(r['m_Materials'][0]['m_PathID']);shader=data(mat['m_Shader']['m_PathID'])['m_ParsedForm']['m_Name'];props=mat['m_SavedProperties'];floats=dict(props['m_Floats'])
  if shader not in ['Torappu/Particles-L2D/Additive','Torappu/Particles-L2D/AlphaBlend','Torappu/Particles-L2D/Dissolve/Dissolve AB','Torappu/Particles-L2D/Dissolve/Dissolve AB UVTween','Torappu/Particles-L2D/Dissolve/Dissolve Add UVTween']:reason='unsupported shader: '+shader
  if floats.get('_MainTexChannel',0)!=0:reason='texture channel mode'
  reason=hierarchy_reason or reason
  if mf['m_Mesh']['m_PathID'] not in objects:reason='external mesh dependency'
  if reason:skipped.append({'name':name,'reason':reason});continue
  mesh=MeshHandler(objects[mf['m_Mesh']['m_PathID']].read());mesh.process();colors=getattr(mesh,'m_Colors',None)
  if colors and any(any(abs(v-colors[0][j])>1e-5 for j,v in enumerate(color)) for color in colors):skipped.append({'name':name,'reason':'vertex color modulation'});continue
  world=inverse@matrix(tid);relative=np.linalg.inv(matrix(followers[0][0]))@matrix(tid) if binding else world
  points=[relative@np.array([*v,1.]) for v in mesh.m_Vertices];depth=float((world@np.array([0,0,0,1]))[2]);tex={k:{**texture(v['m_Texture']),'scale':v['m_Scale'],'offset':v['m_Offset']} for k,v in props['m_TexEnvs'] if v['m_Texture']['m_PathID']}
  if '_MainTex' not in tex:skipped.append({'name':name,'reason':'missing main texture'});continue
  scroll={}
  for c in cs:
   if c.type.name=='MonoBehaviour':
    d=data(c.path_id)
    if 'xspeed' in d and d.get('m_Enabled',True):
     scroll['_MainTex']=[d['xspeed'],d['yspeed']]
     if d.get('useSecondMap'):scroll[d['secondMapName']]=[d['secondXSpeed'],d['secondYSpeed']]
  layers.append({'name':name,'vertices':[[round(float(p[0])*units,5),round(-float(p[1])*units,5)] for p in points],'uv':[list(v[:2]) for v in mesh.m_UV0],'triangles':[list(t) for group in mesh.get_triangles() for t in group],'depth':round(depth,5),'sortingOrder':r['m_SortingOrder'],'shader':{'name':shader},'textures':tex,'floats':floats,'colorsUniform':dict(props['m_Colors']),'vertexTint':list(colors[0]) if colors else [1,1,1,1],'uvScroll':scroll,**({'bone':binding} if binding else {})})
 scene={'skin':skin,'source':'arts/dynchars/'+bundle,'spineUnitsPerWorldUnit':units,'layers':layers,'skipped':skipped,'scope':'Supported original rigid meshes only; particles, trails and unsupported materials are excluded.'}
 (out/'scene.json').write_text(json.dumps(scene,ensure_ascii=False,indent=2)+'\n');print(skin,':',len(layers),'layers;',len(skipped),'skipped;',len(textures),'textures')

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('root',type=pathlib.Path);p.add_argument('bundle');p.add_argument('output',type=pathlib.Path);p.add_argument('--skin',required=True);a=p.parse_args();export(a.root,a.bundle,a.output,a.skin)
