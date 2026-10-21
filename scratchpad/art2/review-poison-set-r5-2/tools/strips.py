from lib import *
import sys
from PIL import ImageDraw
PC=(30,32,46)
def strip(name, k, scale, bg='panel', idx=None, crop=None, cols=None, out=None, enc=False):
    fs=frames(name,k)
    idx=idx if idx is not None else range(len(fs))
    tiles=[]
    for i in idx:
        f=fs[i]
        if crop: y0,y1,x0,x1=crop; f=f[y0:y1,x0:x1]
        h,w=f.shape[:2]
        b=grass(h,w) if bg=='grass' else np.array(PC)
        c=comp(f,b)
        if enc:
            e=enclosed(f[...,3],128); c[e]=[255,0,255]
        t=up(c,scale)
        t=np.pad(t,((14,2),(2,2),(0,0)),constant_values=255)
        im=Image.fromarray(t); ImageDraw.Draw(im).text((3,1),str(i),fill=(0,0,0)); tiles.append(np.array(im))
    cols=cols or len(tiles)
    rows=[np.concatenate(tiles[r:r+cols]+[np.full_like(tiles[0],255)]*(cols-len(tiles[r:r+cols])),1) for r in range(0,len(tiles),cols)]
    Image.fromarray(np.concatenate(rows,0)).save(out or R+f'/strip-{name}-{k}-{bg}.png')
if __name__=='__main__':
    name,k,scale,bg=sys.argv[1],sys.argv[2],int(sys.argv[3]),sys.argv[4]
    cols=int(sys.argv[5]) if len(sys.argv)>5 else None
    strip(name,k,scale,bg,cols=cols,enc=(len(sys.argv)>6))
