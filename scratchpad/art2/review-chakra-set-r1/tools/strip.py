import sys; sys.path.insert(0,'.')
from common import *
def strip(name,anim,k=3,bg=(30,29,37),idx=None,out=None,cols=None):
    fr=frames(name,anim)
    if idx is not None: fr=[fr[i] for i in idx]
    w,h=fr[0].size
    cols=cols or len(fr); rows=(len(fr)+cols-1)//cols
    c=Image.new('RGB',((w*k+6)*cols,(h*k+6)*rows),(255,0,255))
    for i,f in enumerate(fr):
        c.paste(up(over(f,bg),k),((i%cols)*(w*k+6),(i//cols)*(h*k+6)))
    c.save(out or '../strip-%s-%s.png'%(name,anim))
if __name__=='__main__':
    a=sys.argv
    strip(a[1],a[2],int(a[3]),cols=int(a[4]) if len(a)>4 else None)
