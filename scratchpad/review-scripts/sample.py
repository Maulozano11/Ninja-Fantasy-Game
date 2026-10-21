exec(open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/review-scripts/crow_cmp.py').read().split('K=3')[0])
import numpy as np
L=(384.4269540694337,905.3472996907377); R=(665.1502695565949,902.600258826489)
hL=np.array(his(L)).astype(int); oL=np.array(frame(0,0)).astype(int)
hR=np.array(his(R)).astype(int); oR=np.array(frame(0,4)).astype(int)
def show(h,o,cx,cy,r=3):
    print('his:'); 
    for y in range(cy-r,cy+r+1): print(' '.join('%3d,%3d,%3d'%tuple(h[y,x]) for x in range(cx-r,cx+r+1)))
    print('ours:')
    for y in range(cy-r,cy+r+1): print(' '.join(('%3d,%3d,%3d'%tuple(o[y,x,:3])) if o[y,x,3] else '   ---     ' for x in range(cx-r,cx+r+1)))
import sys
show(hL,oL,int(sys.argv[1]),int(sys.argv[2]),int(sys.argv[3]) if len(sys.argv)>3 else 3)
