import numpy as np, glob, os
from PIL import Image
G=256
D='phase/review/raw'
def load(p): return np.fromfile(p,dtype=np.uint8).reshape(G,G,4).astype(float)
rows=[]
for k in range(8):
  for pose in ['idle_0','run_2']:
    p=load(f'{D}/p{k}_{pose}.raw'); s=load(f'{D}/s{k}_{pose}.raw')
    fig=s[...,3]>=24
    a=p[...,3]/255
    # composite over black
    comp=p[...,:3]*a[...,None]
    px=comp[fig]
    lum=0.299*px[:,0]+0.587*px[:,1]+0.114*px[:,2]
    # classes by step colour
    col=p[fig][:,:3]
    al=p[fig][:,3]
    nearwhite=((col>200).all(1)).mean()
    rim_line=(col[:,0]>=150).mean()
    print(k,pose,'fig',fig.sum(),'mean over black',px.mean(0).round(), 'median lum',round(np.median(lum)),'frac R>=150 (lines/rim/hair)',round(rim_line,2),'frac near-white',round(nearwhite,2),'alpha mean',round(al.mean()),'alpha min',al.min())
