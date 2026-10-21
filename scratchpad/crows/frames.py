import sys
from PIL import Image
d = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/crows/dbg/'
anim, bgname, idx, out = sys.argv[1], sys.argv[2], [int(v) for v in sys.argv[3].split(',')], sys.argv[4]
k = int(sys.argv[5]) if len(sys.argv) > 5 else 3
im = Image.open(d + f'crows-{anim}-{bgname}.png')
n = 6
W = im.width // 2 // n  # includes 2px gap at x1
fw = W - 2
tiles = [im.crop((i * W * 2, 0, i * W * 2 + fw * 2, im.height)).resize((fw * k, im.height // 2 * k), Image.NEAREST) for i in idx]
o = Image.new('RGB', (sum(t.width + 6 for t in tiles), tiles[0].height), (0, 0, 0))
x = 0
for t in tiles:
    o.paste(t, (x, 0)); x += t.width + 6
o.save(d + out)
