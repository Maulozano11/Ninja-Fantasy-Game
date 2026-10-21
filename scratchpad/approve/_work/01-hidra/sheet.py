import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/01-hidra')
from rig import *
from gifs import scene, CH, CHA, CHAR_DX
from PIL import ImageDraw, ImageFont
FB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; FR='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def F(sz,b=False): return ImageFont.truetype(FB if b else FR, sz)
BG=(0x14,0x18,0x1c,255); CARD=(0x1d,0x23,0x29,255); LINE=(0x2e,0x36,0x3e,255)
TXT=(236,239,242); SUB=(160,172,182); ACC=(140,214,120)
PAD,GAP=36,30
CARD_ON_GROUND = '--ground' in sys.argv

def on_bg(rgba, fill=CARD):
    b=Image.new('RGBA',rgba.size,fill); b.alpha_composite(rgba); return b

def panel(img, title, sub=None, fill=None):
    """returns an RGBA block: title + sub + framed image"""
    tf,sf=F(24,True),F(18)
    lines=[(title,tf,TXT)]+([(sub,sf,SUB)] if sub else [])
    th=sum((32 if f is tf else 26) for _,f,_ in lines)+6
    w=max(img.width+2, max(int(ImageDraw.Draw(Image.new('L',(1,1))).textlength(t,font=f)) for t,f,_ in lines))
    blk=Image.new('RGBA',(w,th+img.height+2),BG)
    d=ImageDraw.Draw(blk); y=0
    for t,f,c in lines:
        d.text((0,y),t,font=f,fill=c); y+=32 if f is tf else 26
    d.rectangle((0,th,img.width+1,th+img.height+1),outline=LINE)
    blk.alpha_composite(img.convert('RGBA'),(1,th+1))
    return blk

def hrow(blocks, gap=GAP):
    w=sum(b.width for b in blocks)+gap*(len(blocks)-1); h=max(b.height for b in blocks)
    r=Image.new('RGBA',(w,h),BG); x=0
    for b in blocks: r.alpha_composite(b,(x,0)); x+=b.width+gap
    return r

def textblock(lines, width):
    h=sum(l[2] for l in lines)+8
    t=Image.new('RGBA',(width,h),BG); d=ImageDraw.Draw(t); y=0
    for s,f,lh,c in [(a,b,c,d_) for a,b,c,d_ in [(l[0],l[1],l[2],l[3] if len(l)>3 else TXT) for l in lines]]:
        d.text((0,y),s,font=f,fill=c); y+=lh
    return t

# ---------- row 1: assembled hydra at 1x and 2x, reference ----------
idle0=compose(('idle',0),[('neck','idle',0)]*7)
cx,cy=ORIGIN[0]+CHAR_DX-CHA[0], ORIGIN[1]-CHA[1]
def scene_dark(comp, box):
    im=Image.new('RGBA',(box[2]-box[0],box[3]-box[1]),CARD)
    im.alpha_composite(CH,(cx-box[0],cy-box[1]))
    im.alpha_composite(comp.crop(box))
    return im
_,box=scene([compose(('idle',f),[('neck','idle',f)]*7) for f in range(8)])
s1=scene_dark(idle0,box)
pA=panel(s1,'Tamaño real en el juego','vista Táctica (1×), con el personaje de 1,75 m')
pB=panel(nn(s1,2),'Zoom 2×','como se ve en la vista Cerca (2×)')
ref=Image.open(S+'art2/REF-hydra-owner.jpg').convert('RGBA').resize((420,420),Image.LANCZOS)
pC=panel(ref,'Tu referencia','(imagen que enviaste, reducida)')
meas=textblock([('Medidas en el juego',F(22,True),34),
                ('• Alto: 6,5 m hasta la cabeza más alta',F(18),28,SUB),
                ('• Ancho: 6 m (cuerpo de 5,7 m)',F(18),28,SUB),
                ('• Cabezas: unos 1,0 m de largo',F(18),28,SUB),
                ('• 7 cuellos con cabeza, cada uno',F(18),28,SUB),
                ('   con su propia animación',F(18),28,SUB),
                ('• Mira a la derecha; el juego la',F(18),28,SUB),
                ('   refleja cuando mira a la izquierda',F(18),28,SUB)], 430)
colA=Image.new('RGBA',(max(pA.width,meas.width),pA.height+36+meas.height),BG)
colA.alpha_composite(pA,(0,0)); colA.alpha_composite(meas,(0,pA.height+36))
row1=hrow([colA,pB,pC])

