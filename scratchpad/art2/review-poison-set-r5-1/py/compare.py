import sys; sys.path.insert(0, sys.argv[1])
from lib import *
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/poison-set-owner-reference.jpg').convert('RGB')
W0,H0=ref.size; sy=0.98
refs=np.array(ref.resize((W0,round(H0*sy)),Image.BILINEAR))
PANEL=(31,33,46)
al=json.load(open(R+'/align.json'))
char=np.array(Image.open(R+'/character.png').convert('RGBA'))
key={'hit':('hit',3),'blast':('blast',4),'wall':('idle',0),'wall_diag':('idle',0)}
def keyframe(name):
    an,ki=key.get(name,(None,0)); fs=frames(name); an=an or list(fs)[0]; return fs[an][ki]
def place_char(fr, anchor, feet=(64,120)):
    # composite character with feet at frame anchor
    H,W=fr.shape[:2]; c=np.zeros_like(fr)
    ox=anchor[0]-feet[0]; oy=anchor[1]-feet[1]
    for y in range(char.shape[0]):
        for x in range(char.shape[1]):
            pass
    ys=slice(max(0,oy),min(H,oy+char.shape[0])); xs=slice(max(0,ox),min(W,ox+char.shape[1]))
    c[ys,xs]=char[ys.start-oy:ys.stop-oy, xs.start-ox:xs.stop-ox]
    return c
for name,(sc,X,Y) in al.items():
    if name=='aura':
        back=frames('aura_back')['idle'][0]; front=frames('aura')['idle'][0]
        cc=place_char(back,M['sprites']['aura']['anchor'])
        f=over(front,over(cc,back))
    else: f=keyframe(name)
    h,w=f.shape[:2]
    his=refs[Y:Y+h,X:X+w]
    a=f[...,3:4]/255
    onp=(f[...,:3]*a+np.array(PANEL)*(1-a)).astype(np.uint8)
    ong=(f[...,:3]*a+grass(h,w)*(1-a)).astype(np.uint8)
    d=np.abs(his.astype(int)-onp.astype(int)).sum(2).clip(0,255).astype(np.uint8)
    dimg=np.stack([d,d,d],-1)
    k=4 if max(h,w)<150 else 3
    gap=np.full((h,3,3),255,np.uint8)
    row=np.concatenate([his,gap,onp,gap,ong,gap,dimg],1)
    Image.fromarray(up(row,k)).save(R+'/cmp-%s.png'%name)
    print(name, w,h,'k',k)
