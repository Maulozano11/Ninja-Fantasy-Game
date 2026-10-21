import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rv')
from common import *
n=sys.argv[1]; K=int(sys.argv[2]); box=tuple(map(int,sys.argv[3].split(','))) if len(sys.argv)>3 and sys.argv[3] else None
bg=GRASS if len(sys.argv)>4 and sys.argv[4]=='g' else HISBG
h=his(n); o=on(key(n),bg)
if box: h=h.crop(box); o=o.crop(box)
row([up(h,K),up(o,K)],gap=8).save(OUT+'/big_%s%s.png'%(n,'_'+sys.argv[3].replace(',','_') if box else ''))
