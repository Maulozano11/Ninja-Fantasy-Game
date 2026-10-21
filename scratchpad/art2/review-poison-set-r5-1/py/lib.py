import json, numpy as np
from PIL import Image
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
R=A+'/review-poison-set-r5-1'
ST=A+'/staging/vfx_poison_v3'
M=json.load(open(ST+'/manifest.json'))
def frames(name, anim=None):
    s=M['sprites'][name]; im=np.array(Image.open(ST+'/'+s['file']).convert('RGBA'))
    W,H=s['frameW'],s['frameH']; out={}
    for a,b in s['anims'].items():
        if anim and a!=anim: continue
        n=b['frames']; r=b['row']
        out[a]=[im[r*H:(r+1)*H, i*W:(i+1)*W].copy() for i in range(n)]
    return out if not anim else out[anim]
def comp(fr, bg):
    a=fr[...,3:4]/255.0; bg=np.broadcast_to(np.array(bg,float),fr[...,:3].shape)
    return (fr[...,:3]*a + bg*(1-a)).clip(0,255).astype(np.uint8)
def over(top, bot):
    ta=top[...,3:4]/255.0; ba=bot[...,3:4]/255.0
    oa=ta+ba*(1-ta); oc=np.where(oa>0,(top[...,:3]*ta+bot[...,:3]*ba*(1-ta))/np.maximum(oa,1e-9),0)
    return np.concatenate([oc,oa*255],-1).round().clip(0,255).astype(np.uint8)
def up(img,k):
    return np.kron(img, np.ones((k,k,1),dtype=img.dtype)) if img.ndim==3 else np.kron(img,np.ones((k,k),dtype=img.dtype))
GRASS=None
def grass(h,w):
    # simple grass tile from game? use a mid green checker-ish texture
    yy,xx=np.mgrid[0:h,0:w]
    base=np.zeros((h,w,3)); base[...]=(74,110,52)
    n=((xx*7+yy*13)%11<3)[...,None]*np.array([10,14,6])[None,None,:]
    return (base+n).astype(np.uint8)
from collections import deque
def label(mask, conn=4):
    H,W=mask.shape; lab=np.zeros((H,W),np.int32); n=0
    nb=[(1,0),(-1,0),(0,1),(0,-1)] + ([(1,1),(1,-1),(-1,1),(-1,-1)] if conn==8 else [])
    m=mask.tolist()
    L=[[0]*W for _ in range(H)]
    for y in range(H):
        row=m[y]
        for x in range(W):
            if row[x] and not L[y][x]:
                n+=1; L[y][x]=n; q=deque([(y,x)])
                while q:
                    cy,cx=q.popleft()
                    for dy,dx in nb:
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<H and 0<=nx<W and m[ny][nx] and not L[ny][nx]:
                            L[ny][nx]=n; q.append((ny,nx))
    return np.array(L,np.int32), n
def enclosed(alpha, thr=128):
    """see-through pixels (alpha<thr) not reachable (4-conn) from outside the frame"""
    see = alpha<thr
    H,W=see.shape
    pad=np.ones((H+2,W+2),bool); pad[1:-1,1:-1]=see
    L,n=label(pad,4)
    outside=L[0,0]
    enc=(L[1:-1,1:-1]!=outside)&see
    return enc
