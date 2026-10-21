import sys
from PIL import Image, ImageDraw
S=sys.argv[1]; R=sys.argv[2]
ref=Image.open(S+'/art2/REF-poison-set-owner.jpg').convert('RGB')
sh=Image.open(S+'/art2/staging/vfx_beasts_cobra/poison.png').convert('RGBA')
FW,FH=172,107; AX,AY=96,58
bg=ref.getpixel((300,690)); print('bg',bg)
frames=[sh.crop((i*FW,0,(i+1)*FW,FH)) for i in range(8)]
for i,f in enumerate(frames): f.save(R+'/f%d.png'%i)
def onbg(f,col):
    b=Image.new('RGBA',f.size,col+(255,)); b.alpha_composite(f); return b.convert('RGB')
keys={0:(304,745),5:(477,745)}
Z=3
out=Image.new('RGB',(FW*Z*3+40,FH*Z*2+30),(10,10,10))
d=ImageDraw.Draw(out)
for r,(k,(sx,sy)) in enumerate(keys.items()):
    his=ref.crop((sx-AX,sy-AY,sx-AX+FW,sy-AY+FH))
    his.save(R+'/his-k%d-1x.png'%k)
    ours=onbg(frames[k],bg)
    ours.save(R+'/ours-k%d-1x.png'%k)
    # diff
    import PIL.ImageChops as C
    diff=C.difference(his,ours)
    for c,im in enumerate([his,ours,diff]):
        out.paste(im.resize((FW*Z,FH*Z),Image.NEAREST),(c*(FW*Z+20),r*(FH*Z+30)))
out.save(R+'/keys-his-ours-diff-x3.png')
