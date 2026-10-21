# Saves the images the owner attached (newest last) from this session's transcript: lastimg.py <n> <outdir>
import json, base64, io, sys, os
from PIL import Image
p='/root/.claude/projects/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e.jsonl'
n=int(sys.argv[1]); out=sys.argv[2]
found=[]
for k,l in enumerate(open(p)):
    if '"attachment"' not in l or 'base64' not in l: continue
    j=json.loads(l)
    if j.get('type')!='attachment': continue
    def walk(o):
        if isinstance(o,dict):
            if o.get('type')=='image' and isinstance(o.get('source'),dict) and o['source'].get('data'): found.append((k,o['source']))
            for v in o.values(): walk(v)
        elif isinstance(o,list):
            for v in o: walk(v)
    walk(j)
for i,(k,s) in enumerate(found[-n:]):
    b=base64.b64decode(s['data']); im=Image.open(io.BytesIO(b))
    path=os.path.join(out,'att-%d-%d.jpg'%(k,i)); open(path,'wb').write(b); print(path, im.size)
