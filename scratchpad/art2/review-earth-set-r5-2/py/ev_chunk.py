import sys; sys.path.insert(0,'.')
from load import *
from grid import compf
from PIL import Image, ImageDraw
fr=frames('stream_head','fly')
x0,y0,x1,y1=126,6,154,30
k=12
cols=[3,4,5,6,7]
W=(x1-x0)*k; H=(y1-y0)*k
o=Image.new('RGB',(len(cols)*(W+6),3*(H+18)),(0,0,0)); d=ImageDraw.Draw(o)
for c,i in enumerate(cols):
    f=fr[i].astype(float)
    for r,bg in enumerate(('grass','light')):
        im=compf(f,bg)[y0:y1,x0:x1]
        o.paste(Image.fromarray(im).resize((W,H),Image.NEAREST),(c*(W+6),r*(H+18)+16))
        d.text((c*(W+6)+2,r*(H+18)+2),f'stream_head fly frame {i} on {bg}',fill=(255,255,0))
    a=fr[i][y0:y1,x0:x1,3]
    am=np.stack([a,a,a],2)
    o.paste(Image.fromarray(am).resize((W,H),Image.NEAREST),(c*(W+6),2*(H+18)+16))
    d.text((c*(W+6)+2,2*(H+18)+2),f'alpha frame {i} (x{x0}-{x1-1}, y{y0}-{y1-1})',fill=(255,255,0))
o.save(R+'/ev-stream_head-chunk-tear.png')
