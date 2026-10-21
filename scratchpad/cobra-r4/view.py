import sys
from PIL import Image
sheet=Image.open(sys.argv[1]).convert('RGBA')
fw=int(sys.argv[2]); n=sheet.width//fw; fh=sheet.height
box=tuple(int(v) for v in sys.argv[3].split(','))  # x0,y0,x1,y1 in frame coords
z=int(sys.argv[4]); out=sys.argv[5]
order=[int(v) for v in sys.argv[6].split(',')] if len(sys.argv)>6 else list(range(n))
bg=tuple(int(v) for v in (sys.argv[7] if len(sys.argv)>7 else '28,30,40').split(','))
w=(box[2]-box[0])*z; h=(box[3]-box[1])*z
cv=Image.new('RGBA',((w+6)*len(order),h),(12,12,16,255))
for k,i in enumerate(order):
    f=sheet.crop((i*fw+box[0],box[1],i*fw+box[2],box[3]))
    b=Image.new('RGBA',f.size,bg+(255,)); b.alpha_composite(f)
    cv.paste(b.resize((w,h),Image.NEAREST),(k*(w+6),0))
cv.save(out)
