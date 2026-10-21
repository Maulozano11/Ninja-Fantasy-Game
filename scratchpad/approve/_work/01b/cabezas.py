import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/01-hidra')
from rig import *
from gifs import CH, CHA, CHAR_DX, GX0, GY0, timeline, save_gif, cum_durations, contact_strip
from fractions import Fraction as Fr
from PIL import ImageDraw, ImageFont
import os
FB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; FR='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def F(sz,b=False): return ImageFont.truetype(FB if b else FR, sz)
BG=(0x14,0x18,0x1c,255); LINE=(0x2e,0x36,0x3e,255); TXT=(236,239,242); SUB=(160,172,182); ACC=(140,214,120)

# Cut order: the two front necks first (they hide the chest), then the back ones.
ORDER=[6,5,4,3,2,1,0]
SEAL={6:False,5:True,4:False,3:True,2:True,1:False,0:True}   # sealed (burnt) or open (raw) stump

def state(ncut, f=0, body=('idle',None)):
    heads=[('neck','idle',f)]*7
    for i in ORDER[:ncut]:
        heads[i]=('stump','burnt' if SEAL[i] else 'raw',f%4)
    b=(body[0], f if body[1] is None else body[1])
    return compose(b,heads)

# One box that fits every state (and the death fall), with the character for scale.
allc=[state(n,f) for n in range(8) for f in range(8)]+[compose(('death',k),[('stump','burnt' if SEAL[i] else 'raw',0) for i in range(7)]) for k in range(10)]
bb=bbox_union(allc)
cx,cy=ORIGIN[0]+CHAR_DX-CHA[0], ORIGIN[1]-CHA[1]
box=(bb[0]-14, bb[1]-12, max(bb[2],cx+CH.width)+14, max(bb[3],cy+CH.height)+22)
W,H=box[2]-box[0],box[3]-box[1]
g=ground_crop(GX0,GY0,W,H)
def onground(comp):
    f=g.copy(); f.alpha_composite(CH,(cx-box[0],cy-box[1])); f.alpha_composite(comp.crop(box)); return f

def panel(img,title,sub):
    tf,sf=F(24,True),F(17)
    blk=Image.new('RGBA',(img.width+2,img.height+2+66),BG)
    d=ImageDraw.Draw(blk); d.text((0,0),title,font=tf,fill=TXT); d.text((0,34),sub,font=sf,fill=SUB)
    d.rectangle((0,66,img.width+1,img.height+67),outline=LINE); blk.alpha_composite(img.convert('RGBA'),(1,67)); return blk

STATES=[(0,'7 cabezas','la hidra entera'),
        (2,'2 cortadas','muñón abierto (rebrota) y sellado (quemado)'),
        (4,'4 cortadas','sin los cuellos delanteros se ve el pecho'),
        (6,'6 cortadas','queda una sola cabeza'),
        (7,'Las 7 cortadas','sin cabezas a la vez: la hidra muere')]
panels=[panel(nn(onground(state(n,0)),2),t,s) for n,t,s in STATES]
# layout: 3 + 2
def row(bs,gap=28):
    w=sum(b.width for b in bs)+gap*(len(bs)-1); h=max(b.height for b in bs)
    r=Image.new('RGBA',(w,h),BG); x=0
    for b in bs: r.alpha_composite(b,(x,0)); x+=b.width+gap
    return r
