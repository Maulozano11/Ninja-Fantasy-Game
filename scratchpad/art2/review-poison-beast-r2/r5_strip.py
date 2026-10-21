import sys
from PIL import Image, ImageDraw
S,R,name,x0,y0,x1,y1,k=sys.argv[1],sys.argv[2],sys.argv[3],*map(int,sys.argv[4:9])
frames=[int(v) for v in sys.argv[9].split(',')] if len(sys.argv)>9 else list(range(8))
sh=Image.open(S+'/art2/staging/vfx_beasts_cobra/poison.png').convert('RGBA')
W,H=176,105
w,h=(x1-x0)*k,(y1-y0)*k
out=Image.new('RGB',(len(frames)*(w+6),h+14),(255,255,255))
d=ImageDraw.Draw(out)
for j,i in enumerate(frames):
    f=sh.crop((i*W+x0,y0,i*W+x1,y1)); b=Image.new('RGBA',f.size,(31,33,46,255)); b.alpha_composite(f)
    out.paste(b.convert('RGB').resize((w,h),Image.NEAREST),(j*(w+6),14))
    d.text((j*(w+6)+2,1),'f%d'%i,fill=(0,0,0))
out.save(R+'/'+name)
print(out.size)
