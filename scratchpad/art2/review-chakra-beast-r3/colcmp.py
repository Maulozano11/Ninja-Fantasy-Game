import sys
from PIL import Image
import numpy as np
S=sys.argv[1]; R=sys.argv[2]
ref=Image.open(S+'/art2/REF-chakra-set-owner.jpg').convert('RGB')
sh=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')).astype(float)
FW,FH=127,93
f0=sh[:,0:FW]
sc=96/97.5
# his at game scale over frame coords
x0s=191-76/sc; y0s=100-59/sc
W=round(FW/sc); H=round(FH/sc)
# Use a high-res resample: crop exact float box via transform
his=ref.transform((FW,FH),Image.EXTENT,(x0s,y0s,x0s+FW/sc,y0s+FH/sc),Image.BOX)
h=np.asarray(his).astype(float)
bg=np.array([32,31,39.])
dh=np.abs(h-bg).sum(2)
hm=dh>40
om=f0[...,3]==255
print('his mask px',hm.sum(),'our opaque',om.sum(),'IoU %.3f'%((hm&om).sum()/(hm|om).sum()))
# colour diff on interior (both opaque, eroded)
def erode(m):
    e=m.copy(); e[1:]&=m[:-1]; e[:-1]&=m[1:]; e[:,1:]&=m[:,:-1]; e[:,:-1]&=m[:,1:]; return e
inn=erode(erode(om))&erode(hm)
d=np.abs(f0[...,:3]-h)[inn]
print('interior px',inn.sum(),'mean abs diff RGB',d.mean(0).round(1),'mean sum',d.sum(1).mean().round(1))
print('his mean RGB',h[inn].mean(0).round(1),'ours',f0[...,:3][inn].mean(0).round(1))
# hue/sat compare
import colorsys
def hs(a):
    hsv=np.array([colorsys.rgb_to_hsv(*(p/255)) for p in a]); return hsv
H1=hs(h[inn]); H2=hs(f0[...,:3][inn])
print('his mean S,V',H1[:,1].mean().round(3),H1[:,2].mean().round(3),' ours',H2[:,1].mean().round(3),H2[:,2].mean().round(3))
# region diffs: grid 4x4
for gy in range(0,FH,24):
    row=[]
    for gx in range(0,FW,32):
        m=inn[gy:gy+24,gx:gx+32]
        if m.sum()<20: row.append('   --   '); continue
        a=h[gy:gy+24,gx:gx+32][m].mean(0); b=f0[gy:gy+24,gx:gx+32,:3][m].mean(0)
        row.append('%+4d%+4d%+4d'%tuple((b-a).round().astype(int)))
    print(gy,' | '.join(row))
# save diff vis
vis=np.zeros((FH,FW,3),np.uint8)
vis[hm&~om]=(255,60,60); vis[om&~hm]=(60,160,255); vis[om&hm]=(90,90,90)
Image.fromarray(vis).resize((FW*5,FH*5),Image.NEAREST).save(R+'/silh-diff.png')
his.resize((FW*3,FH*3),Image.NEAREST).save(R+'/his-game-mine.png')
