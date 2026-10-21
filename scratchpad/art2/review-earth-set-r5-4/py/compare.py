import sys, json; sys.path.insert(0, sys.argv[1])
from lib import *
from align import ref, P, KEY, keyframe, match
from PIL import ImageDraw
A={}
for f in ["align-bolt_slash_multi_sphere.json","align-breath_multi_hit_hit_blast_stream_stream_head_wall_wall_diag_wall_depth.json"]:
    A.update(json.load(open(R+'/'+f)))
char=np.array(Image.open(SP+'/art2/earth-v3-work/character.png').convert('RGBA'))
def aura_comp():
    b=frames('aura_back')[0].astype(float); f=frames('aura')[0].astype(float)
    H,W=b.shape[:2]; C=np.zeros((H,W,4))
    ox,oy=58-64,119-120
    for y in range(H):
        for x in range(W):
            cy,cx=y-oy,x-ox
            if 0<=cy<128 and 0<=cx<128: C[y,x]=char[cy,cx]
    def ov(top,bot):
        ta=top[...,3:4]/255; ba=bot[...,3:4]/255; oa=ta+ba*(1-ta)
        rgb=(top[...,:3]*ta+bot[...,:3]*ba*(1-ta))/np.maximum(oa,1e-6)
        return np.concatenate([rgb,oa*255],-1)
    out=ov(f,ov(C,b))
    return out.round().clip(0,255).astype(np.uint8)
def his(name,al,shape):
    x0,y0,x1,y1=P[name]; s=al['scale']; ph=al['ph']
    reg=ref[y0+ph[1]:y1+1,x0+ph[0]:x1+1]
    Wd=int(round(reg.shape[1]/s)); Hd=int(round(reg.shape[0]/s))
    D=np.array(Image.fromarray(reg.astype(np.uint8)).resize((Wd,Hd),Image.BOX)).astype(float)
    h,w=shape; bg=np.array(al['bg'])
    out=np.zeros((h,w,3))+np.array([60,60,60])  # grey = outside his panel
    dx,dy=al['dx'],al['dy']
    for y in range(h):
        sy=y+dy
        if 0<=sy<Hd:
            for x in range(w):
                sx=x+dx
                if 0<=sx<Wd: out[y,x]=D[sy,sx]
    return out
def label(t,s):
    im=Image.fromarray(t); d=ImageDraw.Draw(im); d.text((3,3),s,fill=(255,60,60)); return np.array(im)
if __name__=='__main__':
    names=sys.argv[2].split(',')
    k=int(sys.argv[3]) if len(sys.argv)>3 else 3
    for n in names:
        if n=='aura':
            K=aura_comp()
            if n not in A:
                sc=np.arange(2.30,2.50,0.01)
                (v,s,dx,dy,ph),bgc=match('aura',sc,K=K)
                (v,s,dx,dy,ph),bgc=match('aura',np.arange(s-0.012,s+0.0125,0.003),K=K,phases=[(a,b) for a in (0,1,2) for b in (0,1,2)])
                A['aura']=dict(rms=v**0.5,scale=float(s),dx=dx,dy=dy,ph=ph,bg=[35,35,47])
                print('aura',A['aura'])
        else: K=keyframe(n)
        al=dict(A[n]); 
        pbg=(24,23,29) if n=='multi_hit' else (35,35,47)
        al['bg']=pbg
        h,w=K.shape[:2]
        H=his(n,al,(h,w))
        ours_p=over(K,np.zeros((h,w,3))+pbg)
        ours_l=over(K,np.zeros((h,w,3))+LIGHT)
        ours_g=over(K,grass(h,w))
        diff=np.abs(H-ours_p.astype(float)).mean(-1)
        dimg=np.stack([diff*3,diff*1.5,diff*0],-1).clip(0,255).astype(np.uint8)
        rms=np.sqrt(((H-ours_p)**2).mean(-1)[K[...,3]>0].mean())
        tiles=[label(up(H.clip(0,255).astype(np.uint8),k),'his'),label(up(ours_p,k),'ours/panel'),label(up(ours_l,k),'ours/light'),label(up(ours_g,k),'ours/grass'),label(up(dimg,k),'|diff|')]
        th,tw=tiles[0].shape[:2]
        cols=3 if tw<600 else 2
        rows=(len(tiles)+cols-1)//cols
        S=np.zeros((rows*(th+4),cols*(tw+4),3),np.uint8)+90
        for j,t in enumerate(tiles):
            r,c=divmod(j,cols); S[r*(th+4):r*(th+4)+th,c*(tw+4):c*(tw+4)+tw]=t
        save(S,R+f'/cmp-{n}.png')
        print(n,'rms on ours px',round(float(rms),1),'scale',al['scale'],'dx,dy',al['dx'],al['dy'])
    json.dump(A,open(R+'/align-final.json','w'),indent=1)
