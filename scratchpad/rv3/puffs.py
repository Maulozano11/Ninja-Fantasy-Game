from PIL import Image
import numpy as np
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
sheet=np.array(Image.open(R+'staging/vfx_beasts_cobra/poison.png').convert('RGBA')).astype(int)
FW=176
def label(a):
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
for i in range(8):
    f=sheet[:,i*FW:(i+1)*FW]
    r,g,b,a=[f[:,:,k] for k in range(4)]
    purple=(a>0)&(b>g+15)&(r>g+5)
    lab,n=label(purple)
    sizes=[int((lab==k).sum()) for k in range(1,n+1)]
    tiny=sum(1 for s in sizes if s<=3); small=sum(1 for s in sizes if 4<=s<=12); big=sum(1 for s in sizes if s>12)
    # tiny ones with low alpha
    print(i,'purple comps',n,'tiny<=3:',tiny,'4-12:',small,'>12:',big)
