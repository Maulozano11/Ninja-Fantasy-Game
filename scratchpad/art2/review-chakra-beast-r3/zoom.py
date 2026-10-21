import sys
from PIL import Image
A2,R,name,x0,y0,x1,y1,k=sys.argv[1],sys.argv[2],sys.argv[3],*map(int,sys.argv[4:9])
frames=[int(v) for v in sys.argv[9].split(',')] if len(sys.argv)>9 else [0]
his=Image.open(R+'/his-game-aligned.png').convert('RGBA')
sh=Image.open(A2+'/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')
W,H=130,94
tiles=[his.crop((x0,y0,x1,y1))]
for f in frames:
    fr=sh.crop((f*W,0,(f+1)*W,H)); b=Image.new('RGBA',(W,H),(32,31,39,255)); b.alpha_composite(fr)
    tiles.append(b.crop((x0,y0,x1,y1)))
w,h=(x1-x0)*k,(y1-y0)*k
out=Image.new('RGBA',(len(tiles)*(w+6),h),(90,90,90,255))
for i,t in enumerate(tiles): out.paste(t.resize((w,h),Image.NEAREST),(i*(w+6),0))
out.save(R+'/'+name)
