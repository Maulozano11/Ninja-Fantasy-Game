import sys
from PIL import Image, ImageDraw
S=sys.argv[1]; box=tuple(map(int,sys.argv[2].split(','))); frames=list(map(int,sys.argv[3].split(','))); k=int(sys.argv[4]); out=sys.argv[5]
bgc=tuple(map(int,sys.argv[6].split(','))) if len(sys.argv)>6 else (32,31,39)
sh=Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')
W,H=127,93
w,h=box[2]-box[0],box[3]-box[1]
cols=min(4,len(frames)); rows=(len(frames)+cols-1)//cols
o=Image.new('RGB',(cols*(w*k+6),rows*(h*k+16)),(0,0,0))
for i,f in enumerate(frames):
    b=Image.new('RGBA',(W,H),bgc+(255,)); b.alpha_composite(sh.crop((f*W,0,(f+1)*W,H)))
    c=b.convert('RGB').crop(box).resize((w*k,h*k),Image.NEAREST)
    x=(i%cols)*(w*k+6); y=(i//cols)*(h*k+16)
    o.paste(c,(x,y+14)); ImageDraw.Draw(o).text((x+2,y+1),'f%d %s'%(f,box),fill=(255,255,255))
o.save(out)
