import json, base64, re
import numpy as np
from PIL import Image
REF='/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-earth-v3-refdata.ts'
OUT='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/earth-r5'
_c=None
def load(path=REF):
    global _c
    if _c is None:
        t=open(path).read()
        i=t.index('EV3_REF: Record<string, EarthRef> = ')+len('EV3_REF: Record<string, EarthRef> = ')
        j=t.rindex('};')
        _c=json.loads(t[i:j+1])
    return _c
def pal(name):
    r=load()[name]
    cols=[]; kinds=[]
    for p in r['pal']:
        h=p['rgba']; cols.append(tuple(int(h[k:k+2],16) for k in (1,3,5,7))); kinds.append(p['kind'])
    return np.array(cols,np.uint8), kinds
def part(name,p,P=0):
    r=load()[name]
    L=np.zeros((r['h']+2*P,r['w']+2*P),np.int32)
    pc=r['pieces'].get(p)
    if not pc: return L
    b=base64.b64decode(pc['rle']); i=0
    for k in range(0,len(b)-1,2):
        n,v=b[k],b[k+1]
        if v:
            for j in range(n):
                L[P+pc['y']+(i+j)//pc['w'], P+pc['x']+(i+j)%pc['w']]=v
        i+=n
    return L
def pieces(name): return list(load()[name]['pieces'].keys())
def render(name,L):
    cols,_=pal(name)
    out=np.zeros(L.shape+(4,),np.uint8)
    m=L>0
    out[m]=cols[L[m]-1]
    return out
def show(name, layers, fn, z=3, bg=(36,36,48)):
    tiles=[]
    for L in layers:
        rgba=render(name,L)
        b=Image.new('RGBA',(L.shape[1],L.shape[0]),bg+(255,)); b.alpha_composite(Image.fromarray(rgba)); tiles.append(b.convert('RGB'))
    w,h=tiles[0].size
    o=Image.new('RGB',((w+2)*len(tiles),h),(255,0,255))
    for k,t in enumerate(tiles): o.paste(t,(k*(w+2),0))
    o=o.resize((o.width*z,o.height*z),Image.NEAREST); o.save(OUT+'/'+fn); return OUT+'/'+fn
