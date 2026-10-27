"""Extract collection UI layout from user-supplied PC KR AssetBundles.
Usage: python extract-wardrobe-layout.py UPLOAD_DIR SKIN_TABLE_JSON OUTPUT_JSON
Requires UnityPy and lz4. No account information is read or exported.
"""
import sys,json,zlib,math,collections
from pathlib import Path
import UnityPy,lz4.block
from UnityPy.helpers import CompressionHelper

# LZ4AK token/offset conversion adapted from Ark-Unpacker (BSD-3-Clause).
# https://github.com/isHarryh/Ark-Unpacker
def lz4ak(data,size):
 b=bytearray(data);ip=op=0
 def extra(i):
  n=0
  while i<len(b):
   v=b[i];i+=1;n+=v
   if v!=255:break
  return n,i
 while ip<len(b):
  lit=b[ip]&15;match=b[ip]>>4;b[ip]=(lit<<4)|match;ip+=1
  if lit==15:n,ip=extra(ip);lit+=n
  ip+=lit;op+=lit
  if op>=size:break
  b[ip],b[ip+1]=b[ip+1],b[ip];ip+=2
  if match==15:n,ip=extra(ip);match+=n
  op+=match+4
 return lz4.block.decompress(b,size)
CompressionHelper.DECOMPRESSION_MAP[4]=lz4ak
folder,skinpath,out=map(Path,sys.argv[1:4])
def bundle(name):return UnityPy.load(str(folder/name))
pack=bundle('[pack]skinres.ab');externalSprites={o.path_id:o.read_typetree() for o in pack.objects if o.type.name=='Sprite'};external={i:t['m_Name'] for i,t in externalSprites.items()}
e=bundle('skin_groups.ab');objects={o.path_id:o for o in e.objects};cache={}
def data(i):
 if i not in cache:cache[i]=objects[i].read_typetree()
 return cache[i]
# The serialized prefab contains its hidden state. Evaluate the shared Show
# clip's constant channels before resolving anchors and parent transforms.
show={}
for o in e.objects:
 if o.type.name=='AnimationClip':
  t=o.read_typetree()
  if t['m_Name']=='SkinAllShow':
   clip=t['m_MuscleClip']['m_Clip']['data'];vals=clip['m_ConstantClip']['data'];skip=clip['m_StreamedClip']['curveCount']+clip['m_DenseClip']['m_CurveCount'];cursor=0;channel=0
   for b in t['m_ClipBindingConstant']['genericBindings']:
    count=3 if b['typeID']==4 and b['attribute'] in (1,3,4) else 4 if b['typeID']==4 and b['attribute']==2 else 1
    if channel>=skip:show[(b['path'],b['attribute'])]=vals[cursor:cursor+count];cursor+=count
    channel+=count
