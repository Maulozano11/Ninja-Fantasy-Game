import sys; sys.path.insert(0, sys.argv[1])
from lib import *
# per sprite: min distance from art (alpha>0) to each border, over all frames; also check stream sides
for name,s in M['sprites'].items():
    md={'top':999,'bottom':999,'left':999,'right':999}
    for an in s['anims']:
        for f in frames(name,an):
            a=f[...,3]>0
            ys,xs=np.nonzero(a)
            if len(ys)==0: continue
            md['top']=min(md['top'],ys.min()); md['bottom']=min(md['bottom'],a.shape[0]-1-ys.max())
            md['left']=min(md['left'],xs.min()); md['right']=min(md['right'],a.shape[1]-1-xs.max())
    print(name, md)
