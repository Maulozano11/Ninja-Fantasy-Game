import sys, os; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/11-arboles')
from artlib import *
NJ=ninja()
BARH=46  # caption bar height at 2x scale (drawn after upscaling)

def scene(trees, f_of, gox=0, gap=28, side=20, top=16, bot=12, with_ninja=True):
    """trees: list of (d,name,anim). Returns list of 1x RGBA frames (ground + sprites), n = max frames."""
    items=[]
    for d,name,anim in trees:
        m=manifest(d)[name]; a=m['anims'][anim]
        frs=[frame(d,name,anim,f) for f in range(a['frames'])]
        bb=bbox_union(frs); items.append((frs,bb,m['anchor'],a))
    above=max(ay-bb[1] for frs,bb,(ax,ay),a in items); below=max(bb[3]-1-ay for frs,bb,(ax,ay),a in items)
    if with_ninja: above=max(above,NJ.height-1)
    gy=top+above; H=gy+1+below+bot
    W=side+(NJ.width+gap if with_ninja else 0)+sum(bb[2]-bb[0] for frs,bb,_,_ in items)+gap*(len(items)-1)+side
    base=ground(W,H,ox=gox)
    if with_ninja: base.alpha_composite(NJ,(side,gy-NJ.height+1))
    xs=[]; x=side+(NJ.width+gap if with_ninja else 0)
    for frs,bb,(ax,ay),a in items:
        xs.append((x-bb[0],gy-ay)); x+=bb[2]-bb[0]+gap
    n=max(len(frs) for frs,_,_,_ in items)
    scene.sprites=[f for frs,_,_,_ in items for f in frs]; scene.base=ground(W,H,ox=gox)
    out=[]
    for i in range(n):
        im=base.copy()
        for (frs,bb,anc,a),(px,py) in zip(items,xs):
            im.alpha_composite(frs[f_of(i,len(frs))],(px,py))
        out.append(im)
    return out

def to_gif(frames1x, path, durations, caption, scale=2, sprite_imgs=(), groundimg=None):
    import numpy as np
    W,H=frames1x[0].size
    # exact colours of the art (sprites + ninja), ground reduced to the remaining slots
    sc=set()
    for im in list(sprite_imgs)+[NJ]:
        a=np.array(im.convert('RGBA')); m=a[...,3]>0; sc|=set(map(tuple,a[m][:,:3].tolist()))
    textcols=[tuple(int(BG[i]+(TXT[i]-BG[i])*t/5) for i in range(3)) for t in range(6)]
    k=min(64,254-len(sc)-len(textcols))
    gq=groundimg.convert('RGB').quantize(colors=k,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
    gp=gq.getpalette()[:3*k]; gcols=[tuple(gp[i:i+3]) for i in range(0,len(gp),3)]
    pal=list(sc)+textcols+gcols
    flat=[c for col in pal for c in col]; flat+=[0]*(768-len(flat))
    palimg=Image.new('P',(1,1)); palimg.putpalette(flat)
    cap=Image.new('RGB',(W*scale,BARH),BG[:3]); d=ImageDraw.Draw(cap)
    d.text((14,BARH//2),caption,font=font(20,True),fill=TXT[:3],anchor='lm')
    outs=[]
    for f in frames1x:
        q=f.convert('RGB').quantize(palette=palimg,dither=Image.Dither.NONE).resize((W*scale,H*scale),Image.NEAREST)
        full=Image.new('P',(W*scale,H*scale+BARH)); full.putpalette(flat)
        full.paste(cap.quantize(palette=palimg,dither=Image.Dither.NONE),(0,0))
        full.paste(q,(0,BARH))
        outs.append(full)
    outs[0].save(path,save_all=True,append_images=outs[1:],duration=durations,loop=0,disposal=2,optimize=False)
    # verify sprite colours survived exactly
    print(path, outs[0].size, 'art colours',len(sc),'ground colours',k,'size MB', round(os.path.getsize(path)/1e6,2))
    return outs

loop=lambda i,n:i%n
if __name__=='__main__':
    which=sys.argv[1]
    if which in ('idle','all'):
        fr=scene([(NEW_T,'oak','idle'),(NEW_T,'pine','idle')],loop,gox=60)
        to_gif(fr,OUT+'11-arboles.gif',[200]*len(fr),'11 · Roble y pino nuevos: se mecen con el viento (8 cuadros, 5 por segundo) · zoom 2x',sprite_imgs=scene.sprites,groundimg=scene.base)
        fr=scene([(NEW_T,'maple','idle'),(NEW_T,'bamboo','idle'),(NEW_T,'stump','idle')],loop,gox=400)
        to_gif(fr,OUT+'11-arboles-arce-bambu.gif',[200]*len(fr),'11 · Arce, bambú y tocón nuevos: se mecen con el viento (8 cuadros, 5 por segundo) · zoom 2x',sprite_imgs=scene.sprites,groundimg=scene.base)
    if which in ('fire','all'):
        fr=scene([(NEW_T,'oak','burning')],loop,gox=200)
        to_gif(fr,OUT+'11-arboles-fuego.gif',[90]*len(fr),'11 · Roble ardiendo (nuevo): 8 cuadros, 11 por segundo · zoom 2x',sprite_imgs=scene.sprites,groundimg=scene.base)
