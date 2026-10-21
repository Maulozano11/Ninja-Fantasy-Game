import json, sys, numpy as np
from PIL import Image
LC=(108,233,87)
def frs(G):
  man=json.load(open(G+'/manifest.json'))['sprites']['blast']
  sh=np.asarray(Image.open(G+'/'+man['file']).convert('RGBA')).astype(int)
  fw,fh=man['frameW'],man['frameH']; r=man['anims']['blast']['row']
  return [sh[r*fh:(r+1)*fh,i*fw:(i+1)*fw] for i in range(16)]
for G in sys.argv[1:]:
  F=frs(G); f4=F[4]; pool4=(f4[...,3]>=200)
  res=[]; enc=[]
  for i,f in enumerate(F):
    a=f[...,3]
    light=(a>=24)&(np.abs(f[...,0]-LC[0])<=3)&(np.abs(f[...,1]-LC[1])<=3)&(np.abs(f[...,2]-LC[2])<=3)
    nb=np.zeros_like(light)
    nb[1:]|=light[:-1]; nb[:-1]|=light[1:]; nb[:,1:]|=light[:,:-1]; nb[:,:-1]|=light[:,1:]
    un=pool4&(a<24)&nb
    res.append(int(un.sum()))
    # enclosed pockets of alpha<24 (not reachable from the border through alpha<24)
    op=a<24; H,W=op.shape; seen=np.zeros_like(op); st=[(y,x) for x in range(W) for y in (0,H-1) if op[y,x]]+[(y,x) for y in range(H) for x in (0,W-1) if op[y,x]]
    for y,x in st: seen[y,x]=1
    while st:
      y,x=st.pop()
      for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
        v,u=y+dy,x+dx
        if 0<=v<H and 0<=u<W and op[v,u] and not seen[v,u]: seen[v,u]=1; st.append((v,u))
    e=op&~seen&nb
    enc.append(int((op&~seen).sum()))
  print(G); print('  unlit px under the frame-4 slime touching the light, per frame:',res); print('  enclosed px of alpha < 24, per frame:',enc)
