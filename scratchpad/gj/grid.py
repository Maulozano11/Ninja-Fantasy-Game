import sys
from PIL import Image, ImageDraw, ImageFont
im = Image.open('../art2/REF-genjutsu-set-owner.jpg').convert('RGB')
F = ImageFont.load_default()
def grid(name, x0,y0,x1,y1,k, step=10):
    c = im.crop((x0,y0,x1,y1)).resize(((x1-x0)*k,(y1-y0)*k), Image.NEAREST)
    pad=28
    out = Image.new('RGB',(c.width+pad, c.height+pad),(0,0,0)); out.paste(c,(pad,pad))
    d = ImageDraw.Draw(out)
    for x in range((x0//step+1)*step, x1, step):
        X = pad+(x-x0)*k
        d.line([(X,pad),(X,out.height)], fill=(0,255,0) if x%50==0 else (0,90,0))
        if x%20==0: d.text((X+1,2), str(x), fill=(200,255,200), font=F)
    for y in range((y0//step+1)*step, y1, step):
        Y = pad+(y-y0)*k
        d.line([(pad,Y),(out.width,Y)], fill=(0,255,0) if y%50==0 else (0,90,0))
        if y%20==0: d.text((0,Y+1), str(y), fill=(200,255,200), font=F)
    out.save('grid-%s.png'%name)
args = sys.argv[1:]
grid(args[0], *map(int,args[1:6]))
