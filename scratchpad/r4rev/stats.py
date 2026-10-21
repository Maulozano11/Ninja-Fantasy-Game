from PIL import Image
import numpy as np, sys
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons/'
def lin(c):
    c=c/255.0; return np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
def oklab(rgb):
    r,g,b=[lin(rgb[...,i]) for i in range(3)]
    l=0.4122214708*r+0.5363325363*g+0.0514459929*b
    m=0.2119034982*r+0.6806995451*g+0.1073969566*b
    s=0.0883024619*r+0.2817188376*g+0.6299787005*b
    l,m,s=np.cbrt(l),np.cbrt(m),np.cbrt(s)
    return np.stack([0.2104542553*l+0.7936177850*m-0.0040720468*s,1.9779984951*l-2.4285922050*m+0.4505937499*s,0.0259040371*l+0.7827717662*m-0.8086757660*s],-1)
n=sys.argv[1]
his=Image.open('his_'+n+'.png')
for S in (44,88):
    hb=np.asarray(his.resize((S,S),Image.BOX)).astype(float)
    o=np.asarray(Image.open(D+n+('.png' if S==44 else '@2x.png')).convert('RGB')).astype(float)
    for name,a in (('his',hb),('our',o)):
        lab=oklab(a); L=lab[...,0]; C=np.hypot(lab[...,1],lab[...,2]); H=np.degrees(np.arctan2(lab[...,2],lab[...,1]))%360
        # radial bins for fireball
        yy,xx=np.mgrid[0:S,0:S]; r=np.hypot(xx-(S-1)/2,yy-(S-1)/2)/(S/44)
        out=[]
        for r0,r1 in ((0,4),(4,8),(8,12),(12,16),(16,20),(20,24),(24,32)):
            m=(r>=r0)&(r<r1)
            out.append('r%d-%d L%.2f C%.3f H%3.0f'%(r0,r1,L[m].mean(),C[m].mean(),np.median(H[m&(C>0.03)]) if (m&(C>0.03)).any() else -1))
        print(S,name,'meanL %.3f meanC %.3f  frac L>0.9: %.3f  L>0.8 %.3f'%(L.mean(),C.mean(),(L>0.9).mean(),(L>0.8).mean()))
        for t in out: print('    ',t)
