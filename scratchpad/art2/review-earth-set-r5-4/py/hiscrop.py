import sys, json; sys.path.insert(0, sys.argv[1])
from lib import *
from compare import his, A
from align import keyframe
from PIL import ImageDraw
n=sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3].split(',')]; k=int(sys.argv[4]); out=sys.argv[5]
K=keyframe(n) if n!='aura' else None
al=dict(A[n]); pbg=(24,23,29) if n=='multi_hit' else (35,35,47); al['bg']=pbg
h,w=K.shape[:2]
H=his(n,al,(h,w)).clip(0,255).astype(np.uint8)
tiles=[H[y0:y1,x0:x1], over(K,np.zeros((h,w,3))+pbg)[y0:y1,x0:x1], over(K,np.zeros((h,w,3))+LIGHT)[y0:y1,x0:x1], over(K,grass(h,w))[y0:y1,x0:x1]]
tiles=[up(t,k) for t in tiles]
th,tw=tiles[0].shape[:2]
S=np.zeros((th,4*(tw+4),3),np.uint8)+90
for j,t in enumerate(tiles): S[:,j*(tw+4):j*(tw+4)+tw]=t
save(S,out)
