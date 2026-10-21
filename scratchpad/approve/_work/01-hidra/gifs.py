import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/01-hidra')
from rig import *
import os
CH,CHA=character()
CHAR_DX=250   # character feet, px right of the hydra's body anchor
GX0,GY0=170,372  # top-left of the ground crop (plain grass, full-res map px)

def scene(layers_list, margin=(16,14,16,24)):
    """layers_list: list of 1x RGBA work-canvas images (hydra composites). Returns list of opaque frames at 1x"""
    cx,cy=ORIGIN[0]+CHAR_DX-CHA[0], ORIGIN[1]-CHA[1]
    bb=bbox_union(layers_list)
    bb=(min(bb[0],cx),min(bb[1],cy),max(bb[2],cx+CH.width),max(bb[3],cy+CH.height,ORIGIN[1]+1))
    l,t,r,b=margin
    box=(bb[0]-l,bb[1]-t,bb[2]+r,bb[3]+b)
    w,h=box[2]-box[0],box[3]-box[1]
    g=ground_crop(GX0,GY0,w,h)
    out=[]
    for im in layers_list:
        f=g.copy()
        f.alpha_composite(CH,(cx-box[0],cy-box[1]))
        f.alpha_composite(im.crop(box),(0,0))
        out.append(f.convert('RGB'))
    return out,box

from fractions import Fraction as Fr
def timeline(tracks, total):
    """tracks: list of (start_ms, fps, nframes, loop). Exact rational times.
    Returns event times (ms, float) and per-event tuple of frame indices (None before start)."""
    total=Fr(total)
    ev=set([Fr(0)])
    for st,fps,n,loop in tracks:
        st=Fr(st); step=Fr(1000,fps); k=0
        while True:
            t=st+k*step
            if t>=total: break
            if t>=0: ev.add(t)
            k+=1
            if not loop and k>=n: break
    ev=sorted(ev)
    states=[]
    for t in ev:
        s=[]
        for st,fps,n,loop in tracks:
            st=Fr(st); step=Fr(1000,fps)
            if t<st: s.append(None); continue
            i=int((t-st)//step)
            s.append(i%n if loop else min(i,n-1))
        states.append(tuple(s))
    return [float(t) for t in ev],states

if __name__=='__main__':
    which=sys.argv[1:] or ['idle','mordida','corte']
    if 'idle' in which:
        fps=man['hydra_body']['anims']['idle']['fps']
        n=8
        comps=[compose(('idle',f),[('neck','idle',f)]*7) for f in range(n)]
        frames,box=scene(comps)
        frames=[nn(f,2) for f in frames]
        times=[i*1000.0/fps for i in range(n)]
        du=cum_durations(times, n*1000.0/fps)
        p=OUT+'01-hidra-idle.gif'; save_gif(frames,du,p)
        print('idle',frames[0].size,du,os.path.getsize(p))
    if 'mordida' in which:
        H=6  # head index 6 = hydra_neck_7 (front, low, right)
        nb=anim_info('hydra_neck_7','bite')
        total=Fr(8000,6)   # one full idle cycle, so the other heads loop seamlessly
        ev,st=timeline([(0,6,8,True),(0,nb['fps'],nb['frames'],False)], total)
        comps=[]
        for (fi,fb) in st:
            heads=[('neck','idle',fi)]*7; heads[H]=('neck','bite',fb)
            comps.append(compose(('idle',fi),heads))
        frames,box=scene(comps)
        frames=[nn(f,2) for f in frames]
        du=cum_durations(ev,float(total))
        p=OUT+'01-hidra-mordida.gif'; save_gif(frames,du,p)
        print('mordida',frames[0].size,list(zip(st,du)),os.path.getsize(p))

def corte():
    from PIL import ImageDraw, ImageFont
    FB=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22)
    FR=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
    H=6; N='hydra_neck_7'
    sv=anim_info(N,'sever'); rg=anim_info(N,'regrow'); sr=anim_info('hydra_stump','raw'); idl=anim_info(N,'idle')
    T_SEV=Fr(0); T_STUMP_END=None
    t_sev_end=Fr(1000*sv['frames'],sv['fps'])            # 800
    T_RG=Fr(2000); t_rg_end=T_RG+Fr(1000*rg['frames'],rg['fps'])  # 3000
    total=Fr(4000)                                        # 3 full idle cycles of the other heads
    tracks=[(0,6,8,True),                 # body + other heads idle
            (0,sv['fps'],sv['frames'],False),   # sever
            (0,sr['fps'],sr['frames'],True),    # raw stump bubbling
            (T_RG,rg['fps'],rg['frames'],False),# regrow
            (t_rg_end,idl['fps'],idl['frames'],True)]  # new head idles from frame 0
    ev,states=timeline(tracks,total)
    caps=[(0,'1 · Corte','la cabeza cae y se deshace'),
          (float(t_sev_end),'2 · Muñón abierto','rebrota en 2 turnos si no se sella|con fuego, rayo o explosión'),
          (float(T_RG),'4 · Rebrote','(pasados 2 turnos sin sellar)'),
          (float(t_rg_end),'Cabeza nueva','vuelve a atacar')]
    evs=sorted(set(ev)|{c[0] for c in caps})
    box=(ORIGIN[0]-50,ORIGIN[1]-262,ORIGIN[0]+186,ORIGIN[1]+18)
    w,h=box[2]-box[0],box[3]-box[1]
    g=ground_crop(GX0+120,GY0+20,w,h)
    band=88
    frames=[]
    for t in evs:
        tt=Fr(t).limit_denominator(1000)
        st=[]
        for (s0,fps,n,loop) in tracks:
            s0=Fr(s0); step=Fr(1000,fps)
            if tt<s0: st.append(None); continue
            i=int((tt-s0)//step); st.append(i%n if loop else min(i,n-1))
        fi,fs,fr_,fg,fn=st
        heads=[('neck','idle',fi)]*7
        if tt<t_sev_end: heads[H]=('stump+neck','raw',fr_,'sever',fs)
        elif tt<T_RG: heads[H]=('stump','raw',fr_)
        elif tt<t_rg_end: heads[H]=('stump+neck','raw',fr_,'regrow',fg)
        else: heads[H]=('neck','idle',fn)
        comp=compose(('idle',fi),heads)
        f=g.copy(); f.alpha_composite(comp.crop(box))
        f=nn(f,2)
        out=Image.new('RGB',(f.width,f.height+band),(20,24,28))
        out.paste(f.convert('RGB'),(0,band))
        cap=[c for c in caps if c[0]<=t+1e-6][-1]
        d=ImageDraw.Draw(out)
        d.text((14,8),cap[1],font=FB,fill=(236,239,242))
        # wrap subtitle to width
        lines=cap[2].split('|')
        for l in lines: assert d.textlength(l,font=FR)<=out.width-28, l
        for k,l in enumerate(lines[:2]): d.text((14,40+k*21),l,font=FR,fill=(170,182,192))
        frames.append(out)
    du=cum_durations(evs,float(total))
    p=OUT+'01-hidra-corte.gif'; save_gif(frames,du,p)
    print('corte',frames[0].size,len(frames),du,os.path.getsize(p))

if __name__=='__main__' and 'corte' in sys.argv[1:]:
    corte()
