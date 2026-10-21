import pickle, numpy as np, sys
from PIL import Image
D=sys.argv[1]
st=pickle.load(open(D+'/state.pkl','rb'))
C=st['C']; fly=st['fly']
bg=np.array([31,33,46.])
def up(a,k): return np.repeat(np.repeat(a,k,0),k,1)
rows=[]
for fi,k in ((0,'L'),(5,'R')):
    c=C[k]; f=fly[fi].astype(float)
    a=f[...,3:4]/255; comp=f[...,:3]*a+bg*(1-a)
    ours=comp; his=c['col']
    hp=(his[...,0]>his[...,1]+10)&(his[...,2]>his[...,1]+10)&(c['purple']|c['mist_front'])
    op=(f[...,3]>0)&(ours[...,0]>ours[...,1]+10)&(ours[...,2]>ours[...,1]+10)
    lost=hp&~op
    ys,xs=np.nonzero(c['body'])
    y0,y1=int(ys.max())-34,int(ys.max())+3; x0,x1=st['AX']-5,int(xs.max())+6
    m=ours.copy(); m[lost]=(255,255,0)
    row=np.concatenate([his[y0:y1,x0:x1],np.full((y1-y0,1,3),200.),ours[y0:y1,x0:x1],np.full((y1-y0,1,3),200.),m[y0:y1,x0:x1]],1)
    rows.append(up(row.clip(0,255).astype(np.uint8),7))
w=max(r.shape[1] for r in rows)
Image.fromarray(np.concatenate([np.pad(r,((0,4),(0,w-r.shape[1]),(0,0))) for r in rows],0)).save(D+'/neckviz.png')
