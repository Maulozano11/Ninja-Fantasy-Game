import numpy as np
from PIL import Image
ref = np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-ref/owner-phase-ref.jpg').convert('RGB')).astype(float)
RAMP = np.array([[12,21,114],[20,36,156],[32,54,186],[46,74,208],[70,102,228],[108,140,245],[158,190,254],[212,238,254],[240,254,255]], float)
# figure: blue-dominant and bright enough
r,g,b = ref[...,0], ref[...,1], ref[...,2]
fig = (b > 110) & (b > r + 40)
print('figure px', fig.sum())
px = ref[fig]
print('mean', px.mean(0).round(1))
d = ((px[:,None,:]-RAMP[None])**2).sum(-1)
st = d.argmin(1)
h = np.bincount(st, minlength=9)/len(st)
print('ramp hist', (h*100).round(1))
print('pale 5-8', (h[5:].sum()*100).round(1), 'main 3-4', (h[3:5].sum()*100).round(1), '0-2', (h[:3].sum()*100).round(1))
# percentiles of luminance
lum = 0.299*px[:,0]+0.587*px[:,1]+0.114*px[:,2]
print('lum pct', np.percentile(lum,[10,25,50,75,90,97]).round(0))
# per-lum-bucket mean colour
for lo,hi in [(0,50),(50,70),(70,90),(90,110),(110,140),(140,170),(170,200),(200,256)]:
    m=(lum>=lo)&(lum<hi)
    if m.sum(): print(lo,hi, round(m.mean()*100,1), px[m].mean(0).round(0))
