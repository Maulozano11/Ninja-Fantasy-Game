import sys; sys.path.insert(0,'.')
from align2 import *
from grid import compf
from PIL import Image, ImageDraw
import json
al=json.load(open(R+'/align.json'))
def panel(name,k=3):
    d,s,ox,oy=al[name][:4]
    f=keyframe(name)
    H,W=f.shape[:2]
    hs=his_small(name,s); hh,hw=hs.shape[:2]
    # his crop aligned to our frame
    his=np.zeros((H,W,3))+PANEL_BG
    for y in range(H):
        yy=y+oy
        if 0<=yy<hh:
            for x in range(W):
                xx=x+ox
                if 0<=xx<hw: his[y,x]=hs[yy,xx]
    on=compf(f,'dark'); li=compf(f,'light'); gr=compf(f,'grass')
    diff=np.abs(his-on.astype(float)).mean(2)
    heat=np.stack([diff*3,diff*1,diff*0],2).clip(0,255)
    tiles=[his,on,li,gr,heat]
    o=Image.new('RGB',(5*(W*k+6),H*k+16)); dr=ImageDraw.Draw(o)
    for i,t in enumerate(tiles):
        o.paste(Image.fromarray(t.astype(np.uint8)).resize((W*k,H*k),Image.NEAREST),(i*(W*k+6),16))
    dr.text((2,2),f"{name} s={s} mean|d|={d:.1f}  his | ours dark | light | grass | diff",fill=(255,255,0))
    o.save(f"{R}/cmp-{name}.png")
    return his,on,diff
if __name__=='__main__':
    for n in sys.argv[1:]: panel(n, 3 if n not in ('wall','wall_diag','wall_depth','blast') else 2)
