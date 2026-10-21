import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-chakra-set-r2/pass4/tools')
from cmp import *
POS={}
def pos(n,an,fi,key=None):
    fr=frames(n,an)[fi]; hm=HM[key or n]; sp=MAN['sprites'][n]
    x0=hm['origin'][0]+hm['anchor'][0]-sp['anchor'][0]; y0=hm['origin'][1]+hm['anchor'][1]-sp['anchor'][1]
    return x0,y0,fr
def big(n,an,fi,k=6,key=None):
    x0,y0,fr=pos(n,an,fi,key); w,h=fr.size
    his=REF.crop((x0,y0,x0+w,y0+h))
    return row([up(his,k),up(over(fr),k)],gap=8)
if __name__=='__main__':
    for n in ['bolt','sphere','slash','multi','stream_head','stream']:
        big(n,'fly',0).save(R+'/B-%s.png'%n)
    big('hit','hit',3).save(R+'/B-hit.png')
    big('breath','fly',0,k=4).save(R+'/B-breath.png')
