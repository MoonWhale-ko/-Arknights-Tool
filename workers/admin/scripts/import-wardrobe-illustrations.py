"""Merge original illustration transforms from selected client AssetBundles.
Usage: python import-wardrobe-illustrations.py --scene SCENE_JSON --catalog CATALOG_JSON \
    --report COVERAGE_JSON file1.ab file2.ab ...
Only illustration prefab components and sprite metadata are read. No textures are
exported. Missing prefabs are reported and never assigned another character's data.
Requires UnityPy and lz4.
"""
import argparse, gzip, json, math
from pathlib import Path
import UnityPy, lz4.block
from UnityPy.helpers import CompressionHelper

# LZ4AK conversion adapted from Ark-Unpacker (BSD-3-Clause), as in the UI extractor.
# https://github.com/isHarryh/Ark-Unpacker
def lz4ak(data, size):
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

def extract(path):
    env=UnityPy.load(str(path));objects={o.path_id:o for o in env.objects};result={};unresolved=[]
    for asset,root in env.container.items():
        if '/illust_' not in asset or not asset.endswith('.prefab'):continue
        key=asset.rsplit('/',1)[-1][:-7];metric={'sourceBundle':path.name,'sourceAsset':asset};sprite=None
        for c in root.read_typetree()['m_Component']:
            obj=objects[c['component']['m_PathID']];t=obj.read_typetree()
            if obj.type.name=='RectTransform':
                metric.update(size=t['m_SizeDelta'],position=t['m_AnchoredPosition'],pivot=t['m_Pivot'],scale=t['m_LocalScale'])
            if '_skinOffset' in t:metric['skinOffset']=t['_skinOffset']
            if '_values' in t:metric['values']={v['key']:v['value'] for v in t['_values']}
            sp=t.get('m_Sprite',{})
            if sp.get('m_PathID') and not sp.get('m_FileID'):
                sprite=objects[sp['m_PathID']].read_typetree()
        if not sprite or not all(k in metric for k in ['size','position','pivot','scale']):
            unresolved.append(key);continue
        metric['sprite']={'rect':sprite['m_Rect'],'textureRect':sprite['m_RD']['textureRect'],'textureRectOffset':sprite['m_RD']['textureRectOffset']}
        offset=metric.get('skinOffset',{});size=offset.get('size') if offset.get('enableSize') else metric['size']
        if not all(math.isfinite(size[k]) and size[k]>0 for k in ['x','y']):
            unresolved.append(key);continue
        result[key]=metric
    return result,unresolved

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--scene',type=Path,required=True);parser.add_argument('--catalog',type=Path,required=True);parser.add_argument('--report',type=Path,required=True)
    parser.add_argument('--metrics-dir',type=Path);parser.add_argument('--source-kind',default='provided');parser.add_argument('bundles',type=Path,nargs='*');args=parser.parse_args()
    if not args.bundles and not args.metrics_dir:parser.error('Provide bundles or --metrics-dir')
    scene=json.loads(args.scene.read_text());unresolved=[];imports={}
    def merge(name,metrics,missing):
        for m in metrics.values():m['sourceCategory']=args.source_kind
        scene['illustrations'].update(metrics);imports[args.source_kind+'/'+name]=len(metrics);unresolved.extend(missing)
    for path in args.bundles:
        metrics,missing=extract(path);merge(path.name,metrics,missing)
    if args.metrics_dir:
        for path in sorted(args.metrics_dir.glob('*.json')):
            data=json.loads(path.read_text());merge(path.stem,data['metrics'],data['unresolved'])
    catalog=json.loads(args.catalog.read_text())['skins'];rows=[]
    for skin in catalog:
        if not skin['charId'].startswith('char_'):continue
        m=scene['illustrations'].get(skin.get('illustration'),{});native=all(k in m for k in ['sprite','size','position','pivot','scale'])
        rows.append({'id':skin['id'],'charId':skin['charId'],'operator':skin['operator'],'illustration':skin.get('illustration'),'basic':bool(skin.get('basic')),'nativeIllustration':native,'nativeTemplate':scene['skins'].get(skin['id'],{}).get('group') in scene['layouts']})
    basic=[r for r in rows if r['basic']];purchased=[r for r in rows if not r['basic']]
    report={'operatorCount':len({r['charId'] for r in rows}),'skinCount':len(rows),'nativeIllustrationCount':sum(r['nativeIllustration'] for r in rows),'basicSkinCount':len(basic),'nativeBasicCount':sum(r['nativeIllustration'] for r in basic),'purchasedSkinCount':len(purchased),'nativePurchasedCount':sum(r['nativeIllustration'] for r in purchased),'nativeTemplateCount':sum(r['nativeTemplate'] for r in rows),'imports':imports,'unresolvedSprites':unresolved,'skins':rows}
    raw=json.dumps(scene,ensure_ascii=False,separators=(',',':')).encode();args.scene.write_bytes(raw);args.scene.with_suffix('.json.gz').write_bytes(gzip.compress(raw,mtime=0));args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k not in ['skins','imports']},ensure_ascii=False))
if __name__=='__main__':main()
