import json, sys, colorsys
from PIL import Image
import numpy as np
from collections import Counter
root='src/assets/world'
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def hx(c): return '#%02x%02x%02x'%c
def hsl(c):
    h,l,s=colorsys.rgb_to_hls(*(v/255 for v in c)); return f"h{h*360:5.0f} s{s*100:4.0f} l{l*100:4.0f}"
g=sys.argv[1]; names=sys.argv[2].split(',') if len(sys.argv)>2 and sys.argv[2] else None
extra=sys.argv[3] if len(sys.argv)>3 else None
m=json.load(open(f'{root}/{g}/manifest.json'))
tot=Counter(); tota=Counter()
files=[(n,s['file']) for n,s in m['sprites'].items() if names is None or n in names]
if extra: files=[(extra, extra)]
for n,f in files:
    p=f'{root}/{g}/{f}' if not extra else extra
    a=np.array(Image.open(p).convert('RGBA')).reshape(-1,4)
    vis=a[a[:,3]>0]
    tot.update(map(tuple,vis[:,:3].tolist()))
N=sum(tot.values())
print(g, [n for n,_ in files], 'distinct', len(tot), 'px', N)
top=[c for c,_ in tot.most_common(int(sys.argv[4]) if len(sys.argv)>4 else 40)]
cov=sum(tot[c] for c in top)/N
for c in sorted(top,key=lum):
    print(f"  {hx(c)} {hsl(c)} lum{lum(c):5.0f} n={tot[c]:8d} {tot[c]/N*100:5.2f}%")
print('  top coverage %.2f%%'%(cov*100))
