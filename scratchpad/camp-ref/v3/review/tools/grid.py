# grid.py out.png s x0 y0 x1 y1 cols name... : our renders (raw or rawg) cropped, s x, in a grid with labels
import sys
from PIL import Image, ImageDraw
R = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/v3/review/'
G = 256; BG = (38, 42, 58)
out = sys.argv[1]; s = int(sys.argv[2]); x0, y0, x1, y1, cols = map(int, sys.argv[3:8]); names = sys.argv[8:]
def ours(n):
    sub = 'raw' if '-own-' in n or '-bare-' in n else 'rawg'
    im = Image.frombytes('RGBA', (G, G), open(f'{R}{sub}/{n}.rgba', 'rb').read())
    bg = Image.new('RGBA', (G, G), BG + (255,)); bg.alpha_composite(im)
    c = bg.convert('RGB').crop((x0, y0, x1, y1))
    return c.resize((c.width * s, c.height * s), Image.NEAREST)
W = (x1 - x0) * s; H = (y1 - y0) * s
rows = (len(names) + cols - 1) // cols
img = Image.new('RGB', (cols * (W + 6), rows * (H + 14)), (0, 0, 0))
d = ImageDraw.Draw(img)
for i, n in enumerate(names):
    X = (i % cols) * (W + 6); Y = (i // cols) * (H + 14)
    img.paste(ours(n), (X, Y + 14)); d.text((X + 2, Y + 1), n.replace('-read-', ' f'), fill=(255, 255, 0))
img.save(out)
