import sys; sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import ImageDraw
fs=frames('blast','blast'); ts=[]
LC=np.array([108,233,87])
for i in [3,6,7,8,9,10]:
    f=fs[i]; a=f[...,3].astype(int); r,g,b=[f[...,k].astype(int) for k in range(3)]
    light=(np.abs(f[...,:3].astype(int)-LC).sum(2)==0)
    glow=(a>0)&(a<80)&(g>r+60)&(g>b+60)&~light
    vis=np.zeros(a.shape+(3,),np.uint8); vis[(a>=80)]=(70,70,110); vis[glow]=(0,255,0)
    # vertical runs
    runs=0;longest=0
    for x in range(a.shape[1]):
        col=glow[:,x]; y=0
        while y<len(col):
            if col[y]:
                y0=y
                while y<len(col) and col[y]: y+=1
                L=y-y0; longest=max(longest,L); runs+= L>=8
            y+=1
    print(i,'glow px',int(glow.sum()),'vertical glow runs >=8px:',runs,'longest',longest)
    t=Image.fromarray(up(vis[0:120,40:180],3)); ImageDraw.Draw(t).text((3,2),str(i),fill=(255,255,0)); ts.append(t)
W,H=ts[0].size; o=Image.new('RGB',(3*(W+4),2*(H+4)),(255,255,255))
for j,t in enumerate(ts): o.paste(t,((j%3)*(W+4),(j//3)*(H+4)))
o.save(R+'/blast-glow-left.png')