r1=row(panels[:3]); r2=row(panels[3:])
head=Image.new('RGBA',(max(r1.width,r2.width)+72,120),BG)
d=ImageDraw.Draw(head)
d.text((36,26),'01 · Hidra con cabezas cortadas',font=F(38,True),fill=TXT)
d.text((36,78),'Zoom 2× sobre el pasto del mapa · muñón verde-morado = abierto (rebrota en 2 turnos) · muñón negro = sellado con fuego, rayo o explosión',font=F(18),fill=SUB)
d.line((0,119,head.width,119),fill=(90,170,90,255),width=3)
legend=Image.new('RGBA',(head.width,70),BG)
ImageDraw.Draw(legend).text((36,18),'Orden de corte en la hoja: primero los 2 cuellos delanteros, luego los de atrás. En combate puedes cortar cualquiera.',font=F(18),fill=SUB)
sheet=Image.new('RGBA',(head.width,head.height+r1.height+r2.height+legend.height+28*2+36),BG)
y=0; sheet.alpha_composite(head,(0,y)); y+=head.height+28
sheet.alpha_composite(r1,(36,y)); y+=r1.height+28
sheet.alpha_composite(r2,(36,y)); y+=r2.height+8
sheet.alpha_composite(legend,(0,y))
OUTP=OUT+'01-hidra-cabezas.png'; sheet.convert('RGB').save(OUTP); print(OUTP, sheet.size)

# ---- GIF: the heads come off one by one, the stumps stay; with all seven gone the body dies ----
SEV=[anim_info(rig['heads'][i]['sprite'],'sever') for i in range(7)]
STEP=Fr(900)                       # one cut every 1.1 s
deathA=anim_info('hydra_body','death')
t_death=STEP*7+Fr(300)
total=t_death+Fr(1000*deathA['frames'],deathA['fps'])+Fr(1200)
ev=set([Fr(0)])
k=0
while Fr(k*1000,6)<total: ev.add(Fr(k*1000,6)); k+=1   # idle 6 fps
for j,i in enumerate(ORDER):
    s=SEV[i]
    for q in range(s['frames']): ev.add(STEP*j+Fr(300)+Fr(q*1000,s['fps']))
for q in range(deathA['frames']): ev.add(t_death+Fr(q*1000,deathA['fps']))
ev=[Fr(k*100) for k in range(int(total//100))]
FBo=F(22,True)
frames=[]
for t in ev:
    fi=int(t//Fr(1000,6))%8
    heads=[('neck','idle',fi)]*7
    ncut=0
    for j,i in enumerate(ORDER):
        t0=STEP*j+Fr(300); s=SEV[i]; t1=t0+Fr(1000*s['frames'],s['fps'])
        stump=('burnt' if SEAL[i] else 'raw')
        if t>=t1: heads[i]=('stump',stump,fi%4); ncut+=1
        elif t>=t0: heads[i]=('stump+neck','raw',fi%4,'sever',min(s['frames']-1,int((t-t0)//Fr(1000,s['fps']))))
    if t>=t_death:
        q=min(deathA['frames']-1,int((t-t_death)//Fr(1000,deathA['fps'])))
        comp=compose(('death',q),[('stump','burnt' if SEAL[i] else 'raw',0) for i in range(7)])
        cap='Sin cabezas: la hidra cae'
    else:
        comp=compose(('idle',fi),heads)
        cap=f'Cabezas cortadas: {ncut} de 7'
    f=nn(onground(comp),2)
    out=Image.new('RGB',(f.width,f.height+52),(20,24,28)); out.paste(f.convert('RGB'),(0,52))
    ImageDraw.Draw(out).text((12,9),cap,font=F(26,True),fill=TXT)
    frames.append(out)
du=cum_durations([float(t) for t in ev], float(total))
p=OUT+'01-hidra-cabezas.gif'
fr=[f.convert('RGB') for f in frames]
big=Image.new('RGB',(fr[0].width,fr[0].height*len(fr)))
for i,f in enumerate(fr): big.paste(f,(0,i*fr[0].height))
pal=big.quantize(colors=256,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
q=[f.quantize(palette=pal,dither=Image.Dither.NONE) for f in fr]
q[0].save(p,save_all=True,append_images=q[1:],duration=du,loop=0,disposal=1,optimize=True)
print(p, frames[0].size, len(frames), os.path.getsize(p))
contact_strip(p, W_:= '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/01b/strip.png', cols=10)
