import sys
from PIL import Image, ImageDraw
S,R,name=sys.argv[1],sys.argv[2],sys.argv[3]
x0,y0,x1,y1=map(int,sys.argv[4].split(','))
k=int(sys.argv[5]); cols=int(sys.argv[6]) if len(sys.argv)>6 else 4
sp=Image.open(S+'/art2/staging/vfx_beasts_cobra/poison.png').convert('RGBA')
W,H=172,107; bg=(31,33,46)
w,h=(x1-x0)*k,(y1-y0)*k
rows=(8+cols-1)//cols
out=Image.new('RGB',(cols*(w+6),rows*(h+6)),(255,255,255))
for i in range(8):
  b=Image.new('RGBA',(W,H),bg+(255,)); b.alpha_composite(sp.crop((i*W,0,(i+1)*W,H)))
  im=b.convert('RGB').crop((x0,y0,x1,y1)).resize((w,h),Image.NEAREST)
  ImageDraw.Draw(im).text((3,3),'f%d'%i,fill=(255,255,0))
  out.paste(im,((i%cols)*(w+6),(i//cols)*(h+6)))
out.save(R+'/strip-%s.png'%name)
