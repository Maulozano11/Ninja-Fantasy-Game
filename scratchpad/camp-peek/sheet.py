import sys
from PIL import Image, ImageDraw
G=256; SP=sys.argv[1]
def load(p): return Image.frombytes('RGBA',(G,G),open(p,'rb').read())
sel=[('read',[0,3,9,11],'leer'),('lean',[0,2],'recargado'),('sit',[0,2],'sentado')]
cells=[]
for who in (0,1):
    for pose,frames,lab in sel:
        for f in frames: cells.append((who,pose,f,lab))
ims={}
x0=y0=G;x1=y1=0
for tag in ('before','now'):
    for who,pose,f,lab in cells:
        im=load(f'{SP}/{tag}/{who}-{pose}-{f}.rgba'); ims[tag,who,pose,f]=im
        b=im.getbbox(); x0,y0,x1,y1=min(x0,b[0]),min(y0,b[1]),max(x1,b[2]),max(y1,b[3])
x0-=2;y0-=2;x1+=2;y1+=2
K=3; cw,ch=(x1-x0)*K,(y1-y0)*K; n=len(cells)//2; LW=70
W=LW+n*(cw+6); H=4*(ch+24)
out=Image.new('RGB',(W,H),(38,42,58)); d=ImageDraw.Draw(out)
for who in (0,1):
    for r,tag in enumerate(('before','now')):
        Y=(who*2+r)*(ch+24)
        d.text((6,Y+ch//2),'ANTES' if tag=='before' else 'AHORA',fill=(255,210,120) if tag=='now' else (200,200,210))
        for c,(w,pose,f,lab) in enumerate([c for c in cells if c[0]==who]):
            X=LW+c*(cw+6)
            if r==0: d.text((X+4,Y+4),lab,fill=(235,225,200))
            out.paste(ims[tag,who,pose,f].crop((x0,y0,x1,y1)).resize((cw,ch),Image.NEAREST),(X,Y+20),ims[tag,who,pose,f].crop((x0,y0,x1,y1)).resize((cw,ch),Image.NEAREST))
out.save(sys.argv[2]); print(out.size)
