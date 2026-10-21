"""phasecontact.py <iconsDir> <out.png>: the phase ninjas contact sheet. Per icon (Swap, Warp Strike): his original
window | the phase edit at window size | our 88 | our 44 at 2x, every tile shown at the same height (nearest);
his phase reference picture beside them."""
import sys
from PIL import Image, ImageDraw

P = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fix4'
REF = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-ref/owner-phase-ref.jpg'
ICONS, OUT = sys.argv[1:3]
ROWS = [('ryusei_swap', '8', 'Swap (INTERCAMBIO)'), ('ryusei_warp', '9', 'Warp Strike (GOLPE WARP)')]
H = 352  # every tile this tall
G, HEAD = 14, 20
BG, INK, SUB = (21, 23, 29), (233, 223, 196), (154, 163, 176)


def up(img, h):
    k = h / img.height
    return img.resize((round(img.width * k), h), Image.NEAREST)


rows = []
for jid, sheet, name in ROWS:
    his = Image.open(f'{P}/stage/ui_icons_{sheet}/ref/{jid}.png').convert('RGB')
    edx4 = Image.open(f'{P}/debug/{jid}-edited-x4.png').convert('RGB')
    ed = edx4.resize((edx4.width // 4, edx4.height // 4), Image.NEAREST)
    o88 = Image.open(f'{ICONS}/{jid}@2x.png').convert('RGB')
    o44 = Image.open(f'{ICONS}/{jid}.png').convert('RGB')
    o44x2 = o44.resize((88, 88), Image.NEAREST)
    tiles = [
        (up(his, H), f'his window ({his.width}x{his.height}, his pixels)'),
        (up(ed, H), f'phase edit on his window ({ed.width}x{ed.height})'),
        (up(o88, H), 'ours 88 (@2x file)'),
        (up(o44x2, H), 'ours 44, shown at 2x'),
    ]
    # And as the game shows them: 88 and 44 at 1x, and the 44 at 2x.
    small = Image.new('RGB', (88 + 10 + 44 + 10 + 88, 88), BG)
    small.paste(o88, (0, 0))
    small.paste(o44, (98, 0))
    small.paste(o44x2, (152, 0))
    rows.append((name, jid, tiles, small))

ref = Image.open(REF).convert('RGB')
refT = up(ref, H)
W = G + max(sum(t.width + G for t, _ in r[2]) for r in rows) + refT.width + G
Ht = G + HEAD + sum(HEAD + H + HEAD + 88 + G for _ in rows) + G
img = Image.new('RGB', (W, Ht), BG)
d = ImageDraw.Draw(img)
d.text((G, G), 'Phase ninjas: his window | the phase edit at window size | our 88 | our 44 at 2x (tiles shown %d px tall, nearest); his phase reference at right' % H, fill=INK)
y = G + HEAD
for name, jid, tiles, small in rows:
    d.text((G, y + 3), f'{name}  -  {jid}', fill=INK)
    y += HEAD
    x = G
    for t, label in tiles:
        img.paste(t, (x, y))
        d.text((x + 4, y + H + 3), label, fill=SUB)
        x += t.width + G
    y += H + HEAD
    img.paste(small, (G, y))
    d.text((G + small.width + G, y + 36), 'as in the game: our 88 and our 44 at 1x, the 44 at 2x', fill=SUB)
    y += 88 + G
rx = W - G - refT.width
img.paste(refT, (rx, G + 2 * HEAD))
d.text((rx + 4, G + 2 * HEAD + H + 3), "his phase reference (256x256)", fill=SUB)
img.save(OUT)
print('wrote', OUT, img.size)
