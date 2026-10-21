import sys
from common import *
from PIL import ImageDraw
def strip(n,an,k=3,sel=None,bg=(30,29,37),perrow=None,crop=None):
    fr=frames(n,an)
    idx=sel if sel is not None else range(len(fr))
    ims=[]
    for i in idx:
        f=fr[i]
        if crop: f=f.crop(crop)
        im=up(over(f,bg),k)
        c=Image.new('RGB',(im.width,im.height+14),(60,60,70)); c.paste(im,(0,14))
        ImageDraw.Draw(c).text((2,1),str(i),fill=(255,255,0))
        ims.append(c)
    if perrow:
        rows=[row(ims[j:j+perrow]) for j in range(0,len(ims),perrow)]
        return col(rows)
    return row(ims)
if __name__=='__main__':
    n,an,k=sys.argv[1],sys.argv[2],int(sys.argv[3])
    pr=int(sys.argv[4]) if len(sys.argv)>4 else None
    strip(n,an,k,perrow=pr).save(R+'/strip-%s-%s.png'%(n,an))
