import sys, numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/review2/scripts')
from ok import *
from PIL import Image, ImageDraw
R2 = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/review2'
# name, jid, N, box (x0,y0,x1,y1 exclusive), zoom
CR = [
    ('d-submission-chains-88', 'northstar_submission', 88, (0, 18, 30, 56), 12),
    ('d-submission-star-44', 'northstar_submission', 44, (14, 0, 30, 14), 24),
    ('d-clone-streak-44', 'shadow_clone', 44, (14, 18, 32, 30), 24),
    ('d-water-foam-88', 'water_dragon_suiryuudan', 88, (40, 58, 60, 76), 16),
    ('d-bomb-edge-44', 'dragon_fire_bomb', 44, (34, 12, 44, 24), 24),
    ('d-adamantine-sparkles-44', 'adamantine_sealing_chains', 44, (8, 0, 44, 36), 10),
    ('d-command-iris-44', 'northstar_command', 44, (12, 13, 31, 29), 20),
    ('d-palms-hood-88', 'taki_sixtyfour_palms', 88, (34, 20, 52, 34), 16),
]
for name, jid, N, (x0, y0, x1, y1), z in CR:
    h = Image.fromarray(his(jid, N)).crop((x0, y0, x1, y1))
    o = Image.open(f'{ICONS}/{jid}{"@2x" if N == 88 else ""}.png').convert('RGB').crop((x0, y0, x1, y1))
    w, hh = (x1 - x0) * z, (y1 - y0) * z
    out = Image.new('RGB', (2 * w + 12, hh + 18), (30, 30, 34))
    out.paste(h.resize((w, hh), Image.NEAREST), (0, 18)); out.paste(o.resize((w, hh), Image.NEAREST), (w + 12, 18))
    d = ImageDraw.Draw(out)
    d.text((2, 2), f'his {N} (box)  x{x0}-{x1-1} y{y0}-{y1-1}', fill=(230, 230, 230)); d.text((w + 14, 2), f'ours {N}', fill=(230, 230, 230))
    out.save(f'{R2}/{name}.png')
# phase check: reference | Swap 88 | Swap 44 (x2) | Warp 88 | Warp 44 (x2), all 264 tall
ref = Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-ref/owner-phase-ref.jpg').convert('RGB').resize((264, 264))
tiles = [ref]
for jid in ('ryusei_swap', 'ryusei_warp'):
    tiles.append(Image.open(f'{ICONS}/{jid}@2x.png').convert('RGB').resize((264, 264), Image.NEAREST))
    tiles.append(Image.open(f'{ICONS}/{jid}.png').convert('RGB').resize((264, 264), Image.NEAREST))
out = Image.new('RGB', (5 * 274, 290), (30, 30, 34))
d = ImageDraw.Draw(out)
for i, (t, lab_) in enumerate(zip(tiles, ['his phase reference', 'Swap 88 (x3)', 'Swap 44 (x6)', 'Warp 88 (x3)', 'Warp 44 (x6)'])):
    out.paste(t, (i * 274, 22)); d.text((i * 274 + 2, 4), lab_, fill=(230, 230, 230))
out.save(f'{R2}/phase-check.png')
print('ok')
