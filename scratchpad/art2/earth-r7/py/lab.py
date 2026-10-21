import numpy as np
def label(mask, conn=8):
    h,w=mask.shape; lab=-np.ones((h,w),int); n=0; sizes=[]
    nb=[(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)] if conn==8 else [(-1,0),(1,0),(0,-1),(0,1)]
    for y in range(h):
        for x in range(w):
            if mask[y,x] and lab[y,x]<0:
                st=[(y,x)]; lab[y,x]=n; c=0
                while st:
                    a,b=st.pop(); c+=1
                    for dy,dx in nb:
                        u,v=a+dy,b+dx
                        if 0<=u<h and 0<=v<w and mask[u,v] and lab[u,v]<0:
                            lab[u,v]=n; st.append((u,v))
                sizes.append(c); n+=1
    return lab,sizes
