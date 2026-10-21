import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-chakra-set-r2/pass4/tools')
from c import *
HM=json.load(open(S+'/chakra5/rev/his-map.json'))
def comp(fr,bg):
    a=np.asarray(fr).astype(float); al=a[...,3:4]/255
    return a[...,:3]*al+np.array(bg,float)*(1-al), a[...,3]
def align(fr,x0,y0,search=16):
    best=None; w,h=fr.size
    c,al=comp(fr,BG); m=al>8
    for dy in range(-search,search+1):
        for dx in range(-search,search+1):
            X=x0+dx; Y=y0+dy
            if X<0 or Y<0 or X+w>REFA.shape[1] or Y+h>REFA.shape[0]: continue
            r=REFA[Y:Y+h,X:X+w]
            d=np.abs(r-c).sum(2)[m].mean()
            if best is None or d<best[0]: best=(d,X,Y)
    return best
def do(name,anim,fi,key=None,k=3):
    fr=frames(name,anim)[fi]; hm=HM[key or name]; sp=MAN['sprites'][name]
    x0=hm['origin'][0]+hm['anchor'][0]-sp['anchor'][0]; y0=hm['origin'][1]+hm['anchor'][1]-sp['anchor'][1]
    d,X,Y=align(fr,x0,y0)
    w,h=fr.size
    his=REF.crop((X,Y,X+w,Y+h)); ours=over(fr)
    diff=np.abs(np.asarray(his).astype(int)-np.asarray(ours).astype(int)).sum(2)
    dimg=Image.fromarray(np.clip(diff*1.5,0,255).astype(np.uint8)).convert('RGB')
    # our frame over a bright grass bg to reveal holes
    grass=over(fr,(96,140,70))
    out=row([up(his,k),up(ours,k),up(grass,k),up(dimg,k)],gap=6)
    return out,(round(d,1),X,Y,X-x0,Y-y0)
if __name__=='__main__':
    for n,an,fi,key in [('bolt','fly',0,None),('sphere','fly',0,None),('slash','fly',0,None),('multi','fly',0,None),('hit','hit',3,None),('breath','fly',0,None),('stream_head','fly',0,None),('stream','fly',0,None),('blast','blast',4,None),('wall','idle',0,None),('wall','rise',11,None),('wall_diag','idle',0,None),('wall_diag','rise',11,None),('aura_back','idle',0,'aura'),('aura','idle',0,'aura')]:
        out,b=do(n,an,fi,key)
        out.save(R+'/K-%s-%s%d.png'%(n,an,fi)); print(n,an,fi,b)
