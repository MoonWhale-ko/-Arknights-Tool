"""Inventory native dynamic illustration effects without rendering or decoding textures.
Usage: python scripts/analyze_illust_effects.py --resources DIR --output FILE
DIR must contain hot_update_list.json, base (CDN URL), and optionally cached bundles.
Requires UnityPy. Downloads only matching native model bundles; bounded worker count.
"""
import argparse,collections,concurrent.futures,json,pathlib,urllib.parse,urllib.request,zipfile,io,time
import UnityPy
from UnityPy.helpers import CompressionHelper

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
  offset=(data[i]<<8)|data[i+1];i+=2
  if m==15:
   while True:
    x=data[i];i+=1;m+=x
    if x!=255:break
  for _ in range(m+4):out.append(out[-offset])
 assert len(out)==size
 return bytes(out)
CompressionHelper.DECOMPRESSION_MAP[4]=unpack

def key_for_bundle(name):
 value=name.removeprefix('arts/dynchars/char_').removesuffix('.ab').lower()
 if value.endswith('_2'):value=value[:-2]
 if value=='4087_ines_ambiencesynesthesia#5':value='4087_ines_ambiencesynesthesia'
 return 'dyn_illust_'+value

def analyze(path,key,shaders,objects=None):
 if objects is None:
  env=UnityPy.load(str(path));objects={o.path_id:o for o in env.objects}
 result={'model':key,'bundle':str(path.name),'rigid':0,'skinned':0,'animators':0,'emitters':0,'trails':0,'boneFollowers':0,'uvScrollers':0,'textureRotators':0,'postProcessing':False,'externalEffects':[]};modules=collections.Counter();shapes=collections.Counter();renders=collections.Counter();shader_names=set();behaviors=collections.Counter()
 shaders=dict(shaders)
 for obj in objects.values():
  if obj.type.name=='Shader':
   data=obj.read_typetree();shaders[obj.path_id]=data.get('m_ParsedForm',{}).get('m_Name',data.get('m_Name','unknown'))
 for obj in objects.values():
  kind=obj.type.name
  if kind not in ['MeshFilter','MeshRenderer','SkinnedMeshRenderer','ParticleSystem','ParticleSystemRenderer','Material','MonoBehaviour','Animator','Animation']:continue
  if kind in ['Animator','Animation']:result['animators']+=1;continue
  data=obj.read_typetree()
  if kind=='MeshFilter' and data['m_Mesh']['m_PathID']:result['rigid']+=1
  elif kind=='SkinnedMeshRenderer':result['skinned']+=1
  elif kind=='ParticleSystem':
   if data.get('EmissionModule',{}).get('enabled'):
    result['emitters']+=1
    for field,value in data.items():
     if field.endswith('Module') and isinstance(value,dict) and value.get('enabled'):modules[field]+=1
    if data.get('ShapeModule',{}).get('enabled'):shapes[str(data['ShapeModule']['type'])]+=1
    if data.get('TrailModule',{}).get('enabled'):result['trails']+=1
  elif kind=='ParticleSystemRenderer':renders[str(data.get('m_RenderMode'))]+=1
  elif kind=='Material':
   shader_names.add(shaders.get(data['m_Shader']['m_PathID'],'unresolved:'+str(data['m_Shader']['m_PathID'])))
  elif kind=='MonoBehaviour':
   fields=set(data)-{'m_GameObject','m_Enabled','m_Script','m_Name','m_EditorClassIdentifier'}
   if 'keepInitOffset' in fields and 'xspeed' in fields:behaviors['UVScroll']+=1;result['uvScrollers']+=1
   elif 'skeletonDataAsset' in fields:behaviors['SpineRenderer']+=1
   elif '_particles' in fields:
    behaviors['DynamicIllustrationController']+=1
    if '_cameraSize' in data:result['cameraSize']=data['_cameraSize']
    if '_maxSize' in data:result['maxSize']=data['_maxSize']
    result['actionBindings']=dict(collections.Counter(str(x.get('action')) for x in data.get('_particles',[])))
   elif 'skeletonJSON' in fields:behaviors['SpineData']+=1
   elif 'atlasFile' in fields:behaviors['SpineAtlas']+=1
   elif 'boneName' in fields and 'skeletonRenderer' in fields:behaviors['BoneFollower']+=1;result['boneFollowers']+=1
   elif '_rotateTex1' in fields:behaviors['TextureRotation']+=1;result['textureRotators']+=1
   elif '_effectPath' in fields:
    behaviors['ExternalEffectHolder']+=1
    if data['_effectPath']:result['externalEffects'].append(data['_effectPath'])
   elif fields:behaviors['fields:'+','.join(sorted(fields))]+=1
   if {'sharedProfile','weight'}<=fields or 'volumeLayer' in fields or 'blurDegree' in fields:result['postProcessing']=True
 result.update(modules=dict(modules),shapes=dict(shapes),renderModes=dict(renders),shaders=sorted(shader_names),behaviors=dict(behaviors));return result

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--resources',required=True);parser.add_argument('--output',required=True);parser.add_argument('--workers',type=int,default=4);parser.add_argument('--models',nargs='*');parser.add_argument('--platform',default='KR Android');args=parser.parse_args()
 root=pathlib.Path(args.resources);hot=json.loads((root/'hot_update_list.json').read_text());base=(root/'base').read_text().strip();project=pathlib.Path(__file__).resolve().parents[1];manifest=json.loads((project/'workers/admin/public/wardrobe/illust-models.json').read_text())
 wanted=set(args.models or manifest)
 entries={key_for_bundle(x['name']):x for x in hot['abInfos'] if x['name'].startswith('arts/dynchars/char_') and key_for_bundle(x['name']) in wanted};print('Native bundles:',len(entries),'of',len(wanted),'model entries',flush=True)
 shaders={}
 for path in [root/'[uc]shaders.ab',root/'[uc]uishaders.ab',*(root/'shaders').glob('*.ab')]:
  if not path.exists():continue
  env=UnityPy.load(str(path))
  for o in env.objects:
   if o.type.name=='Shader':
    d=o.read_typetree();shaders[o.path_id]=d.get('m_ParsedForm',{}).get('m_Name',d.get('m_Name','unknown'))
 def download(item):
  key,entry=item;path=root/entry['name'];path.parent.mkdir(parents=True,exist_ok=True)
  try:
   if not path.exists():
    name=entry['name'].replace('/','_').replace('#','__').removesuffix('.ab')+'.dat';url=base+'/'+urllib.parse.quote(name,safe='')
    for attempt in range(2):
     try:
      data=urllib.request.urlopen(url,timeout=25).read();archive=zipfile.ZipFile(io.BytesIO(data));member=next(n for n in archive.namelist() if n.endswith(entry['name']));path.write_bytes(archive.read(member));break
     except Exception:
      if attempt:raise
   return key,path,None
  except Exception as e:return key,path,str(e)
 downloads=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
  for i,row in enumerate(pool.map(download,entries.items()),1):
   downloads.append(row)
   if i%12==0:print('Downloaded',i,'/',len(entries),flush=True)
 rows=[]
 for i,(key,path,error) in enumerate(downloads,1):
  try:rows.append({'model':key,'error':error} if error else analyze(path,key,shaders))
  except Exception as e:rows.append({'model':key,'error':str(e)})
  if i%12==0:print('Analyzed',i,'/',len(downloads),flush=True)
 counters={name:collections.Counter() for name in ['modules','shapes','renderModes','shaders','behaviors']}
 for row in rows:
  if 'error' in row:continue
  for name in counters:
   if name=='shaders':counters[name].update(row[name])
   else:counters[name].update(row[name].keys())
 output={'nativeVersion':hot['versionId'],'nativeBaseUrl':base,'nativePlatform':args.platform,'spineModels':len(wanted),'nativeBundles':len(entries),'notInNativeVersion':sorted(wanted-entries.keys()),'errors':[r for r in rows if 'error'in r],'models':rows,'familiesByModels':{k:dict(v.most_common()) for k,v in counters.items()},'limits':'Structural classification of serialized templates, including inactive and action-specific objects. Presence of metadata is not proof of rendering support or visual parity.'}
 out=pathlib.Path(args.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n');print('Saved',out,'errors',len(output['errors']),flush=True)
if __name__=='__main__':main()
