import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rv')
from common import *
names=sys.argv[1].split(',')
for n in names:
    h=np.asarray(his(n)).astype(int); o=np.asarray(key(n)).astype(int)
    hd=np.abs(h-np.array(HISBG)).sum(-1)
    hm=hd>40
    oa=o[...,3]
    om=oa>0
    # where his has art strongly but ours is clear
    miss=hm&(oa==0)
    extra=(~(hd>20))&(oa>128)
    # rendered on green: ours luminance vs his lum within his mask
    print('%-11s his art px %5d ours opaque %5d | his-art-but-ours-clear %4d (%.1f%%) | ours-opaque-where-his-bg %4d | semi(0<a<255) %d'%(n,hm.sum(),om.sum(),miss.sum(),100*miss.sum()/max(hm.sum(),1),extra.sum(),((oa>0)&(oa<255)).sum()))
    vis=np.zeros(h.shape,np.uint8); vis[...]=40
    vis[hm&om]=(120,120,120); vis[miss]=(255,60,60); vis[extra]=(60,160,255)
    up(Image.fromarray(vis),4).save(OUT+'/sil_%s.png'%n)
