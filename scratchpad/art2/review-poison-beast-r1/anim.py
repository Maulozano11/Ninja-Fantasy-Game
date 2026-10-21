from PIL import Image
import numpy as np
sh=np.array(Image.open('../staging/vfx_beasts_cobra/poison.png').convert('RGBA')).astype(float)
W,H=171,104; N=sh.shape[1]//W
fr=[sh[:,i*W:(i+1)*W] for i in range(N)]
def luma(f): return (0.299*f[...,0]+0.587*f[...,1]+0.114*f[...,2])/255
L=[]
for i,f in enumerate(fr):
    a=f[...,3]/255
    L.append((a*luma(f)).mean()*1000)
print('light', [round(x,2) for x in L])
pk=max(L)
for i in range(N):
    j=(i+1)%N; print(f'{i}->{j} dlight {abs(L[j]-L[i]):.2f} ({abs(L[j]-L[i])/pk*100:.1f}% of peak)')
# border
for i,f in enumerate(fr):
    a=f[...,3]
    b=max(a[0].max(),a[-1].max(),a[:,0].max(),a[:,-1].max())
    print('frame',i,'border max alpha',b, 'opaque',(a>=128).sum())
# per-pixel change between neighbours (composited on bg)
bg=np.array([30,32,45],float)
def comp(f):
    a=f[...,3:4]/255
    return f[...,:3]*a+bg*(1-a)
C=[comp(f) for f in fr]
for i in range(N):
    j=(i+1)%N
    d=np.abs(C[j]-C[i]).mean(-1)
    body=(fr[i][...,3]>0)|(fr[j][...,3]>0)
    print(f'{i}->{j} changed>40: {(d>40).sum()} px, mean diff over union {d[body].mean():.1f}')
# head: eye location? find topmost opaque pixel x>90 region and rightmost
for i,f in enumerate(fr):
    a=f[...,3]>128
    ys,xs=np.nonzero(a[:, 90:]); 
    # head top: min y among x>90 excluding mist (purple)
    g=f[...,1]; r=f[...,0]; b=f[...,2]
    green=a & (g>r) 
    ys,xs=np.nonzero(green[:,100:])
    print('frame',i,'head green top y',ys.min(),'rightmost green x',xs.max()+100)
