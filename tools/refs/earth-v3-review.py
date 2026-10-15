"""Review sheets for vfx_earth_v3 (the earth set copied from the owner's earth sheet).

    python3 -I tools/refs/earth-v3-review.py <art2> <hisDir> <character.png>

<art2> holds staging/vfx_earth_v3 (the built group); <hisDir> is the review folder written by
earth-from-ref.py (his crops at game scale, his-<name>.png, and their anchors, his-anchors.json);
<character.png> is our scale character at 1x (kit characterRef(), feet at (64, 120)). Writes into
<art2>:
  vfx-earth-v3-compare.png  for every sprite: his crop (box-resampled to game scale) beside our key
                            frame at the same scale, anchors aligned, both 3x;
  vfx-earth-v3-anims.png    every animation of every sprite as a labelled frame strip, 2x;
  vfx-earth-v3-blast.gif    the blast at 2x with our character beside it;
  vfx-earth-v3-walls.gif    the three walls rising then idling, with our character, 2x.
Every file is written whole under a temp name and renamed into place. Deterministic.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

ART2, HIS, CHAR_PNG = sys.argv[1], sys.argv[2], sys.argv[3]
GROUP = os.path.join(ART2, 'staging', 'vfx_earth_v3')
MAN = json.load(open(os.path.join(GROUP, 'manifest.json')))['sprites']
HIS_ANCHORS = json.load(open(os.path.join(HIS, 'his-anchors.json')))
CHAR = Image.open(CHAR_PNG).convert('RGBA')
BG = (34, 34, 45, 255)
PANEL = (32, 33, 43, 255)
INK = (201, 203, 214)
ACCENT = (224, 168, 90)
KEY = {'hit': ('hit', 2), 'blast': ('blast', 3)}


def save(img, path):
    tmp = path + '.part'
    if path.endswith('.gif'):
        img[0].save(tmp, format='GIF', save_all=True, append_images=img[1:], duration=img[0].info.get('duration', 83), loop=0, disposal=1)
    else:
        img.save(tmp, format='PNG')
    os.replace(tmp, path)
    print('wrote', path)


def frames(name):
    m = MAN[name]
    sheet = Image.open(os.path.join(GROUP, m['file'])).convert('RGBA')
    out = {}
    for a, d in m['anims'].items():
        out[a] = [sheet.crop((i * m['frameW'], d['row'] * m['frameH'], (i + 1) * m['frameW'], (d['row'] + 1) * m['frameH'])) for i in range(d['frames'])]
    return out


def key_frame(name):
    m = MAN[name]
    fr = frames(name)
    if 'idle' in fr and 'rise' in fr:
        return fr['idle'][0]
    a, i = KEY.get(name, (list(fr)[0], 0))
    return fr[a][i]


def on(bg, img, xy):
    c = Image.new('RGBA', img.size, bg)
    c.alpha_composite(img)
    return c


# --- compare: his crop beside our key frame, anchors aligned -----------------------------------

names = [n for n in MAN if n != 'beast']
rows = []
for n in names:
    if n == 'aura_back':
        continue
    m = MAN[n]
    ours = key_frame(n)
    ax, ay = m['anchor']
    hn = n
    his = Image.open(os.path.join(HIS, 'his-%s.png' % hn)).convert('RGBA')
    hx, hy = HIS_ANCHORS[hn]
    if n == 'aura':
        back = key_frame('aura_back')
        comp = Image.new('RGBA', ours.size, PANEL)
        comp.alpha_composite(back)
        ch = Image.new('RGBA', ours.size, (0, 0, 0, 0))
        ch.alpha_composite(CHAR, (ax - 64, ay - 120)) if ax >= 64 and ay >= 120 else None
        if ax < 64 or ay < 120:
            tmp = Image.new('RGBA', (ours.width + 128, ours.height + 128), (0, 0, 0, 0))
            tmp.alpha_composite(CHAR, (ax - 64 + 64, ay - 120 + 64))
            ch = tmp.crop((64, 64, 64 + ours.width, 64 + ours.height))
        comp.alpha_composite(ch)
        comp.alpha_composite(ours)
        ours_v = comp
    else:
        ours_v = on(PANEL, ours, (0, 0))
    # A common canvas round the anchor holding both.
    L = max(ax, hx)
    T = max(ay, hy)
    R = max(ours.width - ax, his.width - hx)
    B = max(ours.height - ay, his.height - hy)
    W, H = L + R, T + B
    a = Image.new('RGBA', (W, H), PANEL)
    a.paste(his, (L - hx, T - hy))
    b = Image.new('RGBA', (W, H), PANEL)
    b.paste(ours_v, (L - ax, T - ay))
    rows.append((n, a, b, (L, T)))
k = 3
gap = 12
lab = 16
Wt = max(2 * r[1].width * k + gap for r in rows) + 2 * gap
# pack rows two per line where they fit
lines = []
cur = []
cw = 0
for r in rows:
    w = 2 * r[1].width * k + gap
    if cur and cw + w + 3 * gap > 2400:
        lines.append(cur)
        cur, cw = [], 0
    cur.append(r)
    cw += w + 3 * gap
lines.append(cur)
Wt = max(sum(2 * r[1].width * k + gap + 3 * gap for r in ln) for ln in lines) + gap
Ht = sum(max(r[1].height * k for r in ln) + lab + gap for ln in lines) + gap + 20
sheet = Image.new('RGBA', (Wt, Ht), BG)
d = ImageDraw.Draw(sheet)
d.text((gap, 6), 'EARTH v3: HIS PANEL (left, box-resampled to game scale) | OUR KEY FRAME (right), same scale, anchors aligned (+), 3x', fill=INK)
y = 26
for ln in lines:
    x = gap
    hmax = max(r[1].height * k for r in ln)
    for n, a, b, (L, T) in ln:
        d.text((x, y), n.upper() + ('  (with aura_back and our character)' if n == 'aura' else ''), fill=ACCENT)
        for j, im in enumerate((a, b)):
            big = im.resize((im.width * k, im.height * k), Image.NEAREST)
            px = x + j * (im.width * k + gap)
            sheet.alpha_composite(big, (px, y + lab))
            cx, cy = px + L * k + k // 2, y + lab + T * k + k // 2
            d.line([(cx - 5, cy), (cx + 5, cy)], fill=(80, 255, 80))
            d.line([(cx, cy - 5), (cx, cy + 5)], fill=(80, 255, 80))
        x += 2 * a.width * k + gap + 3 * gap
    y += hmax + lab + gap
save(sheet.convert('RGB'), os.path.join(ART2, 'vfx-earth-v3-compare.png'))

# --- anims: every animation as a strip, 2x -------------------------------------------------------

k = 2
strips = []
for n in names:
    m = MAN[n]
    for a, fr in frames(n).items():
        d_ = m['anims'][a]
        strips.append(('%s  %s  %dx%d  %d frames @ %d fps %s  anchor %d,%d' % (n, a, m['frameW'], m['frameH'], d_['frames'], d_['fps'], 'loop' if d_['loop'] else 'once', *m['anchor']), fr, m['anchor']))
Wt = max(len(fr) * (fr[0].width * k + 6) for _, fr, _ in strips) + 20
Ht = sum(fr[0].height * k + 22 for _, fr, _ in strips) + 20
sheet = Image.new('RGBA', (Wt, Ht), BG)
d = ImageDraw.Draw(sheet)
y = 10
for label, fr, (ax, ay) in strips:
    d.text((10, y), label, fill=ACCENT)
    y += 14
    for i, f in enumerate(fr):
        big = on(PANEL, f, (0, 0)).resize((f.width * k, f.height * k), Image.NEAREST)
        x = 10 + i * (f.width * k + 6)
        sheet.alpha_composite(big, (x, y))
        d.point([(x + ax * k, y + ay * k)], fill=(80, 255, 80))
    y += fr[0].height * k + 8
save(sheet.convert('RGB'), os.path.join(ART2, 'vfx-earth-v3-anims.png'))

# --- GIFs ----------------------------------------------------------------------------------------


def gif_frames(parts, size, k, fps, charpos=None):
    out = []
    for comp in parts:
        c = Image.new('RGBA', size, BG)
        for img, xy in comp:
            c.alpha_composite(img, xy)
        if charpos:
            for p in charpos:
                c.alpha_composite(CHAR, p)
        c = c.resize((size[0] * k, size[1] * k), Image.NEAREST).convert('RGB')
        c.info['duration'] = int(round(1000 / fps))
        out.append(c)
    return out


m = MAN['blast']
fr = frames('blast')['blast']
ax, ay = m['anchor']
size = (m['frameW'] + 90, m['frameH'] + 10)
parts = [[(f, (5, 5))] for f in fr] + [[(fr[-1], (5, 5))]] * 4 + [[]] * 2
g = gif_frames(parts, size, 2, 12, charpos=[(5 + m['frameW'] - 30, 5 + ay - 120)])
save(g, os.path.join(ART2, 'vfx-earth-v3-blast.gif'))

walls = ['wall', 'wall_diag', 'wall_depth']
ws = [MAN[w] for w in walls]
gy = max(w['anchor'][1] for w in ws) + 10
xs = []
x = 10
for w in ws:
    xs.append(x)
    x += w['frameW'] + 60
size = (x, gy + max(w['frameH'] - w['anchor'][1] for w in ws) + 10)
parts = []
seq = [('rise', i) for i in range(6)] + [('idle', i % 4) for i in range(12)]
for a, i in seq:
    comp = []
    for w, wx in zip(walls, xs):
        f = frames(w)[a][i]
        comp.append((f, (wx, gy - MAN[w]['anchor'][1])))
    parts.append(comp)
chars = [(wx + MAN[w]['frameW'] - 20, gy - 120) for w, wx in zip(walls, xs)]
g = gif_frames(parts, size, 1, 12, charpos=chars)
save(g, os.path.join(ART2, 'vfx-earth-v3-walls.gif'))
