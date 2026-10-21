from PIL import Image
import numpy as np
class ndimage:
    @staticmethod
    def label(a,structure=None):
        H,W=a.shape; lab=np.zeros((H,W),int); n=0
        for y in range(H):
            for x in range(W):
                if a[y,x] and not lab[y,x]:
                    n+=1; st=[(y,x)]; lab[y,x]=n
                    while st:
                        cy,cx=st.pop()
                        for dy in(-1,0,1):
                            for dx in(-1,0,1):
                                yy,xx=cy+dy,cx+dx
                                if 0<=yy<H and 0<=xx<W and a[yy,xx] and not lab[yy,xx]:
                                    lab[yy,xx]=n; st.append((yy,xx))
        return lab,n
    @staticmethod
    def sum(a,lab,idx):
        return [int((lab==k).sum()) for k in idx]

R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
sheet=np.array(Image.open(R+'staging/vfx_beasts_cobra/poison.png').convert('RGBA')).astype(int)
FW=176
for i in range(8):
    f=sheet[:,i*FW:(i+1)*FW]
    a=f[:,:,3]>0
    lab,n=ndimage.label(a,structure=np.ones((3,3)))
    sizes=ndimage.sum(a,lab,range(1,n+1))
    small=[(k+1,int(s)) for k,s in enumerate(sizes) if s<=4]
    desc=[]
    for k,s in small:
        ys,xs=np.where(lab==k)
        c=f[ys[0],xs[0]]
        desc.append(f'({xs[0]},{ys[0]}) n={s} rgba={tuple(c)}')
    print(i,'components',n,'small<=4:',len(small)); 
    for d in desc: print('   ',d)
