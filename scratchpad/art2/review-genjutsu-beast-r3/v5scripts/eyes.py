import sys, numpy as np
from PIL import Image
sys.path.insert(0,sys.argv[1]+"/v5scripts"); from lab import label
R=sys.argv[1]
BG=np.array([31,31,41])
for side,fi in [('L',0),('R',4)]:
    h=np.load(f'{R}/v5scripts/his{side}.npy')
    a=np.asarray(Image.open(f'{R}/v5-fly{fi}.png')).astype(float); al=a[:,:,3:4]/255
    o=a[:,:,:3]*al+BG*(1-al)
    for nm,img in [('his',h),('our',o)]:
        r,g,b=img[...,0],img[...,1],img[...,2]
        m=(r-g>45)&(r>b-5)  # reddish
        lab,n=label(m)
        out=[]
        for k in range(1,n+1):
            ys,xs=np.where(lab==k)
            if len(ys)<2: continue
            px=img[ys,xs]
            brightest=px[np.argmax(px.sum(1))]
            out.append((int(xs.mean()),int(ys.mean()),len(ys),tuple(int(v) for v in brightest),tuple(int(v) for v in px.mean(0))))
        print(side,nm)
        for e in out: print('   ',e)
