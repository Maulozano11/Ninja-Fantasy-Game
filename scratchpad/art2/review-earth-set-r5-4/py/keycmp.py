import sys, json; sys.path.insert(0, sys.argv[1])
from lib import *
B=sys.argv[2]
MB=json.load(open(B+'/manifest.json'))
KEY={'hit':('hit',3),'multi_hit':('hit',3),'blast':('blast',4),'wall':('rise',11),'wall_diag':('rise',11),'wall_depth':('rise',11)}
def fr2(G,Mn,name,anim,i):
    s=Mn['sprites'][name]; im=np.array(Image.open(G+'/'+s['file']).convert('RGBA'))
    a=s['anims'][anim]; w,h=s['frameW'],s['frameH']; r=a['row']
    return im[r*h:(r+1)*h, i*w:(i+1)*w], s['anchor']
for n,s in M['sprites'].items():
    an,i=KEY.get(n,(list(s['anims'])[0],0))
    A,aa=fr2(G,M,n,an,i); Bf,ab=fr2(B,MB,n,an,i)
    # place both on canvas by anchor
    W=400;H=400; ca=np.zeros((H,W,4),np.uint8); cb=ca.copy()
    ox,oy=150,150
    ca[oy-aa[1]:oy-aa[1]+A.shape[0], ox-aa[0]:ox-aa[0]+A.shape[1]]=A
    cb[oy-ab[1]:oy-ab[1]+Bf.shape[0], ox-ab[0]:ox-ab[0]+Bf.shape[1]]=Bf
    d=(ca.astype(int)!=cb.astype(int)).any(-1).sum()
    print(n, an, i, 'differing px vs before (anchor-aligned):', d)
