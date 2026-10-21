import sys
from PIL import Image, ImageDraw
exec(open('cmp.py').read().split('stats={}')[0])
name,anim=sys.argv[1],sys.argv[2]; fis=[int(x) for x in sys.argv[3].split(',')]; k=int(sys.argv[4])
col=tuple(map(int,sys.argv[5].split(','))) if len(sys.argv)>5 else BG
crop=tuple(map(int,sys.argv[6].split(','))) if len(sys.argv)>6 else None
m=M[name]; W,H=m['frameW'],m['frameH']
ims=[]
for i in fis:
    fr=frame(name,anim,i)
    if crop: fr=fr.crop(crop)
    ims.append(up(on(fr,col),k))
out=Image.new('RGB',(sum(i.width+6 for i in ims),ims[0].height+14),(255,0,255)); d=ImageDraw.Draw(out); x=0
for i,im in zip(fis,ims): out.paste(im,(x,14)); d.text((x+2,1),'%s %d'%(anim,i),fill=(0,0,0)); x+=im.width+6
out.save(OUT+'/frames-%s-%s-%s.png'%(name,anim,'_'.join(map(str,fis)))); print(out.size)
