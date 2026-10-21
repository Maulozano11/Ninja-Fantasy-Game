import sys, glob, json
from PIL import Image, ImageDraw
R2, ICONS = sys.argv[1], sys.argv[2]
ids = sys.argv[3:]
def grid(im, k, step):
    im = im.resize((im.width*k, im.height*k), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for i in range(0, im.width//k, step):
        d.line([(i*k,0),(i*k,im.height)], fill=(255,255,0) if i%10==0 else (90,90,90))
        d.line([(0,i*k),(im.width,i*k)], fill=(255,255,0) if i%10==0 else (90,90,90))
    return im
for jid in ids:
    s = [p for p in glob.glob(f'{R2}/stage/s*/ref/{jid}.png')][0]
    his = Image.open(s).convert('RGB')
    h88 = his.resize((88,88), Image.BOX); h44 = his.resize((44,44), Image.BOX)
    o88 = Image.open(f'{ICONS}/{jid}@2x.png').convert('RGB'); o44 = Image.open(f'{ICONS}/{jid}.png').convert('RGB')
    a = grid(h88, 8, 10); b = grid(o88, 8, 10)
    out = Image.new('RGB', (a.width*2+16, a.height), (40,40,40)); out.paste(a,(0,0)); out.paste(b,(a.width+16,0)); out.save(f'{R2}/zoom/{jid}-88.png')
    a = grid(h44, 16, 5); b = grid(o44, 16, 5)
    out = Image.new('RGB', (a.width*2+16, a.height), (40,40,40)); out.paste(a,(0,0)); out.paste(b,(a.width+16,0)); out.save(f'{R2}/zoom/{jid}-44.png')
