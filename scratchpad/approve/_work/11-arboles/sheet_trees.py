import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/11-arboles')
from artlib import *

NJ=ninja()
PAD=16; TOP=48; BOT=14; NJGAP=22; MINW=230

def place(d,name,anim,f,gy,width,with_ninja=True,ground_img=None,ox=0):
    """Panel of given width with ground line at gy (panel height = gy+below+BOT handled by caller)."""
    fr=frame(d,name,anim,f); bb=fr.getchannel('A').getbbox()
    ax,ay=manifest(d)[name]['anchor']
    return fr,bb,ax,ay

def row_metrics(items):
    above=max(ay-bb[1] for fr,bb,ax,ay in items); below=max(bb[3]-1-ay for fr,bb,ax,ay in items)
    return above,below

def build_panel(item,gy,H,with_ninja=True,gox=0):
    fr,bb,ax,ay=item
    w=PAD+(NJ.width+NJGAP if with_ninja else 0)+(bb[2]-bb[0])+PAD
    extra=max(0,MINW-w)//2; w=max(w,MINW)
    p=ground(w,H,ox=gox)
    if with_ninja:
        p.alpha_composite(NJ,(PAD+extra,gy-NJ.height+1))
    tx=PAD+extra+(NJ.width+NJGAP if with_ninja else 0)-bb[0]
    ty=gy-ay
    p.alpha_composite(fr,(tx,ty))
    return p,(tx,ty)

TREES=[
 ('oak','Roble','Tronco nudoso y retorcido, raíces a la vista, musgo y lianas; la copa está hecha de muchas hojas pequeñas.',
   (150,112,290,252),(125,418,265,558),'Copa · zoom 3x','Tronco y raíces · zoom 3x'),
 ('pine','Pino','Ahora es un pino negro japonés con ramas en pisos (antes era un cedro). Más ancho: 3 m → 4,5 m.',
   (104,84,244,224),(60,360,200,500),'Copa y ramas · zoom 3x','Tronco y raíces · zoom 3x'),
 ('maple','Arce rojo','Tronco gris trenzado con musgo, copa roja en capas, hojas caídas al pie.',
   (120,18,260,158),(98,178,238,318),'Copa · zoom 3x','Tronco · zoom 3x'),
 ('bamboo','Bambú','Cañas con nudos, vainas marrones en la base y un brote nuevo al lado.',
   (40,0,180,140),(38,221,178,361),'Copas · zoom 3x','Base de las cañas · zoom 3x'),
 ('stump','Tocón','Anillos, corteza y musgo con más detalle; un poco más ancho (0,75 m → 0,8 m).',None,None,'ANTES · zoom 3x','DESPUÉS · zoom 3x'),
]
def meters(d,name):
    m=manifest(d)[name]['meters']; f=lambda v:('%g'%v).replace('.',',')
    return f'{f(m[0])} × {f(m[1])} m'

rows=[]
for name,es,desc,zc,zt,l1,l2 in TREES:
    old=place(OLD_T,name,'idle',0,0,0); new=place(NEW_T,name,'idle',0,0,0)
    above,below=row_metrics([old,new])
    above=max(above,NJ.height-1)
    gy=TOP+above; H=gy+1+below+BOT
    pa,_=build_panel(old,gy,H,gox=0)
    pb,off=build_panel(new,gy,H,gox=300)
    if zc:
        z1=up(pb.crop((zc[0]+off[0],zc[1]+off[1],zc[2]+off[0],zc[3]+off[1])),3)
        z2=up(pb.crop((zt[0]+off[0],zt[1]+off[1],zt[2]+off[0],zt[3]+off[1])),3)
    else:
        # stump: whole stump on ground, old and new, 3x
        def whole(item,gox):
            fr,bb,ax,ay=item
            w=bb[2]-bb[0]+24; h=bb[3]-bb[1]+24
            p=ground(w,h,ox=gox); p.alpha_composite(fr,(12-bb[0],12-bb[1])); return up(p,3)
        z1=whole(old,40); z2=whole(new,80)
    rows.append(dict(name=name,es=es,desc=desc,pa=pa,pb=pb,z1=z1,z2=z2,l1=l1,l2=l2,
                     mo=meters(OLD_T,name),mn=meters(NEW_T,name)))

M=24; GAP=14; HDR=62; ZL=30; RG=30
colA=max(r['pa'].width for r in rows); colB=max(r['pb'].width for r in rows)
colZ=max(max(r['z1'].width,r['z2'].width) for r in rows)
W=M+colA+GAP+colB+M+colZ+GAP+colZ+M
Htot=100+M
for r in rows:
    r['h']=max(r['pa'].height, ZL+r['z1'].height, ZL+r['z2'].height)
    Htot+=HDR+r['h']+RG
Htot+=40
img=Image.new('RGBA',(W,Htot),BG)
title_bar(img,'11','Árboles: antes y después',
          'Tamaño real en el juego (1x) sobre el suelo del mapa · a la derecha, zoom 3x del árbol nuevo · el ninja marca la escala')
d=ImageDraw.Draw(img)
y=100+M
xA=M; xB=M+colA+GAP; xZ1=xB+colB+M; xZ2=xZ1+colZ+GAP
for r in rows:
    text(d,(M,y),r['es'],28,TXT,True)
    x2=M+tw(r['es'],28,True)+16
    text(d,(x2,y+8),f"Medida: {r['mo']} → {r['mn']}",18,GOLD)
    text(d,(M,y+36),r['desc'],18,SUB)
    y0=y+HDR
    # panels (top aligned, same height within row)
    pa,pb=r['pa'],r['pb']
    ax_=xA+(colA-pa.width)//2; bx_=xB+(colB-pb.width)//2
    img.alpha_composite(pa,(ax_,y0)); img.alpha_composite(pb,(bx_,y0))
    tag(img,(ax_+8,y0+8),'ANTES (en el juego)',OLDC)
    tag(img,(bx_+8,y0+8),'DESPUÉS (nuevo)',NEWC)
    for xz,z,l in [(xZ1,r['z1'],r['l1']),(xZ2,r['z2'],r['l2'])]:
        text(d,(xz,y0+2),l,18,TXT,True)
        img.alpha_composite(z,(xz,y0+ZL))
        d.rectangle((xz-1,y0+ZL-1,xz+z.width,y0+ZL+z.height),outline=(70,78,84,255))
    y=y0+r['h']+RG
    d.line((M,y-RG//2,W-M,y-RG//2),fill=(44,52,58,255),width=1)
text(d,(M,y+4),'Fuente nueva: art3/staging/trees (último render del artista). Antes: src/assets/world/trees.',15,SUB)
print('size',img.size)
save_png(img,OUT+'11-arboles.png')
