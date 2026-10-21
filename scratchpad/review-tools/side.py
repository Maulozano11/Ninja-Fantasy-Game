import sys
from PIL import Image
ref_p, sheet_p, out_p, frames = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
W, H = 1016, 968
SK = 1.08
ref = Image.open(ref_p).convert('RGBA')
# ref placed in frame coords: frame = -2 + (x-57)*SK, 780 + (y-922)*SK
rw, rh = round(ref.width*SK), round(ref.height*SK)
refs = ref.resize((rw, rh), Image.LANCZOS)
ox, oy = round(-2 - 57*SK), round(780 - 922*SK)
refF = Image.new('RGBA', (W, H), (30, 32, 48, 255))
refF.paste(refs, (ox, oy))
sheet = Image.open(sheet_p).convert('RGBA')
rows = {'surge': 0, 'burn': 1, 'fade': 2}
X0, X1, Y0, Y1 = int(sys.argv[5]), int(sys.argv[6]), int(sys.argv[7]), int(sys.argv[8])
Z = int(sys.argv[9]) if len(sys.argv) > 9 else 2
items = [('his', refF)]
for fr in frames.split(','):
    nm = ''.join(c for c in fr if c.isalpha()); i = int(''.join(c for c in fr if c.isdigit()))
    f = sheet.crop((i*W, rows[nm]*H, (i+1)*W, (rows[nm]+1)*H))
    bg = Image.new('RGBA', (W, H), (255, 0, 255, 255))  # magenta = transparent
    bg.alpha_composite(f)
    items.append((fr, bg))
cw, ch = (X1-X0)*Z, (Y1-Y0)*Z
out = Image.new('RGBA', (cw, len(items)*(ch+8)), (0, 0, 0, 255))
for k, (n, im) in enumerate(items):
    out.paste(im.crop((X0, Y0, X1, Y1)).resize((cw, ch), Image.NEAREST), (0, k*(ch+8)))
out.save(out_p)
print(out.size, [n for n, _ in items])
