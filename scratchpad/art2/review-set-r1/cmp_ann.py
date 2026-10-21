import sys, numpy as np
from PIL import Image, ImageDraw
ref = Image.open(sys.argv[1]).convert('RGB')
sheet = Image.open(sys.argv[2]).convert('RGBA')
out = sys.argv[3]
W,H = 1016,968
SK=1.08
# ref in frame coordinates
inv = (1/SK, 0, 57 + 2/SK, 0, 1/SK, 922 - 780/SK)
refF = ref.transform((W,H), Image.AFFINE, inv, resample=Image.NEAREST)
def frame(r,c): return sheet.crop((c*W, r*H, (c+1)*W, (r+1)*H))
box=(180,430,960,940)
navy=(18,20,34,255); grass=(70,110,50,255)
def comp(f,bg):
    b=Image.new('RGBA',(W,H),bg); return Image.alpha_composite(b,f).convert('RGB')
f=frame(1,1)
a=np.array(f)[...,3]
# mark fully transparent in magenta on a third panel
m=np.array(comp(f,navy)); m[a==0]=(255,0,255)
panels=[refF.crop(box), comp(f,navy).crop(box), comp(f,grass).crop(box), Image.fromarray(m).crop(box)]
w,h=panels[0].size
sheetout=Image.new('RGB',(w*2+10, h*2+10),(0,0,0))
for i,p in enumerate(panels):
    sheetout.paste(p,((i%2)*(w+10),(i//2)*(h+10)))
sheetout.save(out)
# also 2x crop of the arch area
ab=(380,560,720,800)
z=[refF.crop(ab), comp(f,grass).crop(ab)]
zw,zh=z[0].size
zz=Image.new('RGB',(zw*2*2+10, zh*2),(0,0,0))
for i,p in enumerate(z): zz.paste(p.resize((zw*2,zh*2),Image.NEAREST),(i*(zw*2+10),0))
zz.save(out.replace('.png','-arch2x.png'))
ab=(640,560,960,940)
z=[refF.crop(ab), comp(f,grass).crop(ab)]
zw,zh=z[0].size
zz=Image.new('RGB',(zw*2*2+10, zh*2),(0,0,0))
for i,p in enumerate(z): zz.paste(p.resize((zw*2,zh*2),Image.NEAREST),(i*(zw*2+10),0))
zz.save(out.replace('.png','-neck2x.png'))
ab=(180,560,420,900)
z=[refF.crop(ab), comp(f,grass).crop(ab)]
zw,zh=z[0].size
zz=Image.new('RGB',(zw*2*2+10, zh*2),(0,0,0))
for i,p in enumerate(z): zz.paste(p.resize((zw*2,zh*2),Image.NEAREST),(i*(zw*2+10),0))
zz.save(out.replace('.png','-tail2x.png'))
