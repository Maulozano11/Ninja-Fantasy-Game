import sys
from PIL import Image
import numpy as np
ICONS=sys.argv[1]; OUT=sys.argv[2]
exec(open(sys.argv[3]).read().split("from PIL")[0]) if False else None
def lab1(c):
    a=np.array(c,float)/255; l=np.where(a<=0.04045,a/12.92,((a+0.055)/1.055)**2.4)
    R,G,B=l
    L=np.cbrt(0.4122214708*R+0.5363325363*G+0.0514459929*B); M=np.cbrt(0.2119034982*R+0.6806995451*G+0.1073969566*B); S=np.cbrt(0.0883024619*R+0.2817188376*G+0.6299787005*B)
    return np.array([0.2104542553*L+0.793617785*M-0.0040720468*S,1.9779984951*L-2.428592205*M+0.4505937099*S,0.0259040371*L+0.7827717662*M-0.808675766*S])
ids=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
for iid in ids:
  for fn in (f'{iid}.png',f'{iid}@2x.png'):
    im=np.asarray(Image.open(f'{ICONS}/{fn}').convert('RGB')).astype(int)
    H,W,_=im.shape; key=im[...,0]*65536+im[...,1]*256+im[...,2]
    seen=np.zeros((H,W),bool); lows=[];highs=[]
    mark=Image.fromarray(im.astype(np.uint8)).convert('RGB')
    mk=np.asarray(mark).copy()//3
    for y in range(H):
        for x in range(W):
            if seen[y,x]: continue
            v=key[y,x]; st=[(y,x)]; seen[y,x]=True; pts=[]
            while st:
                cy,cx=st.pop(); pts.append((cy,cx))
                for dy in (-1,0,1):
                    for dx in (-1,0,1):
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<H and 0<=nx<W and not seen[ny,nx] and key[ny,nx]==v:
                            seen[ny,nx]=True; st.append((ny,nx))
            if len(pts)<=2:
                S=set(pts); nb=[]
                for (cy,cx) in pts:
                    for dy in (-1,0,1):
                        for dx in (-1,0,1):
                            ny,nx=cy+dy,cx+dx
                            if 0<=ny<H and 0<=nx<W and (ny,nx) not in S: nb.append(im[ny,nx])
                c=lab1(im[pts[0]]); nm=np.mean([lab1(n) for n in nb],0)
                d=np.linalg.norm(c-nm)
                (lows if d<0.10 else highs).append(pts)
                col=(255,0,255) if d<0.10 else (0,255,0)
                for p in pts: mk[p]=col
    print(f'{fn:34s} tiny clusters: low-contrast(<0.10 dE) {len(lows):4d}  high-contrast {len(highs):4d}')
    Image.fromarray(mk.astype(np.uint8)).resize((W*8,H*8) if W==44 else (W*5,H*5),Image.NEAREST).save(f'{OUT}/tiny-{fn}')
