import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/gj-r3/tools')
from common import *
names=sys.argv[1].split(',')
K=int(sys.argv[2]) if len(sys.argv)>2 else 3
for n in names:
    h=his(n); o=key(n)
    a=np.asarray(o)[...,3]
    # mark anchor
    def mark(img):
        img=up(img,K).copy(); d=ImageDraw.Draw(img); ax,ay=MAN[n]['anchor']
        d.rectangle((ax*K,ay*K,ax*K+K-1,ay*K+K-1),outline=(255,255,0)); return img
    hb=on(o,HISBG); gr=on(o,GRASS)
    # diff (ours on his bg vs his)
    d=np.abs(np.asarray(hb).astype(int)-np.asarray(h).astype(int)).sum(-1)
    dm=Image.fromarray(np.clip(d*2,0,255).astype('uint8')).convert('RGB')
    row([mark(h),mark(hb),mark(gr),up(dm,K)]).save(OUT+'/cmp_%s.png'%n)
    print(n,o.size,'mean diff',d.mean().round(1))
