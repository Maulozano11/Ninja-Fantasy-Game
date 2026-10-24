"""Review sheets for the chakra set v3 (vfx_chakra_v3), after the generator has run.

    python3 -I tools/refs/chakra-v3-review.py <art2> <reviewDir> <character.png>

<reviewDir> is the folder chakra-from-ref.py wrote (his-map.json: where each key frame sits in his
sheet); <character.png> is our character at 1x (kit characterRef(), feet at (64, 120)). Reads
<art2>/staging/vfx_chakra_v3 and his sheet <art2>/REF-chakra-set-owner.jpg, and writes into <art2>:
  vfx-chakra-v3-compare.png  his panel beside our key frame at the same scale (3x), sprite by sprite
                             (wall_depth: ours only, kept as he asked)
  vfx-chakra-v3-anims.png    every animation as labelled frame strips at 2x
  vfx-chakra-v3-blast.gif    the blast at 2x with our character beside it (12 fps)
  vfx-chakra-v3-walls.gif    the three walls at 2x: rise (12 fps), then the idle loop three times (10 fps)
  vfx-chakra-v3-aura.gif     the aura round our character at 2x (back layer, character, front layer; 10 fps)
Every file is written whole (temp name, then rename). Deterministic.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ART2, REVIEW, CHAR_PNG = sys.argv[1], sys.argv[2], sys.argv[3]
STAGE = os.path.join(ART2, 'staging', 'vfx_chakra_v3')
MAN = json.load(open(os.path.join(STAGE, 'manifest.json')))['sprites']
REF = Image.open(os.path.join(ART2, 'REF-chakra-set-owner.jpg')).convert('RGBA')
HIS = json.load(open(os.path.join(REVIEW, 'his-map.json')))
CHAR = Image.open(CHAR_PNG).convert('RGBA')
FEET = (64, 120)

BG = (21, 21, 29, 255)
PANEL = (32, 32, 42, 255)
EDGE = (44, 46, 58, 255)
INK = (201, 203, 214, 255)
DIM = (125, 128, 146, 255)
ACCENT = (127, 196, 255, 255)

# --- a 3x5 pixel font for the labels -------------------------------------------------------------------
GLYPHS = {
    'A': '010101111101101', 'B': '110101110101110', 'C': '011100100100011', 'D': '110101101101110', 'E': '111100110100111',
    'F': '111100110100100', 'G': '011100101101011', 'H': '101101111101101', 'I': '111010010010111', 'J': '001001001101010',
    'K': '101101110101101', 'L': '100100100100111', 'M': '101111111101101', 'N': '110101101101101', 'O': '010101101101010',
    'P': '110101110100100', 'Q': '010101101110011', 'R': '110101110101101', 'S': '011100010001110', 'T': '111010010010010',
    'U': '101101101101111', 'V': '101101101101010', 'W': '101101111111101', 'X': '101101010101101', 'Y': '101101010010010',
    'Z': '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
    '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111',
    '9': '111101111001110', ' ': '000000000000000', '-': '000000111000000', '.': '000000000000010', ':': '000010000010000',
    '/': '001001010100100', '(': '010100100100010', ')': '010001001001010', '_': '000000000000111', ',': '000000000010100',
    '+': '000010111010000', '@': '010101111100011', 'x': '000101010101000',
}


def text(img, x, y, s, col, k=2):
    px = img.load()
    for ch in s:
        g = GLYPHS.get(ch, GLYPHS.get(ch.upper(), GLYPHS[' ']))
        for i in range(15):
            if g[i] == '1':
                for dy in range(k):
                    for dx in range(k):
                        X, Y = x + (i % 3) * k + dx, y + (i // 3) * k + dy
                        if 0 <= X < img.width and 0 <= Y < img.height:
                            px[X, Y] = col
        x += 4 * k


def text_w(s, k=2):
    return len(s) * 4 * k


def save(img, path, **kw):
    tmp = path + '.part'
    img.save(tmp, format='GIF' if path.endswith('.gif') else 'PNG', **kw)
    os.replace(tmp, path)


# --- the group ---------------------------------------------------------------------------------------

def frames(name, anim):
    m = MAN[name]
    sheet = Image.open(os.path.join(STAGE, m['file'])).convert('RGBA')
    a = m['anims'][anim]
    fw, fh = m['frameW'], m['frameH']
    return [sheet.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh)) for i in range(a['frames'])]


def on(bg, img, scale=1):
    out = Image.new('RGBA', img.size, bg)
    out.alpha_composite(img)
    return out.resize((img.width * scale, img.height * scale), Image.NEAREST) if scale != 1 else out


def aura_frame(i):
    """The aura round our character: back layer, character (feet on the anchor), front layer."""
    b, f = frames('aura_back', 'idle')[i], frames('aura', 'idle')[i]
    ax, ay = MAN['aura']['anchor']
    c = Image.new('RGBA', b.size, (0, 0, 0, 0))
    c.alpha_composite(b)
    ch = Image.new('RGBA', b.size, (0, 0, 0, 0))
    ch.paste(CHAR, (ax - FEET[0], ay - FEET[1]), CHAR)
    c.alpha_composite(ch)
    c.alpha_composite(f)
    return c


# --- compare: his panel beside our key frame -----------------------------------------------------------

KEYS = [('bolt', 'fly', 0), ('stream', 'fly', 0), ('breath', 'fly', 0), ('sphere', 'fly', 0), ('slash', 'fly', 0), ('multi', 'fly', 0),
        ('hit', 'hit', 3), ('blast', 'blast', 4), ('wall', 'idle', 0), ('aura', 'idle', 0), ('wall_diag', 'idle', 0), ('wall_depth', 'idle', 0)]
S3 = 3


def his_crop(name, pad_to, anchor_to, ox=None, oy=None):
    """His panel round the sprite (only what lies inside his panel; the rest his panel colour),
    cut to our frame's size and aligned on the anchors."""
    h = HIS[name]
    if ox is None:
        ox = h['origin'][0] + h['anchor'][0] - anchor_to[0]
        oy = h['origin'][1] + h['anchor'][1] - anchor_to[1]
    cx0, cy0, cx1, cy1 = h['crop']
    out = Image.new('RGBA', pad_to, PANEL)
    box = (max(ox, cx0), max(oy, cy0), min(ox + pad_to[0], cx1), min(oy + pad_to[1], cy1))
    if box[2] > box[0] and box[3] > box[1]:
        out.paste(REF.crop(box), (box[0] - ox, box[1] - oy))
    return out


