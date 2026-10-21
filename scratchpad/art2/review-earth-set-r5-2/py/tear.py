import sys; sys.path.insert(0,'.')
from load import *
from grid import compf
from PIL import Image, ImageDraw
fr=frames('wall_depth','rise')
K=fr[11].astype(int)
x0,y0,x1,y1=15,225,110,264
k=8
tiles=[]
pal={}
import colorsys
for i in (7,8,9,10):
    f=fr[i].astype(int)
    img=compf(fr[i].astype(float),'grass')[y0:y1,x0:x1]
    off=np.zeros((y1-y0,x1-x0,3),np.uint8)+30
    for y in range(y0,y1):
        for x in range(x0,x1):
            if f[y,x,3]==0: continue
            ss=[s for s in range(-12,1) if 0<=y+s<K.shape[0] and (f[y,x]==K[y+s,x]).all()]
            if not ss: off[y-y0,x-x0]=(90,90,90); continue
            s=-max(ss)  # smallest downward offset
            r,g,b=colorsys.hsv_to_rgb((s*0.09)%1,0.9,1.0)
            off[y-y0,x-x0]=(int(r*255),int(g*255),int(b*255))
    tiles.append((i,img,off))
W=(x1-x0)*k; H=(y1-y0)*k
o=Image.new('RGB',(2*W+10,len(tiles)*(H+18)),(0,0,0)); d=ImageDraw.Draw(o)
for r,(i,img,off) in enumerate(tiles):
    o.paste(Image.fromarray(img).resize((W,H),Image.NEAREST),(0,r*(H+18)+16))
    o.paste(Image.fromarray(off).resize((W,H),Image.NEAREST),(W+10,r*(H+18)+16))
    d.text((2,r*(H+18)+2),f'wall_depth rise frame {i} (x{x0}-{x1-1}, y{y0}-{y1-1}) | right: px matched to his frame 11 shifted down by s (hue = s; red s=0, grey = no match)',fill=(255,255,0))
o.save(R+'/ev-wall_depth-heap-tear.png')
