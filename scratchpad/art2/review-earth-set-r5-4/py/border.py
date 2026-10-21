import sys; sys.path.insert(0, sys.argv[1])
from lib import *
tot=0;bad=[]
for name,s in M['sprites'].items():
    for an in s['anims']:
        for i,f in enumerate(frames(name,an)):
            a=f[...,3]; tot+=1
            sides={'top':a[0],'bottom':a[-1],'left':a[:,0],'right':a[:,-1]}
            for k,v in sides.items():
                if name=='stream' and k in('left','right'): continue
                if name=='stream_head' and k=='left': continue
                n=int((v>0).sum())
                if n: bad.append((name,an,i,k,n))
print('frames',tot,'bad',bad)
# also: stream_head right/top/bottom, stream top/bottom 
