# gridzoom.py out.png x0 y0 x1 y1 [k]: his webp around sprite box (his sheet coords: sprite (81+i,129+j)),
# webp pixels at k x nearest, with our fine-pixel grid drawn over and labelled.
import sys
from PIL import Image, ImageDraw
D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/'
P, U, V = 2.1482, 66.37, 17.10
im = Image.open(D + 'owner-camp-poses.webp').convert('RGB')
out = sys.argv[1]
x0, y0, x1, y1 = map(int, sys.argv[2:6])
k = int(sys.argv[6]) if len(sys.argv) > 6 else 16
wx0 = U + (x0 - 81) * P; wy0 = V + (y0 - 129) * P
wx1 = U + (x1 - 81) * P; wy1 = V + (y1 - 129) * P
ix0, iy0, ix1, iy1 = int(wx0), int(wy0), int(wx1) + 1, int(wy1) + 1
c = im.crop((ix0, iy0, ix1, iy1)).resize(((ix1 - ix0) * k, (iy1 - iy0) * k), Image.NEAREST)
d = ImageDraw.Draw(c)
for x in range(x0, x1 + 1):
    sx = (U + (x - 81) * P - ix0) * k
    d.line([(sx, 0), (sx, c.height)], fill=(255, 255, 0) if x % 5 == 0 else (110, 110, 0), width=1)
    if x % 5 == 0: d.text((sx + 2, 2), str(x), fill=(255, 255, 0))
for y in range(y0, y1 + 1):
    sy = (V + (y - 129) * P - iy0) * k
    d.line([(0, sy), (c.width, sy)], fill=(255, 255, 0) if y % 5 == 0 else (110, 110, 0), width=1)
    if y % 5 == 0: d.text((2, sy + 2), str(y), fill=(255, 255, 0))
c.save(out)
print(c.size)
