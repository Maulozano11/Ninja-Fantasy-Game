"""varedit.py <out.png> <name>...: for each variant, its swap and warp edited windows (x3) and 44 (x4), with the reference at the end of the first row."""
import sys
from PIL import Image
V = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/phase/var/'
REF = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-ref/owner-phase-ref.jpg'
names = sys.argv[2:]
H = 300
rows = []
for n in names:
    parts = []
    for i, (w, h) in (('ryusei_swap', (139, 127)), ('ryusei_warp', (98, 96))):
        e = Image.open(V + n + '-' + i + '-edited-x4.png').convert('RGB')
        parts.append(e.resize((round(w * H / h), H), Image.NEAREST))
        parts.append(Image.open(V + n + '-' + i + '.png').convert('RGB').resize((H, H), Image.NEAREST))
    rows.append(parts)
ref = Image.open(REF).convert('RGB').resize((H, H))
W = max(sum(p.width + 10 for p in r) for r in rows) + H + 10
can = Image.new('RGB', (W, len(rows) * (H + 10)), (20, 20, 20))
for r, parts in enumerate(rows):
    x = 0
    for p in parts:
        can.paste(p, (x, r * (H + 10)))
        x += p.width + 10
can.paste(ref, (W - H, 0))
can.save(sys.argv[1])
