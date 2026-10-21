import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/11-arboles')
from artlib import *
NJ=ninja()
PLANTS=[('bush_round','Arbusto redondo'),('bush_wide','Arbusto ancho'),('bush_flower','Azalea (con flores)'),
        ('tall_grass','Hierba alta'),('reeds','Juncos / espadañas'),('fern','Helecho'),
        ('flowers','Flores silvestres'),('lily_pads','Nenúfares (sobre el agua)'),('mushroom_log','Tronco con musgo y setas')]
def item(d,name):
    fr=frame(d,name,'idle',0); bb=fr.getchannel('A').getbbox(); ax,ay=manifest(d)[name]['anchor']; return fr,bb,ax,ay
P=10; TOP1=22
def pair(name,k):
    its=[item(OLD_P,name),item(NEW_P,name)]
    above=max(ay-bb[1] for fr,bb,ax,ay in its); below=max(bb[3]-1-ay for fr,bb,ax,ay in its)
    gy=TOP1+above; H=gy+1+below+8
    out=[]
    for j,(fr,bb,ax,ay) in enumerate(its):
        w=max(bb[2]-bb[0]+2*P,56)
        p=water(w,H) if name=='lily_pads' else ground(w,H,ox=37*k+200*j)
        tx=(w-(bb[2]-bb[0]))//2-bb[0]; p.alpha_composite(fr,(tx,gy-ay)); out.append(up(p,2))
    return out
cells=[(es,)+tuple(pair(n,k)) for k,(n,es) in enumerate(PLANTS)]
M=24; G=10; CG=34; HDR=34
colW=[0,0,0]
for i,(es,a,b) in enumerate(cells): colW[i%3]=max(colW[i%3],a.width+G+b.width)
rowH=[0,0,0]
for i,(es,a,b) in enumerate(cells): rowH[i//3]=max(rowH[i//3],a.height)
# real-size lineups (1x)
def lineup(d,gox):
    its=[item(d,n) for n,_ in PLANTS if n!='lily_pads']
    above=max(max(ay-bb[1] for fr,bb,ax,ay in its),NJ.height-1); below=max(bb[3]-1-ay for fr,bb,ax,ay in its)
    gy=16+above; H=gy+1+below+10; gap=18
    W=14+NJ.width+gap+sum(bb[2]-bb[0] for fr,bb,ax,ay in its)+gap*(len(its)-1)+14
    p=ground(W,H,ox=gox); p.alpha_composite(NJ,(14,gy-NJ.height+1)); x=14+NJ.width+gap
    for fr,bb,ax,ay in its: p.alpha_composite(fr,(x-bb[0],gy-ay)); x+=bb[2]-bb[0]+gap
    return p
LA=lineup(OLD_P,0); LB=lineup(NEW_P,500)
W=max(M+sum(colW)+2*CG+M, M+LA.width+G*2+LB.width+M)
H=100+M+sum(HDR+h+CG for h in rowH)+HDR+28+max(LA.height,LB.height)+50
img=Image.new('RGBA',(W,H),BG)
title_bar(img,'11','Plantas: antes y después',
          'Zoom 2x sobre el suelo del mapa (los nenúfares, sobre el agua del río) · abajo, todas a tamaño real (1x) junto al ninja')
d=ImageDraw.Draw(img)
y=100+M
for r in range(3):
    x=M
    for c in range(3):
        es,a,b=cells[r*3+c]
        text(d,(x,y),es,20,TXT,True)
        yy=y+HDR
        img.alpha_composite(a,(x,yy)); tag(img,(x+6,yy+6),'ANTES',OLDC,15)
        img.alpha_composite(b,(x+a.width+G,yy)); tag(img,(x+a.width+G+6,yy+6),'DESPUÉS',NEWC,15)
        x+=colW[c]+CG
    y+=HDR+rowH[r]+CG
d.line((M,y-CG//2,W-M,y-CG//2),fill=(44,52,58,255))
text(d,(M,y),'Tamaño real en el juego (1x) · sin los nenúfares, que van en el agua',20,TXT,True)
y+=HDR
text(d,(M,y),'ANTES',16,OLDC,True); text(d,(M+LA.width+2*G,y),'DESPUÉS',16,NEWC,True)
y+=26
img.alpha_composite(LA,(M,y)); img.alpha_composite(LB,(M+LA.width+2*G,y))
y+=max(LA.height,LB.height)+16
text(d,(M,y),'Fuente nueva: art3/staging/plants (último render del artista). Antes: src/assets/world/plants.',15,SUB)
print(img.size)
save_png(img,OUT+'11-plantas.png')
