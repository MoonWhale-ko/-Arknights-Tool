"""Export Skadi E2's original Unity background meshes, textures and GLES fragments.
Usage: python scripts/export_illust_background.py RESOURCE_DIRECTORY OUTPUT_DIRECTORY
Requires UnityPy, lz4 and numpy; source bundles remain external to the repository.
"""
import sys,json,pathlib,re
import numpy as np,lz4.block,UnityPy
from UnityPy.helpers import CompressionHelper
from UnityPy.helpers.MeshHelper import MeshHandler

def unpack(data,size):
 out=bytearray();i=0
 while i<len(data):
  token=data[i];i+=1;n=token&15;m=token>>4
  if n==15:
   while True:
    x=data[i];i+=1;n+=x
    if x!=255:break
  out.extend(data[i:i+n]);i+=n
  if i>=len(data):break
  off=(data[i]<<8)|data[i+1];i+=2
  if m==15:
   while True:
    x=data[i];i+=1;m+=x
    if x!=255:break
  for _ in range(m+4):out.append(out[-off])
 assert len(out)==size
 return bytes(out)
CompressionHelper.DECOMPRESSION_MAP[4]=unpack
root=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
env=UnityPy.load(str(root));bundle=UnityPy.load(str(root/'arts/dynchars/char_1012_skadi2_2.ab'));objects={o.path_id:o for o in bundle.objects};trees={i:o.read_typetree() for i,o in objects.items() if o.type.name in ['Transform','GameObject','MonoBehaviour']}
shader_objects={o.path_id:o for o in env.objects if o.type.name=='Shader'}
transforms={i:t for i,t in trees.items() if objects[i].type.name=='Transform'}
def matrix(tid):
 t=transforms[tid];q=t['m_LocalRotation'];x,y,z,w=[q[k] for k in 'xyzw'];s=t['m_LocalScale'];p=t['m_LocalPosition']
 a=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w,p['x']],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w,p['y']],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y,p['z']],[0,0,0,1.]])
 a[:3,:3]=a[:3,:3]@np.diag([s[k] for k in 'xyz']);parent=t['m_Father']['m_PathID'];return matrix(parent)@a if parent in transforms else a
spine_world=matrix(-4753533321878639211);inverse=np.linalg.inv(spine_world)
textures={};shaders={};layers=[]
def texture(ptr):
 tid=ptr['m_PathID']
 if tid not in textures:
  obj=objects[tid].read();name='texture-'+str(len(textures))+'.png';obj.image.save(out/name);textures[tid]={'file':name,'name':obj.m_Name,'wrap':obj.m_TextureSettings.m_WrapMode}
 return textures[tid]
def fragment(shader_id):
 if shader_id in shaders:return shaders[shader_id]
 t=shader_objects[shader_id].read_typetree();i=t['platforms'].index(9);offset=t['offsets'][i][0];length=t['compressedLengths'][i][0];size=t['decompressedLengths'][i][0]
 raw=lz4.block.decompress(bytes(t['compressedBlob'][offset:offset+length]),uncompressed_size=size)
 start=raw.index(b'#ifdef FRAGMENT');text=raw[start:].decode('utf-8',errors='ignore');text=text[:text.rfind('}')+1]
 text='\n'.join(line for line in text.splitlines() if not line.lstrip().startswith('#'))
 text=re.sub(r'UNITY_LOCATION\([^)]*\)\s*','',text);text=re.sub(r'^in\s+','varying ',text,flags=re.M);text=re.sub(r'^layout\(location = 0\) out .*?;\s*','',text,flags=re.M);text=text.replace('SV_Target0','gl_FragColor').replace('texture(','texture2D(').replace('roundEven(','nativeRoundEven(')
 text=text.replace('texture2D(', 'sampleUnity(');text=text.replace('void main()', 'vec4 sampleUnity(sampler2D source,vec2 uv){return texture2D(source,vec2(uv.x,1.0-uv.y));}\nvoid main()');text=text.replace('void main()', 'float nativeRoundEven(float v){float f=floor(v),r=v-f;return r<0.5?f:r>0.5?f+1.0:mod(f,2.0)==0.0?f:f+1.0;}\nvoid main()')
 text=text.replace('    return;', '    gl_FragColor.rgb = clamp(gl_FragColor.rgb,0.0,1.0) * gl_FragColor.a;\n    return;')
 name='shader-'+str(len(shaders))+'.frag';(out/name).write_text(text);shaders[shader_id]={'file':name,'name':t['m_ParsedForm']['m_Name']};return shaders[shader_id]
for o in bundle.objects:
 if o.type.name!='MeshRenderer':continue
 renderer=o.read_typetree();go=trees[renderer['m_GameObject']['m_PathID']];components=[objects[v['component']['m_PathID']] for v in go['m_Component']];mf=next((c.read_typetree() for c in components if c.type.name=='MeshFilter'),None)
 if not mf or not mf['m_Mesh']['m_PathID']:continue
 tr=next(c.path_id for c in components if c.type.name=='Transform');mat=objects[renderer['m_Materials'][0]['m_PathID']].read_typetree();mesh=MeshHandler(objects[mf['m_Mesh']['m_PathID']].read());mesh.process();world=inverse@matrix(tr)
 points=[world@np.array([*v,1.]) for v in mesh.m_Vertices];vertices=[[round(float(v[0])*100,5),round(-float(v[1])*100,5)] for v in points]
 props=mat['m_SavedProperties'];tex={k:{**texture(v['m_Texture']),'scale':v['m_Scale'],'offset':v['m_Offset']} for k,v in props['m_TexEnvs'] if v['m_Texture']['m_PathID']};shader=fragment(mat['m_Shader']['m_PathID'])
 scroll={}
 for c in components:
  if c.type.name=='MonoBehaviour':
   d=c.read_typetree()
   if d.get('useSecondMap'):scroll[d['secondMapName']]=[d['secondXSpeed'],d['secondYSpeed']]
 colors=getattr(mesh,'m_Colors',None) or [(1,1,1,1)]*len(vertices)
 layers.append({'name':go['m_Name'],'vertices':vertices,'uv':[list(v[:2]) for v in mesh.m_UV0],'colors':[list(v) for v in colors],'triangles':[list(t) for group in mesh.get_triangles() for t in group],'depth':round(float(np.mean([p[2] for p in points])),5),'sortingOrder':renderer['m_SortingOrder'],'shader':shader,'textures':tex,'floats':dict(props['m_Floats']),'colorsUniform':dict(props['m_Colors']),'uvScroll':scroll})
manifest={'skin':'char_1012_skadi2#2','source':'arts/dynchars/char_1012_skadi2_2.ab','spineUnitsPerWorldUnit':100,'cameraSize':11,'layers':layers,'scope':'Original rigid background meshes only; particle emitters and the skinned ribbon mesh are not included.'}
(out/'scene.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print('Exported',len(layers),'meshes,',len(textures),'textures,',len(shaders),'shaders')
