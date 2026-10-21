"""varcmp.py <out.png> <name>...: for each variant, its swap and warp at 44 (x6) and 88 (x3) in a row."""
import sys
from PIL import Image
V = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/phase/var/'
names = sys.argv[2:]
rows = []
for n in names:
    parts = []
    for i in ('ryusei_swap', 'ryusei_warp'):
        parts.append(Image.open(V + n + '-' + i + '.png').convert('RGB').resize((264, 264), Image.NEAREST))
        parts.append(Image.open(V + n + '-' + i + '@2x.png').convert('RGB').resize((264, 264), Image.NEAREST))
    rows.append(parts)
can = Image.new('RGB', (4 * 274, len(rows) * 274), (20, 20, 20))
for r, parts in enumerate(rows):
    for c, p in enumerate(parts):
        can.paste(p, (c * 274, r * 274))
can.save(sys.argv[1])
