from PIL import Image
import numpy as np, sys
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
R=S+'/review-genjutsu-beast-r2'
im=Image.open(S+'/REF-genjutsu-set-owner.jpg').convert('RGB')
a=np.asarray(im).astype(int)
# panel background estimate
pan=a[800:1005,265:780]
print('panel corner samples', a[805,270], a[1000,775], a[850,520], a[990,520])
bg=np.median(pan.reshape(-1,3),axis=0); print('bg median',bg)
d=np.abs(pan-bg).sum(axis=2)
mask=d>18
ys,xs=np.nonzero(mask)
print('content bbox (sheet):', xs.min()+265, xs.max()+265, ys.min()+800, ys.max()+800)
# column profile to find split
col=mask.sum(axis=0)
for x in range(200,330):
    if col[x]<3: print('low col', x+265, col[x])
