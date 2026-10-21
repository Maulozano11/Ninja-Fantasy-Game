from fr import *
import sys
g=sys.argv[1] if len(sys.argv)>1 else None
fs,(ax,ay)=frames('blast','blast',g)
def cnt(f,x0,x1,y0,y1):
    a=f[max(0,y0):y1,max(0,x0):x1,3]; return int((a==255).sum())
L=[cnt(f,0,ax-62,0,999) for f in fs]
R=[cnt(f,ax+48,999,0,999) for f in fs]
B=[cnt(f,ax-20,ax+20,ay-28,ay+10) for f in fs]
print('left ',L); print('right',R); print('botc ',B)
def ch(a,i,j): return abs(a[j]-a[i])/max(1,a[i],a[j])
print('left 3-4 %.0f%% 6-7 %.0f%%  right 3-4 %.0f%% 6-7 %.0f%%  botc 6-7 %.0f%%'%(100*ch(L,3,4),100*ch(L,6,7),100*ch(R,3,4),100*ch(R,6,7),100*ch(B,6,7)))
print('max step left', max(round(100*ch(L,i,i+1)) for i in range(1,15)), 'right', max(round(100*ch(R,i,i+1)) for i in range(1,15)))
