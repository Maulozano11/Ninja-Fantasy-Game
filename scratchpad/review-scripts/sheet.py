exec(open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/review-scripts/crow_cmp.py').read().split('K=3')[0])
from PIL import ImageDraw
L=(384.4269540694337,905.3472996907377); R=(665.1502695565949,902.600258826489)
K=3
def up(im,k=K): return im.resize((im.width*k,im.height*k),Image.NEAREST)
tiles=[('his left (game scale)',his(L)),('ours fly0',on(BG,frame(0,0))),('his right (game scale)',his(R)),('ours fly4',on(BG,frame(0,4)))]
W=4*FW*K+30; H1=FH*K+18
k2=2
fly=[on(GR,frame(0,i)) for i in range(6)]
summ=[on(GR,frame(1,i)) for i in range(6)]
H2=FH*k2+18
out=Image.new('RGB',(max(W,6*FW*k2+50),H1+2*H2+10),(10,10,14))
d=ImageDraw.Draw(out)
x=0
for t,im in tiles:
    d.text((x+2,2),t,fill=(230,230,230)); out.paste(up(im),(x,16)); x+=FW*K+10
# annotate key-frame issues (frame coords -> sheet)
def box(ix,fx0,fy0,fx1,fy1,label,col=(255,220,0)):
    X=ix*(FW*K+10); d.rectangle((X+fx0*K,16+fy0*K,X+fx1*K,16+fy1*K),outline=col,width=2); d.text((X+fx0*K,16+fy1*K+2),label,fill=col)
box(1,148,108,166,124,'talons grey (his magenta)')
box(1,170,96,186,112,'outline hook')
box(1,56,94,80,112,'beak dim (his pale grey)')
box(3,70,85,100,100,'lilac sheen lost')
y=H1+4
for row,(name,fr) in enumerate([('fly 0-5',fly),('summon 0-5',summ)]):
    x=0
    for i,im in enumerate(fr):
        d.text((x+2,y+2),f'{name.split()[0]} {i}',fill=(230,230,230)); out.paste(up(im,k2),(x,y+16)); x+=FW*k2+10
    y+=H2+6
out.save(O+'review-sheet.png')
