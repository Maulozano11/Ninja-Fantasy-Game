import sys; sys.path.insert(0,'.')
from load import *
from grid import compf
from PIL import Image, ImageDraw
def pairs(name,anim,pl,crop,k,bg,out):
    fr=frames(name,anim)
    x0,y0,x1,y1=crop
    rows=[]
    for (i,j) in pl:
        a=fr[i][y0:y1,x0:x1].astype(float); b=fr[j][y0:y1,x0:x1].astype(float)
        A=a[:,:,3]>=128; B=b[:,:,3]>=128
        d=np.zeros(a.shape[:2]+(3,),np.uint8)+30
        d[A&B]=(90,90,90); d[B&~A]=(0,230,0); d[A&~B]=(240,0,0)
        tiles=[compf(a,bg),compf(b,bg),d]
        rows.append((i,j,tiles))
    h,w=y1-y0,x1-x0
    o=Image.new('RGB',(3*(w*k+6),len(rows)*(h*k+18))); dr=ImageDraw.Draw(o)
    for r,(i,j,t) in enumerate(rows):
        for c,im in enumerate(t):
            o.paste(Image.fromarray(im).resize((w*k,h*k),Image.NEAREST),(c*(w*k+6),r*(h*k+18)+16))
        dr.text((2,r*(h*k+18)+2),f"{name} {anim} frames {i} -> {j}   (green appears, red goes)",fill=(255,255,0))
    o.save(out)
if __name__=='__main__':
    name,anim=sys.argv[1],sys.argv[2]
    pl=[tuple(map(int,p.split('-'))) for p in sys.argv[3].split(',')]
    crop=tuple(map(int,sys.argv[4].split(',')))
    k=int(sys.argv[5]); bg=sys.argv[6]; out=R+'/'+sys.argv[7]
    pairs(name,anim,pl,crop,k,bg,out)
