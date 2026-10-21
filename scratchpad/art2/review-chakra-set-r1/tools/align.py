import sys; sys.path.insert(0,'.')
from common import *
refa=np.asarray(REF).astype(float)
bgc=np.array([30,29,37.])
def align(name, anim, fi, search=14):
    fr=frames(name,anim)[fi]; a=np.asarray(fr).astype(float)
    al=a[...,3:4]/255; comp=a[...,:3]*al+bgc*(1-al)
    hm=HM[name]; sp=MAN['sprites'][name]
    x0=hm['origin'][0]+hm['anchor'][0]-sp['anchor'][0]; y0=hm['origin'][1]+hm['anchor'][1]-sp['anchor'][1]
    best=None
    h,w=comp.shape[:2]
    mask=(a[...,3]>0)
    for dy in range(-search,search+1):
        for dx in range(-search,search+1):
            X=x0+dx; Y=y0+dy
            if X<0 or Y<0 or X+w>refa.shape[1] or Y+h>refa.shape[0]:
                # crop
                xs=max(0,-X); ys=max(0,-Y); xe=min(w,refa.shape[1]-X); ye=min(h,refa.shape[0]-Y)
            else: xs,ys,xe,ye=0,0,w,h
            r=refa[Y+ys:Y+ye,X+xs:X+xe]; c=comp[ys:ye,xs:xe]; m=mask[ys:ye,xs:xe]
            if m.sum()==0: continue
            d=np.abs(r-c).sum(2)[m].mean()
            if best is None or d<best[0]: best=(d,dx,dy,X,Y)
    return best,(x0,y0)
if __name__=='__main__':
    for n,an,fi in [('bolt','fly',0),('sphere','fly',0),('slash','fly',0),('multi','fly',0),('hit','hit',3),('breath','fly',0),('stream_head','fly',0),('stream','fly',0),('blast','blast',4),('wall','idle',0),('wall','rise',11),('wall_diag','idle',0),('aura','idle',0),('aura_back','idle',0)]:
        nm=n if n!='aura_back' else 'aura'
        if n=='aura_back':
            HM['aura_back']=HM['aura']
        b,o=align(n,an,fi)
        print(n,an,fi,'meanabs/px(sum rgb) %.1f'%b[0],'shift',b[1],b[2],'topleft',b[3],b[4])
