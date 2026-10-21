import numpy as np
def label(mask):
    h,w=mask.shape; lab=np.zeros((h,w),int); n=0
    for y in range(h):
        for x in range(w):
            if mask[y,x] and not lab[y,x]:
                n+=1; st=[(y,x)]; lab[y,x]=n
                while st:
                    a,b=st.pop()
                    for dy in (-1,0,1):
                        for dx in (-1,0,1):
                            u,v=a+dy,b+dx
                            if 0<=u<h and 0<=v<w and mask[u,v] and not lab[u,v]:
                                lab[u,v]=n; st.append((u,v))
    return lab,n