attributes={zlib.crc32(k.encode()):k for k in ('m_AnchoredPosition.x','m_AnchoredPosition.y','m_SizeDelta.x','m_SizeDelta.y','m_Color.a')}
layouts={}
for path,root in e.container.items():
 slots={};bindings={}
 for c in root.read_typetree()['m_Component']:
  i=c['component']['m_PathID']
  if objects[i].type.name=='MonoBehaviour':
   t=data(i)
   for j,part in enumerate(t.get('_toColor',[])):
    for ref in part['listImage']:slots[ref['m_PathID']]=j
   for field,label in (('_avatarImage','avatar'),('_portraitImage','portrait'),('_illustContainer','illustration'),('_spineHolder','spine'),('_modelName','model'),('_pureModelName','model'),('_drawerName','drawer'),('_pureDrawerName','drawer'),('_content','content')):
    if t.get(field,{}).get('m_PathID'):bindings[t[field]['m_PathID']]=label
 nodes=[]
 def walk(gid,parent=None,route=''):
  g=data(gid);cs=[c['component']['m_PathID'] for c in g['m_Component']];rid=next((i for i in cs if objects[i].type.name=='RectTransform'),None)
  if rid is None:return
  rt=json.loads(json.dumps(data(rid)));hsh=zlib.crc32(route.encode())
  for attr,key in attributes.items():
   if key.startswith('m_Color'):continue
   if (hsh,attr) in show:
    a,b=key.split('.');rt[a][b]=show[(hsh,attr)][0]
  node={'name':g['m_Name'],'path':route,'parent':parent,'anchorMin':rt['m_AnchorMin'],'anchorMax':rt['m_AnchorMax'],'pivot':rt['m_Pivot'],'position':rt['m_AnchoredPosition'],'size':rt['m_SizeDelta'],'scale':rt['m_LocalScale'],'rotation':round(math.degrees(2*math.atan2(rt['m_LocalRotation']['z'],rt['m_LocalRotation']['w'])),4),'active':bool(g.get('m_IsActive',1))}
  if (hsh,4) in show:node['rotation']=show[(hsh,4)][2]
  if rid in bindings:node['binding']=bindings[rid]
  for i in cs:
   if i in bindings:node['binding']=bindings[i]
   if objects[i].type.name!='MonoBehaviour':continue
   t=data(i)
   if 'm_Color' in t:
    node['color']=dict(t['m_Color'])
    if (hsh,zlib.crc32(b'm_Color.a')) in show:node['color']['a']=show[(hsh,zlib.crc32(b'm_Color.a'))][0]
   if i in slots:node['colorSlot']=slots[i]
   if 'm_Sprite' in t:
    sp=t['m_Sprite'];name=(data(sp['m_PathID']).get('m_Name') if sp['m_FileID']==0 and sp['m_PathID'] in objects else external.get(sp['m_PathID']))
    if name:node['image']={'folder':'skin' if sp['m_FileID']==0 else '[pack]skinres','name':name}
    if name and sp['m_FileID'] and sp['m_PathID'] in externalSprites:node['image'].update(type=t.get('m_Type',0),border=externalSprites[sp['m_PathID']]['m_Border'])
    node['preserveAspect']=bool(t.get('m_PreserveAspect',False))
   if 'm_Text' in t:node['text']=t.get('m_Text','');node['font']=t.get('m_FontData',{})
   if '_fontName' in t:node['fontName']=t['_fontName']
   if 'm_Alpha' in t:node['alpha']=show.get((hsh,zlib.crc32(b'm_Alpha')),[t['m_Alpha']])[0]
  index=len(nodes);nodes.append(node)
  for c in rt['m_Children']:
   child=data(c['m_PathID'])['m_GameObject']['m_PathID'];name=data(child)['m_Name'];walk(child,index,route+'/'+name if route else name)
 walk(root.path_id)
 layouts[path.rsplit('/',1)[1][:-7]]=nodes
raw=json.loads(skinpath.read_text());skins={k:{'group':(v['displaySkin']['skinGroupId'] or 'default').lower(),'colors':v['displaySkin']['colorList'],'content':v['displaySkin']['content'] or '', 'model':v['displaySkin']['modelName'] or '', 'drawer':' / '.join(v['displaySkin']['drawerList'] or []),'released':v['displaySkin'].get('getTime',0),'order':v['displaySkin'].get('sortId',0)} for k,v in raw['charSkins'].items()}
# Illustration prefab metrics available in the supplied Ling resource bundle.
illustrations={}
ling=bundle('char_2023_ling.ab');lo={o.path_id:o for o in ling.objects}
for path,root in ling.container.items():
 if not path.endswith('.prefab') or '/illust_' not in path:continue
 g=root.read_typetree();metric={}
 for c in g['m_Component']:
  o=lo[c['component']['m_PathID']];t=o.read_typetree()
  if o.type.name=='RectTransform':metric.update(size=t['m_SizeDelta'],position=t['m_AnchoredPosition'],pivot=t['m_Pivot'],scale=t['m_LocalScale'])
  if '_skinOffset' in t:metric['skinOffset']=t['_skinOffset']
  if t.get('m_Sprite',{}).get('m_PathID'):
   st=lo[t['m_Sprite']['m_PathID']].read_typetree();metric['sprite']={'rect':st['m_Rect'],'textureRect':st['m_RD']['textureRect'],'textureRectOffset':st['m_RD']['textureRectOffset']}
  if '_values' in t:metric['values']={v['key']:v['value'] for v in t['_values']}
 illustrations[path.rsplit('/',1)[1][:-7]]=metric
# Resolve the selection page against the same full canvas, ignoring its cached
# zero root size/scale (populated by Unity when the page is opened).
pe=bundle('skin_select_page.ab');po={o.path_id:o for o in pe.objects};pd={};pageNodes={}
def pdat(i):
 if i not in pd:pd[i]=po[i].read_typetree()
 return pd[i]
