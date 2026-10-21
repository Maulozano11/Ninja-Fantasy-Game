import sys
from PIL import Image
A2,R,name,x0,y0,x1,y1,k=sys.argv[1],sys.argv[2],sys.argv[3],*map(int,sys.argv[4:9])
frames=[int(v) for v in sys.argv[9].split(',')]
cols=int(sys.argv[10]) if len(sys.argv)>10 else len(frames)
sh=Image.open(A2+'/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')
W,H=130,94
w,h=(x1-x0)*k,(y1-y0)*k
rows=(len(frames)+cols-1)//cols
out=Image.new('RGBA',(cols*(w+6),rows*(h+6)),(90,90,90,255))
for i,f in enumerate(frames):
    fr=sh.crop((f*W,0,(f+1)*W,H)); b=Image.new('RGBA',(W,H),(32,31,39,255)); b.alpha_composite(fr)
    out.paste(b.crop((x0,y0,x1,y1)).resize((w,h),Image.NEAREST),((i%cols)*(w+6),(i//cols)*(h+6)))
out.save(R+'/'+name)
