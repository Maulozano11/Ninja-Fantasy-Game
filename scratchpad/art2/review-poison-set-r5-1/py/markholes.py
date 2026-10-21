import sys; sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import ImageDraw
name,an,k=sys.argv[2],sys.argv[3],int(sys.argv[4])
fs=frames(name,an); ts=[]
for i,f in enumerate(fs):
    c=comp(f,(31,33,46)).copy()
    e=enclosed(f[...,3].astype(int),128)
    c[e]=(255,0,0)
    t=Image.fromarray(up(c,k)); ImageDraw.Draw(t).text((3,2),str(i),fill=(255,255,0)); ts.append(t)
W,H=ts[0].size; n=len(ts); cols=min(n,8)
o=Image.new('RGB',(cols*(W+4),((n+cols-1)//cols)*(H+4)),(255,255,255))
for j,t in enumerate(ts): o.paste(t,((j%cols)*(W+4),(j//cols)*(H+4)))
o.save(R+'/holes-%s-%s.png'%(name,an)); print(o.size)
