import sys, numpy as np
from PIL import Image
sys.path.insert(0,sys.argv[1]+'/v5scripts'); from lab import label
R=sys.argv[1]; kind=sys.argv[2]
def A(i): return np.asarray(Image.open(f'{R}/v5-{kind}{i}.png'))[:,:,3]>0
def dil(m,r):
    H,W=m.shape; p=np.pad(m,r); o=np.zeros_like(m)
    for dy in range(-r,r+1):
        for dx in range(-r,r+1):
            o|=p[r+dy:r+dy+H,r+dx:r+dx+W]
    return o
n=6
pairs=[(i,(i+1)%n) for i in range(n)] if kind=='fly' else [(i,i+1) for i in range(n-1)]
for a,b in pairs:
    pa,pb=A(a),A(b)
    for (x,y,lbl) in [(pa,pb,'vanish'),(pb,pa,'appear')]:
        # region of x not covered by y (pixels of x far from any pixel of y)
        far=x&~dil(y,6)
        lab,k=label(far)
        sz=np.bincount(lab.ravel())[1:] if k else []
        big=[(int(s),) for s in sz if s>=15]
        if big:
            out=[]
            for kk in range(1,k+1):
                ys,xs=np.where(lab==kk)
                if len(ys)>=15: out.append('(%d,%d) n%d'%(xs.mean(),ys.mean(),len(ys)))
            print(kind,a,'->',b,lbl,'(>6px from anything in the other frame):',', '.join(out))
