import sys, re, json
import numpy as np
from PIL import Image
exec(open('metrics.py').read().split("LW=np.array")[0].replace("sys.argv[1]", "'dev.ts'"))
his = np.asarray(Image.open('dev/crows-his-R.png').convert('RGBA')).astype(float)
ours = fly[4].astype(float)
bg = np.array([31,31,41.])
a = ours[...,3:4]/255
comp = ours[...,:3]*a + bg*(1-a)
d = np.abs(comp-his[...,:3]).mean(-1)
print('mean err where his fg', d[np.abs(his[...,:3]-bg).sum(-1)>15].mean(), 'where ours opaque & his bg', d[(a[...,0]>0)&(np.abs(his[...,:3]-bg).sum(-1)<=15)].mean(), ((a[...,0]>0)&(np.abs(his[...,:3]-bg).sum(-1)<=15)).sum())
img = np.clip(d*4,0,255).astype(np.uint8)
Image.fromarray(img).resize((img.shape[1]*3, img.shape[0]*3), Image.NEAREST).save('dbg/diffR.png')
