import json, sys, numpy as np
from PIL import Image
G=sys.argv[1]
man=json.load(open(G+'/manifest.json'))['sprites']['blast']
sh=np.asarray(Image.open(G+'/'+man['file']).convert('RGBA')).astype(int)
fw,fh=man['frameW'],man['frameH']; r=man['anims']['blast']['row']
for i in range(16):
  f=sh[r*fh:(r+1)*fh,i*fw:(i+1)*fw]
  op=f[...,3]>=200
  cols=range(70,136)
  tops=[np.nonzero(op[:,x])[0].min() if op[:,x].any() else fh for x in cols]
  crown=min(tops)
  g=(f[...,3]>=8)&(f[...,3]<=50)&(f[...,1]>f[...,0]+40)&(f[...,1]>f[...,2]+40)
  above=g[:max(0,crown-1),60:140]
  ys,xs=np.nonzero(above)
  print(i,'crown top',crown,'green glow px above the crown',above.sum(), ('x %d-%d'%(xs.min()+60,xs.max()+60)) if len(xs) else '')