cards = []
for name, anim, i in KEYS:
    m = MAN[name]
    if name == 'stream':
        tile = frames('stream', 'fly')[0]
        head = frames('stream_head', 'fly')[0]
        ours = Image.new('RGBA', (64 * 3 + head.width, max(64, head.height)), (0, 0, 0, 0))
        for k in range(3):
            ours.alpha_composite(tile, (64 * k, 0))
        ours.alpha_composite(head, (192, 0))
        # Our three tiles are his beam from 64 px before the tile's period, up to his head.
        h = HIS['stream']
        his = REF.crop((h['origin'][0] - 64, h['origin'][1], h['origin'][0] - 64 + ours.width, h['origin'][1] + ours.height))
        label = 'STREAM X3 + STREAM_HEAD'
    elif name == 'aura':
        ours = aura_frame(0)
        his = his_crop('aura', ours.size, m['anchor'])
        label = 'AURA (BACK + OUR CHARACTER + FRONT)'
    else:
        ours = frames(name, anim)[i]
        his = None if name == 'wall_depth' else his_crop(name, ours.size, m['anchor'])
        label = name.upper()
    sub = '%s %d  ' % (anim.upper(), i) if name != 'stream' else 'FLY 0  '
    cards.append((label, sub, his, ours))

PADX, GAP = 16, 24
rows, row, rw = [], [], 0
MAXW = 2600
for c in cards:
    w = (c[3].width * S3) * (1 if c[2] is None else 2) + (0 if c[2] is None else 12) + PADX
    if row and rw + w > MAXW:
        rows.append(row)
        row, rw = [], 0
    row.append((c, w))
    rw += w
rows.append(row)
H = 40 + sum(max(c[3].height * S3 for c, _ in r) + 50 + GAP for r in rows)
W = max(sum(w for _, w in r) for r in rows) + PADX
sheet = Image.new('RGBA', (W, H), BG)
text(sheet, PADX, 12, 'CHAKRA V3: HIS PANEL (LEFT) BESIDE OUR KEY FRAME (RIGHT), SAME SCALE, 3X', INK)
y = 40
for r in rows:
    x = PADX
    rh = max(c[3].height * S3 for c, _ in r)
    for (label, sub, his, ours), w in r:
        text(sheet, x, y, label, ACCENT)
        if his is None:
            text(sheet, x, y + 14, 'KEPT OURS, AS ASKED', INK)
            sheet.alpha_composite(on(PANEL, ours, S3), (x, y + 30))
        else:
            text(sheet, x, y + 14, 'HIS', DIM)
            text(sheet, x + ours.width * S3 + 12, y + 14, 'OURS (' + sub.strip() + ')', DIM)
            sheet.alpha_composite(his.convert('RGBA').resize((his.width * S3, his.height * S3), Image.NEAREST), (x, y + 30))
            sheet.alpha_composite(on(PANEL, ours, S3), (x + ours.width * S3 + 12, y + 30))
        x += w
    y += rh + 50 + GAP
