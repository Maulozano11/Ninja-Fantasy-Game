import sys, json, os
import numpy as np
from PIL import Image, ImageDraw
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
OUT=A+'/earth-r5'
def group(g=None):
    return g or os.environ.get('G', A+'/staging/vfx_earth_v3')
def frames(name, anim, g=None):
    g=group(g)
    m=json.load(open(g+'/manifest.json'))['sprites'][name]
    im=np.array(Image.open(g+'/'+m['file']).convert('RGBA'))
    fw,fh=m['frameW'],m['frameH']; a=m['anims'][anim]; row=a['row']
    return [im[row*fh:(row+1)*fh, f*fw:(f+1)*fw] for f in range(a['frames'])], m['anchor']
def strip(name, anim, fr=None, z=3, bg=(36,36,48), cols=None, crop=None, out=None, g=None):
    fs,(ax,ay)=frames(name,anim,g)
    idx=fr if fr is not None else list(range(len(fs)))
    cols=cols or len(idx)
    tiles=[]
    for i in idx:
        f=fs[i]
        if crop: x0,y0,x1,y1=crop; f=f[y0:y1,x0:x1]
        b=Image.new('RGBA',(f.shape[1],f.shape[0]),bg+(255,)); b.alpha_composite(Image.fromarray(f))
        tiles.append(b.convert('RGB'))
    w,h=tiles[0].size; rows=(len(tiles)+cols-1)//cols
    o=Image.new('RGB',((w+2)*cols,(h+2)*rows),(255,0,255))
    for k,t in enumerate(tiles): o.paste(t,((k%cols)*(w+2),(k//cols)*(h+2)))
    o=o.resize((o.width*z,o.height*z),Image.NEAREST)
    fn=out or f'{OUT}/s-{name}-{anim}.png'
    o.save(fn); return fn
if __name__=='__main__':
    n,a=sys.argv[1],sys.argv[2]
    fr=[int(x) for x in sys.argv[3].split(',')] if len(sys.argv)>3 and sys.argv[3] else None
    z=int(sys.argv[4]) if len(sys.argv)>4 else 3
    crop=tuple(int(x) for x in sys.argv[5].split(',')) if len(sys.argv)>5 and sys.argv[5] else None
    cols=int(sys.argv[6]) if len(sys.argv)>6 else None
    out=sys.argv[7] if len(sys.argv)>7 else None
    print(strip(n,a,fr,z,crop=crop,cols=cols,out=out))
