import sys
sys.argv=[sys.argv[0]]+sys.argv[1:]
exec(open('metrics.py').read().split('\ndef main')[0])
import numpy as np
from PIL import Image
frames, anchor, off = load(sys.argv[1])
H, W = frames[0].shape[:2]
def bodym(f):
    op = f[..., 3] == 255
    wm = warm(f); wm[:, int(W*0.78):] = False
    b = op & ~wm
    out = np.zeros_like(b)
    for c in comps(b):
        if len(c) > 200: out[c[:,0], c[:,1]] = True
    return out
tiles=[]
for a,b in [(2,3),(7,0),(1,2),(5,6)]:
    A,B=bodym(frames[a]),bodym(frames[b])
    x=A^B; u=(A|B).sum()
    yy,xx=np.mgrid[0:H,0:W]
    reg={'tail x<95':xx<95,'legs y>120':(yy>120)&(xx>=95),'back y<55':(yy<55)&(xx>=95),'mid':(yy>=55)&(yy<=120)&(xx>=95)}
    print(f'{a}->{b} xor {x.sum()} / union {u} = {x.sum()/u:.1%}', {k:int((x&m).sum()) for k,m in reg.items()})
    v=np.zeros((H,W,3),np.uint8); v[A&B]=(90,90,90); v[A&~B]=(255,60,60); v[B&~A]=(60,220,255)
    tiles.append(Image.fromarray(v).resize((W*2,H*2),Image.NEAREST))
o=Image.new('RGB',(W*4+12,H*4+12),(255,255,255))
for i,t in enumerate(tiles): o.paste(t,((i%2)*(W*2+12),(i//2)*(H*2+12)))
o.save(sys.argv[2])
