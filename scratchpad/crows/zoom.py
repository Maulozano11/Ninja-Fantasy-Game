import sys, json
from PIL import Image
d = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/crows/dbg/'
which, bx0, by0, bx1, by1, out = sys.argv[1], *[int(v) for v in sys.argv[2:6]], sys.argv[6]
im = Image.open(d + f'cmp-{which}.png')
k = 4
W = (im.width // k - 4) // 2
info = json.load(open(d + 'crows-ref.json'))
S = info['scale']; ax, ay = info['anchors'][which]; fx, fy = info['anchor']
g = lambda x, y: (fx + (x - ax) * S, fy + (y - ay) * S)
x0, y0 = g(bx0, by0); x1, y1 = g(bx1, by1)
a = im.crop((int(x0 * k), int(y0 * k), int(x1 * k), int(y1 * k)))
b = im.crop((int((x0 + W + 4) * k), int(y0 * k), int((x1 + W + 4) * k), int(y1 * k)))
o = Image.new('RGB', (a.width * 2 + 8, a.height))
o.paste(a, (0, 0)); o.paste(b, (a.width + 8, 0))
z = int(sys.argv[7]) if len(sys.argv) > 7 else 2
o.resize((o.width * z, o.height * z), Image.NEAREST).save(d + out)
