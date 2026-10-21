import sys
from common import *
refa=np.asarray(REF).astype(float)
def comp_on(fr,bg):
    a=np.asarray(fr).astype(float); al=a[...,3:4]/255
    return a[...,:3]*al+np.array(bg,float)*(1-al), a[...,3]
def align(name, anim, fi, search=14, key=None, frs=None):
    hmn=key or name
    fr=(frs or frames(name,anim))[fi]
    hm=HM[hmn]; sp=MAN['sprites'][name]
    x0=hm['origin'][0]+hm['anchor'][0]-sp['anchor'][0]; y0=hm['origin'][1]+hm['anchor'][1]-sp['anchor'][1]
    best=None
    for dy in range(-search,search+1):
        for dx in range(-search,search+1):
            X=x0+dx; Y=y0+dy
            w,h=fr.size
            xs=max(0,-X); ys=max(0,-Y); xe=min(w,refa.shape[1]-X); ye=min(h,refa.shape[0]-Y)
            r=refa[Y+ys:Y+ye,X+xs:X+xe]
            bg=np.median(r.reshape(-1,3)[:200],0) if False else (30,29,37)
            c,al=comp_on(fr,bg); c=c[ys:ye,xs:xe]; m=al[ys:ye,xs:xe]>0
            if m.sum()==0: continue
            d=np.abs(r-c).sum(2)[m].mean()
            if best is None or d<best[0]: best=(d,dx,dy,X,Y)
    return best
def cmp(name,anim,fi,key=None,k=3,frs=None,extra=None):
    b=align(name,anim,fi,key=key,frs=frs)
    fr=(frs or frames(name,anim))[fi]; X,Y=b[3],b[4]; w,h=fr.size
    his=REF.crop((X,Y,X+w,Y+h))
    ours=over(fr,(30,29,37))
    # alpha view
    al=Image.fromarray(np.asarray(fr)[...,3]).convert('RGB')
    diff=np.abs(np.asarray(his).astype(int)-np.asarray(ours).astype(int)).sum(2)
    dimg=Image.fromarray(np.clip(diff,0,255).astype(np.uint8)).convert('RGB')
    out=row([up(his,k),up(ours,k),up(al,k),up(dimg,k)],gap=6)
    return out,b
if __name__=='__main__':
    res={}
    for n,an,fi,key in [('bolt','fly',0,None),('sphere','fly',0,None),('slash','fly',0,None),('multi','fly',0,None),('hit','hit',3,None),('breath','fly',0,None),('stream_head','fly',0,None),('stream','fly',0,None),('blast','blast',4,None),('wall','idle',0,None),('wall','rise',11,None),('wall_diag','idle',0,None),('wall_diag','rise',11,None),('aura_back','idle',0,'aura'),('aura','idle',0,'aura')]:
        out,b=cmp(n,an,fi,key=key)
        out.save(R+'/cmp-%s-%s%d.png'%(n,an,fi))
        res['%s-%s-%d'%(n,an,fi)]=[round(b[0],1),b[1],b[2],b[3],b[4]]
        print(n,an,fi,'mad %.1f shift %d %d at %d %d'%b)
    json.dump(res,open(R+'/align.json','w'))
