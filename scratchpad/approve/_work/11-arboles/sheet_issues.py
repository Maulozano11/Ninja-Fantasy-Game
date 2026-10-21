import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/11-arboles')
from artlib import *
def on_ground(fr,gox=0,pad=0):
    p=ground(fr.width+2*pad,fr.height+2*pad,ox=gox); p.alpha_composite(fr,(pad,pad)); return p
def ring(img,box,s,off=(0,0),w=4,col=RED):
    d=ImageDraw.Draw(img); x0,y0,x1,y1=box
    d.ellipse((x0*s+off[0],y0*s+off[1],x1*s+off[0],y1*s+off[1]),outline=col,width=w)
def badge(img,xy,n):
    d=ImageDraw.Draw(img); x,y=xy
    d.ellipse((x,y,x+34,y+34),fill=RED,outline=(255,255,255,255),width=2)
    d.text((x+17,y+18),str(n),font=font(20,True),fill=(255,255,255,255),anchor='mm')

# 1 maple limb, 4x
mp=on_ground(frame(NEW_T,'maple','idle',0),gox=50)
c1=(20,66,130,150); z1=up(mp.crop(c1),4)
ring(z1,(48-c1[0],97-c1[1],76-c1[0],121-c1[1]),4)
# 2 bamboo crowns, 3x
bp=on_ground(frame(NEW_T,'bamboo','idle',0),gox=120)
c2=(30,0,200,100); z2=up(bp.crop(c2),3)
for b in [(84,0,116,30),(134,8,166,40),(40,30,72,62)]:
    ring(z2,(b[0]-c2[0],b[1]-c2[1],b[2]-c2[0],b[3]-c2[1]),3)
# 3 bamboo whole 2x with bracket
z3=up(bp,2)
d3=ImageDraw.Draw(z3); bx=z3.width-14
y_a,y_b=150*2,275*2
d3.line((bx,y_a,bx,y_b),fill=RED,width=5); d3.line((bx-16,y_a,bx,y_a),fill=RED,width=5); d3.line((bx-16,y_b,bx,y_b),fill=RED,width=5)
# 4 oak burning boundary, 3x
op=on_ground(frame(NEW_T,'oak','burning',0),gox=200)
c4=(20,170,380,320); z4=up(op.crop(c4),3)
d4=ImageDraw.Draw(z4)
# arrows pointing to the scorched/green boundary at a few columns
import numpy as np
fr=np.array(frame(NEW_T,'oak','burning',0)).astype(int)
for x in [50,110,170,230,290,350]:
    col=fr[:,x]; ys=[y for y in range(150,330) if col[y,3]>0 and col[y,1]>col[y,0]+8]
    if not ys: continue
    yb=min(ys); X=(x-c4[0])*3+1; Y=(yb-c4[1])*3
    d4.polygon([(X-9,Y-22),(X+9,Y-22),(X,Y-4)],fill=RED,outline=(255,255,255,255))

M=24; GAP=24
colL=max(z1.width,z2.width)
W=max(M+colL+GAP+z3.width+M, M+z4.width+M)
capH=58
hA=max(32+z1.height+capH+20+32+z2.height+capH, 32+z3.height+capH)
H=100+M+hA+30+32+z4.height+capH+16
img=Image.new('RGBA',(W,H),BG)
title_bar(img,'11','Árboles: detalles que el artista aún iba a pulir',
          'El trabajo se pausó antes de terminar estos retoques · las marcas rojas son mías, no forman parte del dibujo')
d=ImageDraw.Draw(img)
def block(x,y,z,n,title,cap):
    badge(img,(x,y-2),n); text(d,(x+44,y+4),title,20,TXT,True)
    img.alpha_composite(z,(x,y+32)); d.rectangle((x-1,y+31,x+z.width,y+32+z.height),outline=(70,78,84,255))
    yy=y+32+z.height+8
    for i,line in enumerate(cap): text(d,(x,yy+i*22),line,17,SUB)
    return y+32+z.height+capH
y=100+M
yb=block(M,y,z1,1,'Arce · zoom 4x',['La punta de la rama de la izquierda asoma','por debajo del follaje.'])
block(M,yb+20,z2,2,'Bambú · zoom 3x',['Las copas de las cañas parecen estrellas','(hojas abiertas en abanico en todas direcciones).'])
block(M+colL+GAP,y,z3,3,'Bambú entero · 2x',['Demasiados ramilletes de hojas en la','parte baja de las cañas (barra roja).'])
y=y+hA+30
block(M,y,z4,4,'Roble ardiendo · zoom 3x',['El borde entre lo quemado (marrón) y lo verde forma casi una franja horizontal (flechas).',
      'Mejoró respecto al render anterior, pero la copa aún se lee en tres capas: negro, marrón y verde.'])
print(img.size)
save_png(img,OUT+'11-arboles-pendientes.png')
