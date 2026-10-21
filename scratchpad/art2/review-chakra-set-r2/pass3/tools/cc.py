import numpy as np
def label(mask):
    h,w=mask.shape; lab=np.zeros((h,w),int); n=0
    for y in range(h):
        for x in range(w):
            if mask[y,x] and not lab[y,x]:
                n+=1; st=[(y,x)]; lab[y,x]=n
                while st:
                    cy,cx=st.pop()
                    for dy in (-1,0,1):
                        for dx in (-1,0,1):
                            yy,xx=cy+dy,cx+dx
                            if 0<=yy<h and 0<=xx<w and mask[yy,xx] and not lab[yy,xx]:
                                lab[yy,xx]=n; st.append((yy,xx))
    return lab,n