# ---------- row 2: severed head ----------
H=6
cut_box=(ORIGIN[0]-30,ORIGIN[1]-288,ORIGIN[0]+192,ORIGIN[1]-24)
def cutstate(h7):
    heads=[('neck','idle',0)]*7; heads[H]=h7
    return compose(('idle',0),heads).crop(cut_box)
gbg=ground_crop(260,420,cut_box[2]-cut_box[0],cut_box[3]-cut_box[1])
def cutpanel(h7,t,sub):
    c=cutstate(h7)
    base=gbg.copy() if CARD_ON_GROUND else Image.new('RGBA',c.size,CARD)
    base.alpha_composite(c)
    return panel(nn(base,2),t,sub)
cuts=[cutpanel(('stump+neck','raw',0,'sever',3),'1 · Corte','la cabeza cae y se deshace en niebla'),
      cutpanel(('stump','raw',0),'2 · Muñón abierto','rezuma veneno; rebrota en 2 turnos'),
      cutpanel(('stump','burnt',0),'3 · Muñón sellado','con fuego, rayo o explosión: no rebrota'),
      cutpanel(('stump+neck','raw',0,'regrow',5),'4 · Rebrote','si no se selló a tiempo (2 turnos)')]
row2=hrow(cuts)
hdr2=textblock([('Cabeza cortada  (cabeza delantera derecha, zoom 2×)',F(28,True),40),
                ('Regla del juego: al cortar una cabeza queda un muñón. Si no se sella con fuego, rayo o explosión, la cabeza vuelve a crecer en 2 turnos.',F(19),30,SUB)], row2.width)

# ---------- row 3: 4x zooms ----------
z1=panel(nn(on_bg(frame('hydra_neck_1','idle',0).crop((18,2,112,82))),4),'Cabeza (la central)','cuernos dorados, ojos verdes, dientes')
bb_=(ORIGIN[0]-112,ORIGIN[1]-138,ORIGIN[0]+42,ORIGIN[1]+4)
z2=panel(nn(on_bg(idle0.crop(bb_)),4),'Pata, garras y vientre','escamas en arcos, placas doradas')
st=Image.new('RGBA',(46*2+6,87),CARD)
st.alpha_composite(frame('hydra_stump','raw',0),(0,0)); st.alpha_composite(frame('hydra_stump','burnt',0),(52,0))
z3=panel(nn(st,4),'Muñón','abierto  /  sellado (quemado)')
v=frame('hydra_venom','fly',0); sp=frame('hydra_splash','splash',5)
fx=Image.new('RGBA',(v.width+8+sp.width,max(v.height,sp.height)),CARD)
fx.alpha_composite(v,(0,(fx.height-v.height)//2)); fx.alpha_composite(sp,(v.width+8,0))
z4=panel(nn(fx,4),'Veneno','gota que escupe  /  charco que deja')
row3=hrow([z1,z2,z3,z4])
hdr3=textblock([('Detalle de píxeles  (zoom 4×)',F(28,True),40)], row3.width)

# ---------- assemble ----------
title_h=104
W=max(row1.width,row2.width,row3.width)+2*PAD
Hh=title_h+30+row1.height+50+hdr2.height+10+row2.height+50+hdr3.height+6+row3.height+PAD
out=Image.new('RGBA',(W,Hh),BG)
d=ImageDraw.Draw(out)
d.rectangle((0,0,W,title_h),fill=(0x1f,0x26,0x2d,255)); d.rectangle((0,title_h-4,W,title_h),fill=(70,150,80,255))
d.text((PAD,18),'01 · Hidra de siete cabezas',font=F(40,True),fill=TXT)
d.text((PAD+int(d.textlength('01 · Hidra de siete cabezas',font=F(40,True)))+28,34),'jefe de la misión 1  ·  arte nuevo para tu aprobación',font=F(24),fill=SUB)
y=title_h+30
out.alpha_composite(row1,(PAD,y)); y+=row1.height+50
out.alpha_composite(hdr2,(PAD,y)); y+=hdr2.height+10
out.alpha_composite(row2,(PAD,y)); y+=row2.height+50
out.alpha_composite(hdr3,(PAD,y)); y+=hdr3.height+6
out.alpha_composite(row3,(PAD,y))
out.convert('RGB').save(OUT+'01-hidra.png', optimize=True)
print(out.size)
