import sys, json, os
import numpy as np
from PIL import Image, ImageDraw
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
OUT=A+'/earth-r7'
BG={'dark':(36,36,48),'grass':(86,122,62),'light':(226,220,206)}
def group(g=None):
    return g or os.environ.get('G', A+'/staging/vfx_earth_v3')
def frames(name, anim, g=None):
    g=group(g)
    m=json.load(open(g+'/manifest.json'))['sprites'][name]
    im=np.array(Image.open(g+'/'+m['file']).convert('RGBA'))
    fw,fh=m['frameW'],m['frameH']; a=m['anims'][anim]; row=a['row']
    return [im[row*fh:(row+1)*fh, f*fw:(f+1)*fw] for f in range(a['frames'])], m['anchor']
def strip(name, anim, fr=None, z=3, bg='dark', cols=None, crop=None, out=None, g=None):
    fs,(ax,ay)=frames(name,anim,g)
    idx=fr if fr is not None else list(range(len(fs)))
    cols=cols or len(idx)
    bgs=bg.split('+')
    tiles=[]
    for b_ in bgs:
      for i in idx:
        f=fs[i]
        if crop: x0,y0,x1,y1=crop; f=f[y0:y1,x0:x1]
        if b_=='alpha':
            a=f[:,:,3]; b=Image.fromarray(np.stack([a,a,a],-1).astype(np.uint8))
        else:
            b=Image.new('RGBA',(f.shape[1],f.shape[0]),BG[b_]+(255,)); b.alpha_composite(Image.fromarray(f)); b=b.convert('RGB')
        tiles.append(b)
    cols=cols if len(bgs)==1 else len(idx)
    w,h=tiles[0].size; rows=(len(tiles)+cols-1)//cols
    o=Image.new('RGB',((w+2)*cols,(h+2)*rows),(255,0,255))
    for k,t in enumerate(tiles): o.paste(t,((k%cols)*(w+2),(k//cols)*(h+2)))
    o=o.resize((o.width*z,o.height*z),Image.NEAREST)
    fn=out or f'{OUT}/s-{name}-{anim}.png'
    o.save(fn); return fn
if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser()
    p.add_argument('name'); p.add_argument('anim')
    p.add_argument('--fr'); p.add_argument('--z',type=int,default=3); p.add_argument('--crop'); p.add_argument('--cols',type=int)
    p.add_argument('--bg',default='dark'); p.add_argument('--out'); p.add_argument('--g')
    a=p.parse_args()
    fr=[int(x) for x in a.fr.split(',')] if a.fr else None
    crop=tuple(int(x) for x in a.crop.split(',')) if a.crop else None
    print(strip(a.name,a.anim,fr,a.z,a.bg,a.cols,crop,a.out,a.g))
