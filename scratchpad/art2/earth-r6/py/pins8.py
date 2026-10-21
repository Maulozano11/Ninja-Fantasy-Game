from fr import *
from morph import *
import sys
fi=int(sys.argv[1]); g=sys.argv[2] if len(sys.argv)>2 else None
fs,_=frames('blast','blast',g)
def pinm(f):
    a=f[:,:,3]; S=a>=180; C=close(S,1); return C&(a<60)&~S
m=pinm(fs[fi]); ys,xs=np.nonzero(m)
lab,n=label(m)
for k in range(1,n+1):
    yy,xx=np.nonzero(lab==k)
    print('blob',k,'n',len(xx),'x',xx.min(),'-',xx.max(),'y',yy.min(),'-',yy.max())
