# auracmp.py <out> [frames]: his aura panel | back+char+front on his bg | on grass | back alone, at 4x
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
CH = Image.open(ART2 + '/vfx-genjutsu-v3-character.png').convert('RGBA')
fb, ff = frames('aura_back')['idle'], frames('aura')['idle']
ax, ay = MAN['aura']['anchor']
idx = [int(v) for v in sys.argv[2].split(',')] if len(sys.argv) > 2 else [0]
K = 4
tiles = [up(his('aura'), K)]
for i in idx:
    for bg in (HISBG, GRASS):
        b = on(fb[i], bg).convert('RGBA')
        b.alpha_composite(CH, (ax - 64, ay - 120)) if True else None
        b = Image.alpha_composite(b, ff[i]).convert('RGB')
        tiles.append(up(b, K))
tiles.append(up(on(fb[idx[0]], GRASS), K))
row(tiles).save(sys.argv[1])
