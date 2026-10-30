"""Resolve V074 resource-manifest dependencies without scanning every bundle.
Usage: python scripts/inspect_resource_manifest.py MANIFEST.idx BUNDLE_NAME
The 128-byte prefix precedes the FlatBuffer root. The input is read only.
"""
import sys,struct,json,pathlib

def dependencies(path,name):
 b=pathlib.Path(path).read_bytes();u=lambda p:struct.unpack_from('<I',b,p)[0];i=lambda p:struct.unpack_from('<i',b,p)[0];h=lambda p:struct.unpack_from('<H',b,p)[0]
 def fields(p):
  v=p-i(p);assert 4<=h(v)<=32;return [p+h(v+n) if h(v+n) else None for n in range(4,h(v),2)]
 def ref(p):return p+u(p)
 def text(p):
  t=ref(p);n=u(t);assert n<2048;return b[t+4:t+4+n].decode('utf-8')
 root=128+u(128);f=fields(root);v=ref(f[1]);assert u(v)<100000;rows=[ref(v+4+4*n) for n in range(u(v))];names=[text(fields(p)[0]) for p in rows];target=names.index(name);p=fields(rows[target])[3]
 if not p:return []
 q=ref(p);return [names[u(q+4+4*n)] for n in range(u(q))]
if __name__=='__main__':print(json.dumps(dependencies(sys.argv[1],sys.argv[2]),ensure_ascii=False,indent=2))
