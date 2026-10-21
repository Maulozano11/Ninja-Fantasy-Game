import sys, numpy as np
from PIL import Image, ImageDraw
SP=sys.argv[1]; ours_path=sys.argv[2]; out=sys.argv[3]
X0,Y0,X1,Y1=[int(v) for v in sys.argv[4:8]] if len(sys.argv)>7 else (34,22,70,46)
dx,dy=10,24
a=np.frombuffer(open(ours_path,'rb').read(),np.uint8).reshape(128,128,4)
im=Image.fromarray(a.copy(),'RGBA'); bg=Image.new('RGBA',im.size,(255,255,255,255)); bg.alpha_composite(im)
ours=bg.convert('RGB').crop((X0+dx,Y0+dy,X1+dx,Y1+dy))
his=Image.fromarray(np.load(SP+'/plate/native.npy').astype(np.uint8)).crop((X0,Y0,X1,Y1))
k=16; W,H=(X1-X0)*k,(Y1-Y0)*k
o=Image.new('RGB',(W*2+24,H+18),(255,255,255))
o.paste(his.resize((W,H),Image.NEAREST),(0,18)); o.paste(ours.resize((W,H),Image.NEAREST),(W+24,18))
d=ImageDraw.Draw(o); d.text((4,3),'referencia',fill=(0,0,0)); d.text((W+28,3),'juego',fill=(0,0,0))
for side in (0,W+24):
    for i in range(X1-X0+1): d.line([(side+i*k,18),(side+i*k,H+18)],fill=(150,150,150))
    for j in range(Y1-Y0+1): d.line([(side,18+j*k),(side+W,18+j*k)],fill=(150,150,150))
o.save(out)
