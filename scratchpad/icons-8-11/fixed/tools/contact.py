"""contact.py <iconsDir> <frame.png> <outDir>: contact-8..11.png (per icon: his window | his reduced to 88 |
our 88 | his reduced to 44 | our 44, each shown 264 px, nearest) and slots.png (the 14 in the steel slot at
1x and at 2x)."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import numpy as np
from PIL import Image, ImageDraw
import m

ICONS, FRAME, OUT = sys.argv[1:4]
SHEETS = {'8': ['ryusei_swap', 'northstar_command', 'northstar_submission'],
          '9': ['mirai_evasion', 'koton_block', 'koton_wall', 'ryusei_warp'],
          '10': ['dragon_fire_bomb', 'wood_dragon_jutsu', 'adamantine_sealing_chains', 'taki_sixtyfour_palms'],
          '11': ['shadow_clone', 'dragon_fire_stream', 'water_dragon_suiryuudan']}
Z, G, HEAD = 264, 10, 18
BG = (21, 23, 29)
LABELS = ['his window (his pixels)', 'his, box-reduced to 88', 'ours 88 (@2x file)', 'his, box-reduced to 44', 'ours 44']
for s, ids in SHEETS.items():
    W = 5 * Z + 4 * G + 2 * G
    H = HEAD + len(ids) * (Z + HEAD + G) + G
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((G, 3), 'Sheet %s: his window | his reduced to 88 | our 88 | his reduced to 44 | our 44 (all shown %d px, nearest)' % (s, Z), fill=(233, 223, 196))
    y = HEAD
    for jid in ids:
        win = m.his_win(jid)
        tiles = [win.resize((Z, Z), Image.NEAREST)]
        for t in (m.his(jid, 88), m.ours(jid, 88, ICONS), m.his(jid, 44), m.ours(jid, 44, ICONS)):
            tiles.append(Image.fromarray(t.astype(np.uint8)).resize((Z, Z), Image.NEAREST))
        d.text((G, y + 3), '%s  (his window %dx%d)' % (jid, win.width, win.height), fill=(233, 223, 196))
        for i, t in enumerate(tiles):
            x = G + i * (Z + G)
            img.paste(t, (x, y + HEAD))
            d.text((x + 4, y + HEAD + Z - 14), LABELS[i], fill=(255, 255, 255))
        y += Z + HEAD + G
    img.save('%s/contact-%s.png' % (OUT, s))

# The 14 in the steel slot: 1x (44 in the 56 frame) on one row, then 2x (the 88 file in the frame doubled), 7 a row.
frame = Image.open(FRAME).convert('RGBA')
fw = frame.width
ids = [j for s in SHEETS for j in SHEETS[s]]
W = G + len(ids) * (fw + G)
H = HEAD + fw + G + HEAD + 2 * (2 * fw + HEAD + G) + G
img = Image.new('RGBA', (W, H), BG + (255,))
d = ImageDraw.Draw(img)
d.text((G, 3), 'The 14 icons in skill_slot_steel at 1x (the 44 file)', fill=(233, 223, 196))
for i, jid in enumerate(ids):
    slot = Image.new('RGBA', (fw, fw), (16, 18, 24, 255))
    slot.paste(Image.open('%s/%s.png' % (ICONS, jid)).convert('RGBA'), (6, 6))
    slot.alpha_composite(frame)
    img.alpha_composite(slot, (G + i * (fw + G), HEAD))
y = HEAD + fw + G
d.text((G, y + 3), 'At 2x: the @2x file (88) in the frame doubled', fill=(233, 223, 196))
y += HEAD
f2 = frame.resize((fw * 2, fw * 2), Image.NEAREST)
for r in range(2):
    for i, jid in enumerate(ids[r * 7:(r + 1) * 7]):
        slot = Image.new('RGBA', f2.size, (16, 18, 24, 255))
        slot.paste(Image.open('%s/%s@2x.png' % (ICONS, jid)).convert('RGBA'), (12, 12))
        slot.alpha_composite(f2)
        x = G + i * (2 * fw + 2 * G)
        img.alpha_composite(slot, (x, y))
        d.text((x, y + 2 * fw + 2), jid, fill=(154, 163, 176))
    y += 2 * fw + HEAD + G
img.convert('RGB').save('%s/slots.png' % OUT)
print('written to', OUT)
