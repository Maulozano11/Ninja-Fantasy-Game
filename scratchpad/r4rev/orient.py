from PIL import Image
import numpy as np, sys
exec(open('stats.py').read().split("n=sys.argv[1]")[0])
n=sys.argv[1]
his=Image.open('his_'+n+'.png')
def hist(L):
    gy,gx=np.gradient(L)
    mag=np.hypot(gx,gy); ang=(np.degrees(np.arctan2(gy,gx))+180)%180  # gradient dir; stroke dir = +90
    sd=(ang+90)%180
    bins=np.histogram(sd,bins=6,range=(0,180),weights=mag)[0]; return bins/bins.sum()
for S in (44,88):
    k=S/44
    hb=np.asarray(his.resize((S,S),Image.BOX)).astype(float)
    hl=np.asarray(his.resize((S*4,S*4),Image.LANCZOS)).astype(float)
    o=np.asarray(Image.open(D+n+('.png' if S==44 else '@2x.png')).convert('RGB')).astype(float)
    reg=lambda a,kk: a[int(4*kk):int(30*kk), 0:int(22*kk)]
    print(S,'stroke dir weights [0-30 horiz,30-60,60-90,90-120,120-150,150-180] (image y down)')
    print('  his crop  ', np.round(hist(reg(oklab(hl)[...,0],k*4)),2))
    print('  his box   ', np.round(hist(reg(oklab(hb)[...,0],k)),2))
    print('  ours      ', np.round(hist(reg(oklab(o)[...,0],k)),2))
