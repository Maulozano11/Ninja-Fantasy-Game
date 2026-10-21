from PIL import Image
import numpy as np, sys
exec(open('stats.py').read().split("n=sys.argv[1]")[0])
n='fireball_goukakyu'
his=Image.open('his_'+n+'.png')
S=88
hb=np.asarray(his.resize((S,S),Image.BOX)).astype(float)
o=np.asarray(Image.open(D+n+'@2x.png').convert('RGB')).astype(float)
Lh=oklab(hb)[...,0]; Lo=oklab(o)[...,0]
c=(S-1)/2
for r in (10,16,22,28,34):
    th=np.linspace(0,2*np.pi,360,endpoint=False)
    xs=np.clip(np.round(c+r*np.cos(th)).astype(int),0,S-1); ys=np.clip(np.round(c+r*np.sin(th)).astype(int),0,S-1)
    ph=Lh[ys,xs]; po=Lo[ys,xs]; ph=ph-ph.mean(); po=po-po.mean()
    cc=[np.dot(ph,np.roll(po,k))/np.sqrt(np.dot(ph,ph)*np.dot(po,po)) for k in range(-40,41)]
    k=int(np.argmax(cc))-40
    print('r',r,'corr@0 %.2f best %.2f at shift %d deg'%(cc[40],max(cc),k))
