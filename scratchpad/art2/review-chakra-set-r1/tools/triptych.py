import sys; sys.path.insert(0,'.')
from common import *
from align import align, bgc, refa
HM['aura_back']=HM['aura']
def trip(n,an,fi,k=3,tag=None):
    b,o=align(n,an,fi,search=0)
    X,Y=b[3],b[4]
    fr=frames(n,an)[fi]; w,h=fr.size
    # his crop (pad)
    his=Image.new('RGB',(w,h),(30,29,37)); 
    xs=max(0,X); ys=max(0,Y); xe=min(REF.width,X+w); ye=min(REF.height,Y+h)
    his.paste(REF.crop((xs,ys,xe,ye)),(xs-X,ys-Y))
    ours=over(fr)
    d=np.abs(np.asarray(his).astype(int)-np.asarray(ours).astype(int)).sum(2)
    heat=np.clip(d*1.5,0,255).astype(np.uint8)
    hi=Image.fromarray(np.stack([heat,heat//3,heat//3],2))
    c=Image.new('RGB',(w*k*3+40,h*k),(80,80,80))
    c.paste(up(his,k),(0,0)); c.paste(up(ours,k),(w*k+20,0)); c.paste(up(hi,k),(2*w*k+40,0))
    c.save('../tri-%s.png'%(tag or n))
    return his,ours
if __name__=='__main__':
    for n,an,fi,k in [('bolt','fly',0,4),('sphere','fly',0,4),('slash','fly',0,4),('multi','fly',0,4),('hit','hit',3,4),('breath','fly',0,3),('stream_head','fly',0,4),('stream','fly',0,4),('blast','blast',4,2),('wall','idle',0,2),('wall_diag','idle',0,2),('aura_back','idle',0,3),('aura','idle',0,3)]:
        trip(n,an,fi,k)