save(sheet.convert('RGB'), os.path.join(ART2, 'vfx-chakra-v3-compare.png'))

# --- anims: every animation as frame strips at 2x ------------------------------------------------------

S2 = 2
strips = []
for name, m in MAN.items():
    for anim, a in m['anims'].items():
        fr = aura_frame_list = None
        fr = frames(name, anim)
        strips.append(('%s  %s  %dF @ %d FPS%s  %dx%d  ANCHOR %d,%d' % (name.upper(), anim.upper(), a['frames'], a['fps'], '' if a['loop'] else ' ONCE',
                                                                       m['frameW'], m['frameH'], m['anchor'][0], m['anchor'][1]), fr))
MAXW = 2800
blocks = []
for label, fr in strips:
    fw, fh = fr[0].width * S2, fr[0].height * S2
    per = max(1, (MAXW - PADX) // (fw + 6))
    lines = [fr[k:k + per] for k in range(0, len(fr), per)]
    blocks.append((label, lines, fw, fh))
H = 20 + sum(24 + len(lines) * (fh + 6) + 10 for _, lines, _, fh in blocks)
W = MAXW
sheet = Image.new('RGBA', (W, H), BG)
y = 12
for label, lines, fw, fh in blocks:
    text(sheet, PADX, y, label, ACCENT)
    y += 24
    k0 = 0
    for line in lines:
        for j, f in enumerate(line):
            x = PADX + j * (fw + 6)
            sheet.alpha_composite(on(PANEL, f, S2), (x, y))
            text(sheet, x + 3, y + 3, str(k0 + j), DIM, 1)
        k0 += len(line)
        y += fh + 6
    y += 10
save(sheet.convert('RGB'), os.path.join(ART2, 'vfx-chakra-v3-anims.png'))

# --- GIFs ----------------------------------------------------------------------------------------------


def gif(path, imgs, durations):
    pal_frames = [im.convert('RGB').quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for im in imgs]
    tmp = path + '.part'
    pal_frames[0].save(tmp, format='GIF', save_all=True, append_images=pal_frames[1:], duration=durations, loop=0, disposal=1)
    os.replace(tmp, path)


def stage(items, w, h, ground):
    """Sprites placed by their anchors on one ground line (x positions given), on a dark panel."""
    c = Image.new('RGBA', (w, h), PANEL)
    for img, (ax, ay), x in items:
        c.alpha_composite(img, (x - ax, ground - ay))
    return c


# The blast, our character beside it.
bm = MAN['blast']
bf = frames('blast', 'blast')
W = bm['frameW'] + 70
G = bm['anchor'][1] + 8
imgs = [stage([(f, bm['anchor'], bm['anchor'][0] + 4), (CHAR, FEET, bm['frameW'] + 30)], W, bm['frameH'] + 16, G).resize((W * 2, (bm['frameH'] + 16) * 2), Image.NEAREST) for f in bf]
gif(os.path.join(ART2, 'vfx-chakra-v3-blast.gif'), imgs, [round(1000 / bm['anims']['blast']['fps'])] * len(imgs))

# The three walls: rise, then idle three times.
names = ['wall', 'wall_diag', 'wall_depth']
up = max(MAN[n]['anchor'][1] for n in names) + 10
down = max(MAN[n]['frameH'] - MAN[n]['anchor'][1] for n in names) + 10
xs, x = [], 10
for n in names:
    xs.append(x + MAN[n]['anchor'][0])
    x += MAN[n]['frameW'] + 20
cx = x + 30
W = cx + 40
seq, dur = [], []
for anim, reps in (('rise', 1), ('idle', 3)):
    fl = {n: frames(n, anim) for n in names}
    fps = MAN['wall']['anims'][anim]['fps']
    for _ in range(reps):
        for i in range(len(fl['wall'])):
            img = stage([(fl[n][i], MAN[n]['anchor'], xs[k]) for k, n in enumerate(names)] + [(CHAR, FEET, cx)], W, up + down, up)
            seq.append(img.resize((W * 2, (up + down) * 2), Image.NEAREST))
            dur.append(round(1000 / fps))
gif(os.path.join(ART2, 'vfx-chakra-v3-walls.gif'), seq, dur)

# The aura round our character.
am = MAN['aura']
imgs = [on(PANEL, aura_frame(i), 2) for i in range(am['anims']['idle']['frames'])]
gif(os.path.join(ART2, 'vfx-chakra-v3-aura.gif'), imgs, [round(1000 / am['anims']['idle']['fps'])] * len(imgs))
print('wrote vfx-chakra-v3-compare.png, -anims.png, -blast.gif, -walls.gif, -aura.gif into', ART2)
