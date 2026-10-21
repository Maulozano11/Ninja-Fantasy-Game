# usage: zc.py out.png piece.png hx0 hy0 hx1 hy1 px0 py0 px1 py1 zoom
# his box (his px, scaled to our screen size) beside our piece's box (screen px), both zoomed
import sys
from PIL import Image
out, piece = sys.argv[1], sys.argv[2]
hx0, hy0, hx1, hy1, px0, py0, px1, py1 = map(float, sys.argv[3:11]); z = float(sys.argv[11])
S = 1600 / 1024
im = Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg').convert('RGB')
a = im.crop((round(hx0), round(hy0), round(hx1), round(hy1)))
a = a.resize((round(a.width * S * z), round(a.height * S * z)), Image.LANCZOS)
b = Image.open(piece).convert('RGBA').crop((int(px0), int(py0), int(px1), int(py1)))
b = b.resize((round(b.width * z), round(b.height * z)), Image.NEAREST)
bg = Image.new('RGBA', b.size, (70, 90, 70, 255)); bg.alpha_composite(b)
if a.width > 1.5 * a.height:
    o = Image.new('RGB', (max(a.width, b.width), a.height + b.height + 10)); o.paste(a, (0, 0)); o.paste(bg.convert('RGB'), (0, a.height + 10))
else:
    o = Image.new('RGB', (a.width + b.width + 10, max(a.height, b.height))); o.paste(a, (0, 0)); o.paste(bg.convert('RGB'), (a.width + 10, 0))
o.save(out)
