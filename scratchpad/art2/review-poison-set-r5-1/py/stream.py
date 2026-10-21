import sys; sys.path.insert(0, sys.argv[1])
from lib import *
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/poison-set-owner-reference.jpg').convert('RGB')
W0,H0=ref.size; sx=64/65.9; sy=0.98
refs=np.array(ref.resize((round(W0*sx),round(H0*sy)),Image.BILINEAR)).astype(float)
PANEL=(31,33,46)
st=frames('stream','fly')[0]; hd=frames('stream_head','fly')[0]
# build beam: 4 tiles then head: head anchor (32,36) at tile end+32 => head frame x0 = end-0? head anchor x=32 means beam centre line, 32 px past tile end -> head frame left = tile end
N=3
H=72; Wt=N*64+70
beam=np.zeros((H,Wt,4),np.uint8)
for i in range(N): beam[4:68, i*64:(i+1)*64]=st
hb=beam[:, N*64:N*64+70]
beam[:, N*64:N*64+70]=over(hd, hb)
a=beam[...,3:4]/255
ours=beam[...,:3]*a+np.array(PANEL)*(1-a)
best=None
wt=a[...,0]>0.5
for Y in range(round(25*sy),round(50*sy)):
    for X in range(round(250*sx),round(330*sx)):
        his=refs[Y:Y+H,X:X+Wt]
        if his.shape[:2]!=(H,Wt): continue
        d=np.abs(his-ours).sum(2); sc=(d*wt).sum()/wt.sum()
        if best is None or sc<best[0]: best=(sc,X,Y)
print('beam+head best', best, 'orig x', best[1]/sx, 'y', best[2]/sy)
sc,X,Y=best
his=refs[Y:Y+H,X:X+Wt].astype(np.uint8)
ong=(beam[...,:3]*a+grass(H,Wt)*(1-a)).astype(np.uint8)
d=np.abs(his.astype(int)-ours.astype(int)).sum(2).clip(0,255).astype(np.uint8)
gap=np.full((3,Wt,3),255,np.uint8)
img=np.concatenate([his,gap,ours.astype(np.uint8),gap,ong,gap,np.stack([d]*3,-1)],0)
Image.fromarray(up(img,3)).save(R+'/cmp-stream.png')
# per tile score
for i in range(N+1):
    x0=i*64; x1=min(Wt,x0+64 if i<N else Wt)
    m=wt[:,x0:x1]; dd=np.abs(refs[Y:Y+H,X+x0:X+x1]-ours[:,x0:x1]).sum(2)
    print('seg',i,'%.1f'%((dd*m).sum()/max(m.sum(),1)))
