# view.py <workdir> <id> [region x0 y0 x1 y1 in 44 coords]: his box44 | ours44 | his88 | ours88, each zoomed, plus 1x/2x on bar
import sys, os
from PIL import Image, ImageDraw
W, jid = sys.argv[1], sys.argv[2]
his = Image.open(f'{W}/stage/ref/{jid}.png').convert('RGB'); w,h = his.size
t = his.crop((1,1,w-1,h-1))
hb44 = t.resize((44,44), Image.BOX); hb88 = t.resize((88,88), Image.BOX)
o44 = Image.open(f'{W}/stage/{jid}.png').convert('RGB'); o88 = Image.open(f'{W}/stage/{jid}@2x.png').convert('RGB')
Z = 8
def grid(im, z, step):
    im = im.resize((im.width*z, im.height*z), Image.NEAREST); d = ImageDraw.Draw(im)
    for g in range(0, im.width//z+1, step):
        d.line([(g*z,0),(g*z,im.height)], fill=(255,0,0) if g%10==0 else (90,90,90))
        d.line([(0,g*z),(im.width,g*z)], fill=(255,0,0) if g%10==0 else (90,90,90))
    return im
tiles = [grid(hb44,Z,5), grid(o44,Z,5), hb88.resize((352,352),Image.NEAREST), o88.resize((352,352),Image.NEAREST)]
out = Image.new('RGB', (sum(t.width for t in tiles)+10*5+200, 352+20), (20,22,28))
x=10
for tt in tiles: out.paste(tt,(x,10)); x+=tt.width+10
out.paste(hb44,(x,10)); out.paste(o44,(x+50,10)); out.paste(hb88,(x,70)); out.paste(o88,(x+95,70))
out.paste(o44.resize((88,88),Image.NEAREST),(x,170))
out.save(f'{W}/v-{jid}.png')
