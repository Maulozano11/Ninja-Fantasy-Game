import sys, numpy as np
from PIL import Image
S=sys.argv[1]; R=sys.argv[2]
sh=Image.open(S+'/staging/vfx_beasts_crows/genjutsu.png').convert('RGBA')
W,H=212,167
BG=(31,31,41)
def onbg(im,bg):
    b=Image.new('RGBA',im.size,bg+(255,)); b.alpha_composite(im); return b.convert('RGB')
for r,name in [(0,'fly'),(1,'summon')]:
    for i in range(6):
        f=sh.crop((i*W,r*H,(i+1)*W,(r+1)*H))
        f.save(f'{R}/v5-{name}{i}.png')
        a=np.asarray(f)
        A=a[:,:,3]
        border=np.concatenate([A[0],A[-1],A[:,0],A[:,-1]])
        print(name,i,'opaque',(A==255).sum(),'semi',((A>0)&(A<255)).sum(),'alphas',sorted(set(A.flatten().tolist())),'border>0',(border>0).sum())