def pagewalk(gid,parent,route=''):
 g=pdat(gid);rt=next((pdat(c['component']['m_PathID']) for c in g['m_Component'] if po[c['component']['m_PathID']].type.name=='RectTransform'),None)
 if not rt:return
 px,py,pw,ph=parent;a=rt['m_AnchorMin'];b=rt['m_AnchorMax'];p=rt['m_Pivot'];pos=rt['m_AnchoredPosition'];sz=rt['m_SizeDelta'];w=pw*(b['x']-a['x'])+sz['x'];h=ph*(b['y']-a['y'])+sz['y'];x=px+pw*(a['x']+(b['x']-a['x'])*p['x'])+pos['x']-p['x']*w;y=py+ph*(a['y']+(b['y']-a['y'])*p['y'])+pos['y']-p['y']*h
 if not route:x,y,w,h=0,0,1535*810/862,810
 pageNodes[route]={'name':g['m_Name'],'rect':[v*862/810 for v in (x,810-y-h,w,h)]}
 for c in g['m_Component']:
  t=pdat(c['component']['m_PathID'])
  if 'm_Text' in t:pageNodes[route].update(font=t.get('m_FontData',{}),text=t['m_Text'])
  if '_fontName' in t:pageNodes[route]['fontName']=t['_fontName']
 for c in rt['m_Children']:
  child=pdat(c['m_PathID'])['m_GameObject']['m_PathID'];name=pdat(child)['m_Name'];pagewalk(child,(x,y,w,h),route+'/'+name if route else name)
pagewalk(pe.container['dyn/ui/pages/skin_select_page.prefab'].path_id,(0,0,1535*810/862,810))
card=pe.container['dyn/ui/skinselect/skin_select_obj.prefab'].read_typetree()
card_rt=next(pdat(c['component']['m_PathID']) for c in card['m_Component'] if po[c['component']['m_PathID']].type.name=='RectTransform')
# Card child rectangles, including the flipped lower portrait and alpha mask.
cardNodes={}
def cardwalk(gid,parent,route=''):
 g=pdat(gid);rt=next(pdat(c['component']['m_PathID']) for c in g['m_Component'] if po[c['component']['m_PathID']].type.name=='RectTransform')
 px,py,pw,ph=parent;a=rt['m_AnchorMin'];b=rt['m_AnchorMax'];p=rt['m_Pivot'];pos=rt['m_AnchoredPosition'];sz=rt['m_SizeDelta'];w=pw*(b['x']-a['x'])+sz['x'];h=ph*(b['y']-a['y'])+sz['y'];x=px+pw*(a['x']+(b['x']-a['x'])*p['x'])+pos['x']-p['x']*w;y=py+ph*(a['y']+(b['y']-a['y'])*p['y'])+pos['y']-p['y']*h
 if not route:x,y,w,h=0,0,card_rt['m_SizeDelta']['x'],card_rt['m_SizeDelta']['y']
 cardNodes[route]={'rect':[x,card_rt['m_SizeDelta']['y']-y-h,w,h],'scale':rt['m_LocalScale']}
 for c in rt['m_Children']:
  child=pdat(c['m_PathID'])['m_GameObject']['m_PathID'];cardwalk(child,(x,y,w,h),route+'/'+pdat(child)['m_Name'])
cardwalk(pe.container['dyn/ui/skinselect/skin_select_obj.prefab'].path_id,(0,0,154.4,394))
result={'canvas':{'referenceResolution':{'x':1280,'y':720},'matchWidthOrHeight':1,'nativeHeight':810},'cardNodes':cardNodes,'cardSize':card_rt['m_SizeDelta'],'source':'User supplied PC KR skin_groups.ab, skin_select_page.ab, char_2023_ling.ab; SkinAllShow settled channels evaluated. Unity relative anchors and scales are retained.','nativeHeight':810,'layouts':layouts,'skins':skins,'illustrations':illustrations,'page':pageNodes}
# Round serialized float noise, without discarding prefab-specific layouts.
result=json.loads(json.dumps(result,ensure_ascii=False),parse_float=lambda x:round(float(x),5))
out.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
print('Exported',len(layouts),'templates,',len(skins),'skin bindings,',len(pageNodes),'page nodes; bytes',out.stat().st_size)
