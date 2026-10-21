import sys, os
import numpy as np
from PIL import Image, ImageDraw
S, A, O = sys.argv[1:4]
ids = ['lightning_hound_raidon', 'crescent_moon_dance', 'temple_of_nirvana']
slot = Image.open(os.path.join(A, 'skill_slot_steel.png')).convert('RGBA')
rows = []
for jid in ids:
    sheet_sq = Image.open(os.path.join(S, 'ref', jid + '@sheet.png')).convert('RGB')
    l44 = sheet_sq.resize((44, 44), Image.LANCZOS); l88 = sheet_sq.resize((88, 88), Image.LANCZOS)
    o44 = Image.open(os.path.join(A, jid + '.png')).convert('RGB'); o88 = Image.open(os.path.join(A, jid + '@2x.png')).convert('RGB')
    def inslot(ic, k):
        s = slot.copy(); s.paste(ic, (6, 6)); return s.resize((56*k, 56*k), Image.NEAREST)
    def inslot2(ic):
        s = slot.resize((112, 112), Image.NEAREST); s.paste(ic, (12, 12)); return s
    panels = [l44.resize((176, 176), Image.NEAREST), o44.resize((176, 176), Image.NEAREST), l88.resize((176, 176), Image.NEAREST), o88.resize((176, 176), Image.NEAREST),
              inslot(l44, 1), inslot(o44, 1), inslot2(l88), inslot2(o88)]
    rows.append(panels)
W = 10 + sum(p.size[0] + 10 for p in rows[0]); H = 10 + len(rows) * 186
im = Image.new('RGB', (W, H + 20), (24, 24, 30)); d = ImageDraw.Draw(im)
labels = ['his 44 (lanczos) x4', 'ours 44 x4', 'his 88 x2', 'ours 88 x2', 'his slot 1x', 'ours slot 1x', 'his slot 2x', 'ours slot 2x']
x = 10
for p, l in zip(rows[0], labels):
    d.text((x, 2), l, fill=(255, 255, 0)); x += p.size[0] + 10
for r, panels in enumerate(rows):
    x = 10
    for p in panels:
        im.paste(p, (x, 20 + r * 186)); x += p.size[0] + 10
im.save(os.path.join(O, 'small-compare.png'))
