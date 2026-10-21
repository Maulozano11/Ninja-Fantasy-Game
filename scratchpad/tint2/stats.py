import sys, colorsys, numpy as np
from PIL import Image
R='/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_jutsu-tint-2/src/assets/world/'
for f in sys.argv[1:]:
    a=np.asarray(Image.open(R+f).convert('RGBA')).reshape(-1,4)
    a=a[a[:,3]>=160].astype(float)/255
    r,g,b=a[:,0],a[:,1],a[:,2]
    mx=a[:,:3].max(1); mn=a[:,:3].min(1); l=(mx+mn)/2; d=mx-mn
    s=np.where(d==0,0,d/(1-abs(2*l-1)+1e-9))
    h=np.zeros_like(l)
    m=d>0
    rr=np.where(mx==r,((g-b)/(d+1e-9))%6,np.where(mx==g,(b-r)/(d+1e-9)+2,(r-g)/(d+1e-9)+4))*60
    h=np.where(m,rr,0)
    y=0.299*r+0.587*g+0.114*b
    el=(s>0.25)&(l>0.1)
    hh=h[el]
    # circular mean hue
    ang=np.deg2rad(hh); mh=np.rad2deg(np.arctan2(np.sin(ang).mean(),np.cos(ang).mean()))%360
    print(f, 'n',len(y),'hue(mean sat>.25)',round(mh), 'hue p10/p90',np.percentile(hh,[10,90]).round(), 'sat med',round(float(np.median(s[l>0.1])),2),'luma p2/20/50/80/98',np.percentile(y[l>0.1],[2,20,50,80,98]).round(3), 'maxL', round(float(l.max()),3))
