import numpy as np
def label(m):
    H,W=m.shape; lab=np.zeros((H,W),int); n=0
    for y in range(H):
        for x in range(W):
            if m[y,x] and not lab[y,x]:
                n+=1; st=[(y,x)]; lab[y,x]=n
                while st:
                    cy,cx=st.pop()
                    for dy in (-1,0,1):
                        for dx in (-1,0,1):
                            yy,xx=cy+dy,cx+dx
                            if 0<=yy<H and 0<=xx<W and m[yy,xx] and not lab[yy,xx]:
                                lab[yy,xx]=n; st.append((yy,xx))
    return lab,n
