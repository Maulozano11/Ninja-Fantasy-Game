import numpy as np
def hsv(a):
    a=np.asarray(a,np.float32)/255
    mx=a.max(-1); mn=a.min(-1); d=mx-mn
    r,g,b=a[...,0],a[...,1],a[...,2]
    dd=np.where(d==0,1,d)
    h=np.where(mx==r, ((g-b)/dd)%6, np.where(mx==g,(b-r)/dd+2,(r-g)/dd+4))*60
    s=np.where(mx==0,0,d/np.where(mx==0,1,mx))
    return h,s,mx
