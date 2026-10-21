from fr import *
import sys
name,anim=sys.argv[1],sys.argv[2]
lo=int(sys.argv[3]) if len(sys.argv)>3 else 100
hi=int(sys.argv[4]) if len(sys.argv)>4 else 200
fs,(ax,ay)=frames(name,anim)
def slits(f):
    a=f[:,:,3].astype(int); H,W=a.shape
    pad=np.zeros((H+4,W+4),int); pad[2:-2,2:-2]=a
    res=np.zeros((H,W),bool)
    for dx,dy in [(1,0),(0,1),(1,1),(1,-1)]:
        s1=np.maximum(pad[2+dy:H+2+dy,2+dx:W+2+dx], pad[2+2*dy:H+2+2*dy,2+2*dx:W+2+2*dx])
        s2=np.maximum(pad[2-dy:H+2-dy,2-dx:W+2-dx], pad[2-2*dy:H+2-2*dy,2-2*dx:W+2-2*dx])
        res|=(np.minimum(s1,s2)>=hi)
    return res&(a<lo)
out=[]
for i,f in enumerate(fs):
    m=slits(f); out.append(int(m.sum()))
print(name,anim,'slit px (alpha<%d between alpha>=%d within 2px):'%(lo,hi),out)
if len(sys.argv)>5:
    i=int(sys.argv[5]); m=slits(fs[i]); ys,xs=np.nonzero(m); print(list(zip(xs.tolist(),ys.tolist()))[:200])
