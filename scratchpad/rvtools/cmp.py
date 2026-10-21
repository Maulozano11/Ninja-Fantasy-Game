import his, sys
from PIL import Image, ImageDraw
import numpy as np
A=his.A; out=A+'review-genjutsu-beast-r2/'
def onbg(f,col):
    bg=Image.new('RGBA',f.size,col+(255,)); bg.alpha_composite(f); return bg.convert('RGB')
def crop3(img,box,s=3):
    c=img.crop(box); return c.resize((c.width*s,c.height*s),Image.NEAREST)
def pair(key,fi,box,name,s=3):
    h=Image.open(out+f'rv3-his-{key}-game.png').convert('RGB')
    f=Image.open(out+f'rv3-fly{fi}.png').convert('RGBA')
    o=onbg(f,(31,31,41)); g=onbg(f,(96,112,84))
    ims=[crop3(h,box,s),crop3(o,box,s),crop3(g,box,s)]
    W=sum(i.width for i in ims)+20; Hh=ims[0].height
    can=Image.new('RGB',(W,Hh+14),(0,0,0)); x=0
    d=ImageDraw.Draw(can)
    for i,lab in zip(ims,['his','ours on his bg','ours on grass']):
        can.paste(i,(x,14)); d.text((x+2,1),lab,fill=(255,255,0)); x+=i.width+10
    can.save(out+name)
if __name__=='__main__':
    key,fi,x0,y0,x1,y1,name=sys.argv[1:8]; s=int(sys.argv[8]) if len(sys.argv)>8 else 3
    pair(key,int(fi),(int(x0),int(y0),int(x1),int(y1)),name,s)
