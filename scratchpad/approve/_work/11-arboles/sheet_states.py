import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/11-arboles')
from artlib import *
NJ=ninja()
PAD=16; TOP=48; BOT=14; NJGAP=22; MINW=230
def item(d,name,anim,f=0):
    fr=frame(d,name,anim,f); bb=fr.getchannel('A').getbbox(); ax,ay=manifest(d)[name]['anchor']; return fr,bb,ax,ay
def panels(items,with_ninja,goxs):
    above=max(ay-bb[1] for fr,bb,ax,ay in items); below=max(bb[3]-1-ay for fr,bb,ax,ay in items)
    if with_ninja: above=max(above,NJ.height-1)
    gy=TOP+above; H=gy+1+below+BOT; out=[]
    for (fr,bb,ax,ay),gox in zip(items,goxs):
        w=PAD+(NJ.width+NJGAP if with_ninja else 0)+(bb[2]-bb[0])+PAD
        extra=max(0,MINW-w)//2; w=max(w,MINW)
        p=ground(w,H,ox=gox)
        if with_ninja: p.alpha_composite(NJ,(PAD+extra,gy-NJ.height+1))
        tx=PAD+extra+(NJ.width+NJGAP if with_ninja else 0)-bb[0]; ty=gy-ay
        p.alpha_composite(fr,(tx,ty)); out.append((p,(tx,ty)))
    return out

M=24; GAP=14
# Row 1: burning oak
(pa,_),(pb,off)=panels([item(OLD_T,'oak','burning'),item(NEW_T,'oak','burning')],True,[0,300])
zc=(110,58,270,198)
z=up(pb.crop((zc[0]+off[0],zc[1]+off[1],zc[2]+off[0],zc[3]+off[1])),3)
# Row 2: burnt
pairs=[]
for k,(name,es) in enumerate([('oak','Roble'),('pine','Pino'),('maple','Arce rojo')]):
    ps=panels([item(OLD_T,name,'burnt'),item(NEW_T,name,'burnt')],False,[100*k,100*k+400])
    pairs.append((es,ps[0][0],ps[1][0]))
w1=M+pa.width+GAP+pb.width+M+z.width+M
w2=M+sum(a.width+GAP+b.width for _,a,b in pairs)+28*(len(pairs)-1)+M
W=max(w1,w2)
HDR=62
h1=max(pa.height,30+z.height); h2=max(a.height for _,a,b in pairs)+34
H=100+M+HDR+h1+40+HDR+h2+70
img=Image.new('RGBA',(W,H),BG)
title_bar(img,'11','Árboles: fuego y quemado',
          'Tamaño real en el juego (1x) sobre el suelo del mapa · ANTES = lo que hay ahora en el juego, DESPUÉS = lo nuevo')
d=ImageDraw.Draw(img)
y=100+M
text(d,(M,y),'Roble ardiendo',28,TXT,True)
text(d,(M+tw('Roble ardiendo',28,True)+16,y+8),'animación en bucle: 8 cuadros a 11 por segundo (ver el GIF)',18,GOLD)
text(d,(M,y+36),'Solo el roble tiene animación de fuego (antes también era así). La copa se carboniza desde arriba y el tronco tiene brasas.',18,SUB)
y0=y+HDR
img.alpha_composite(pa,(M,y0)); tag(img,(M+8,y0+8),'ANTES (en el juego)',OLDC)
xb=M+pa.width+GAP
img.alpha_composite(pb,(xb,y0)); tag(img,(xb+8,y0+8),'DESPUÉS (nuevo)',NEWC)
xz=xb+pb.width+M
text(d,(xz,y0+2),'Copa en llamas (nuevo) · zoom 3x',18,TXT,True)
img.alpha_composite(z,(xz,y0+30)); d.rectangle((xz-1,y0+29,xz+z.width,y0+30+z.height),outline=(70,78,84,255))
y=y0+h1+20
d.line((M,y,W-M,y),fill=(44,52,58,255)); y+=20
text(d,(M,y),'Quemado',28,TXT,True)
text(d,(M+tw('Quemado',28,True)+16,y+8),'lo que queda en el mapa después del fuego (imagen fija)',18,GOLD)
text(d,(M,y+36),'El tronco quemado queda exactamente donde estaba el árbol vivo. El bambú no tiene estado quemado (tampoco antes).',18,SUB)
y0=y+HDR; x=M
for es,a,b in pairs:
    text(d,(x,y0),es,20,TXT,True)
    img.alpha_composite(a,(x,y0+30)); tag(img,(x+8,y0+38),'ANTES',OLDC)
    img.alpha_composite(b,(x+a.width+GAP,y0+30)); tag(img,(x+a.width+GAP+8,y0+38),'DESPUÉS',NEWC)
    x+=a.width+GAP+b.width+28
y=y0+h2+16
text(d,(M,y),'Fuente nueva: art3/staging/trees (último render del artista). Antes: src/assets/world/trees.',15,SUB)
print(img.size)
save_png(img,OUT+'11-arboles-estados.png')
