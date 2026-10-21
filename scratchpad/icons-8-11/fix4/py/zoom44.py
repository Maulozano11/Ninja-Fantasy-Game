"""zoom44.py <out.png> <dir1> [dir2 ...]: Swap and Warp 44 at x8 and 88 at x4 from each dir, side by side (rows = dirs),
plus his reference figure box-reduced to 24 px tall at x8."""
import sys
from PIL import Image, ImageDraw
OUT = sys.argv[1]
DIRS = sys.argv[2:]
ref = Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-ref/owner-phase-ref.jpg').convert('RGB')
fig = ref.crop((55, 5, 205, 235))
r24 = fig.resize((round(fig.width * 24 / fig.height), 24), Image.BOX).resize((round(fig.width * 24 / fig.height) * 8, 192), Image.NEAREST)
T = 352
G = 10
W = 4 * (T + G) + r24.width + G
img = Image.new('RGB', (W, len(DIRS) * (T + 20 + G) + G), (21, 23, 29))
d = ImageDraw.Draw(img)
for r, dd in enumerate(DIRS):
    y = G + r * (T + 20 + G)
    d.text((G, y), dd.rstrip('/').split('/')[-1], fill=(233, 223, 196))
    x = G
    for jid in ('ryusei_swap', 'ryusei_warp'):
        for suf in ('', '@2x'):
            im = Image.open(f'{dd}/{jid}{suf}.png').convert('RGB')
            img.paste(im.resize((T, T), Image.NEAREST), (x, y + 14))
            x += T + G
    if r == 0:
        img.paste(r24, (x, y + 14))
img.save(OUT)
print('wrote', OUT)
