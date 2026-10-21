"""Review images for vfx_water_v3 (and the border check).

    python3 -I review.py <art2> [--only-check] [--look <dir>]

Reads <art2>/staging/vfx_water_v3 (PNGs + manifest), his crops at game scale in
<art2>/vfx-water-v3-src/his-*.png (written by tools/refs/water-from-ref.py), our character at 2x cut
from <art2>/vfx-water.png, and writes into <art2>:
  vfx-water-v3.png          his layout with our key frames at 2x, labelled, character for scale
  vfx-water-v3-compare.png  his crop next to ours at the same scale (3x), every sprite
  vfx-water-v3-anims.png    every animation as frame strips (2x)
  vfx-water-v3-blast.gif, vfx-water-v3-walls.gif, vfx-water-v3-aura.gif
and prints the border check.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ART2 = sys.argv[1]
ONLY_CHECK = '--only-check' in sys.argv
LOOK = sys.argv[sys.argv.index('--look') + 1] if '--look' in sys.argv else None
G = os.path.join(ART2, 'staging', 'vfx_water_v3')
SRC = os.path.join(ART2, 'vfx-water-v3-src')
MAN = json.load(open(os.path.join(G, 'manifest.json')))['sprites']

BG = (21, 21, 29)
PANEL = (32, 33, 43)
EDGE = (44, 46, 58)
INK = (201, 203, 214)
DIM = (125, 128, 146)
ACCENT = (98, 214, 240)
GRASS = (84, 110, 70)
FONT = ImageFont.load_default()


def frames(name):
    m = MAN[name]
    sheet = Image.open(os.path.join(G, m['file'])).convert('RGBA')
    out = {}
    for anim, a in m['anims'].items():
        out[anim] = [sheet.crop((i * m['frameW'], a['row'] * m['frameH'], (i + 1) * m['frameW'], (a['row'] + 1) * m['frameH'])) for i in range(a['frames'])]
    return out


ALL = {n: frames(n) for n in MAN}

# --- border check ------------------------------------------------------------------------------


def border_check():
    lines = []
    bad = 0
    for name, anims in ALL.items():
        if name == 'beast':
            continue
        for anim, fr in anims.items():
            for i, f in enumerate(fr):
                a = np.asarray(f)[..., 3]
                sides = {'top': a[0], 'bottom': a[-1], 'left': a[:, 0], 'right': a[:, -1]}
                if name == 'stream':
                    continue  # the tile wraps by design
                if name == 'stream_head':
                    sides.pop('left')  # the joint with the last tile
                hits = {k: int((v > 0).sum()) for k, v in sides.items() if (v > 0).any()}
                if hits:
                    bad += 1
                    lines.append(f'  FAIL {name} {anim} frame {i}: {hits}')
    n = sum(len(fr) for nm, an in ALL.items() if nm != 'beast' for fr in an.values())
    lines.insert(0, f'border check: {n} frames of {len(ALL) - 1} sprites (beast is the approved dragon copied through unchanged; stream tiles wrap; stream_head left = joint)')
    lines.append(f'  {"OK: no opaque pixel on any frame border" if not bad else str(bad) + " frames touch the border"}')
    b = np.asarray(ALL['beast']['fly'][0])[..., 3]
    lines.append(f'  (beast, unchanged copy: left edge {int((np.stack([np.asarray(f)[..., 3][:, 0] for f in ALL["beast"]["fly"]]) > 0).sum())} px over its frames)')
    return '\n'.join(lines)


print(border_check())
if ONLY_CHECK:
    sys.exit(0)

# --- helpers ------------------------------------------------------------------------------------

CHAR = Image.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'char2x.png')).convert('RGBA')
CHAR_FEET = (74, 186)  # in the 2x crop


def up(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def panel(can, x, y, w, h, fill=PANEL):
    d = ImageDraw.Draw(can)
    d.rectangle([x - 1, y - 1, x + w, y + h], outline=EDGE, fill=fill)


def text(can, x, y, s, col=INK):
    ImageDraw.Draw(can).text((x, y), s, fill=col, font=FONT)


def info(name):
    m = MAN[name]
    return f"{m['frameW']}x{m['frameH']}  " + ', '.join(f"{k} {a['frames']}f {a['fps']}fps {'loop' if a['loop'] else 'once'}" for k, a in m['anims'].items())


def keyframe(name):
    a = ALL[name]
    if name == 'hit':
        return a['hit'][2]
    if name == 'blast':
        return a['blast'][3]
    if 'idle' in a:
        return a['idle'][0]
    return list(a.values())[0][0]


def aura_comp(i=0, k=2, bg=PANEL):
    """aura_back, our character (feet on the anchor), aura on top, at k x."""
    m = MAN['aura']
    w, h = m['frameW'], m['frameH']
    can = Image.new('RGBA', (w * k, h * k), bg + (255,))
    can.alpha_composite(up(ALL['aura_back']['idle'][i], k))
    ch = CHAR if k == 2 else CHAR.resize((CHAR.width * k // 2, CHAR.height * k // 2), Image.NEAREST)
    fx, fy = CHAR_FEET[0] * k // 2, CHAR_FEET[1] * k // 2
    can.alpha_composite(ch, (m['anchor'][0] * k - fx, m['anchor'][1] * k - fy))
    can.alpha_composite(up(ALL['aura']['idle'][i], k))
    return can


# --- 1. his layout, our key frames at 2x ---------------------------------------------------------

def layout_sheet():
    K = 2
    pad, gap = 20, 22
    rows = [
        ['bolt', 'beast', 'stream', 'breath', 'sphere'],
        ['slash', 'multi', 'hit', 'blast'],
        ['wall', 'wall_diag'],
        ['wall_depth', 'aura'],
    ]
    with_char = {'blast', 'wall', 'wall_diag', 'wall_depth'}
    cw = CHAR.width + 12

    def size(n):
        if n == 'beast':
            return 260, 120
        if n == 'stream':
            return (64 * 3 + MAN['stream_head']['frameW']) * K, MAN['stream_head']['frameH'] * K
        m = MAN[n]
        return m['frameW'] * K + (cw if n in with_char else 0), m['frameH'] * K

    W = max(sum(size(n)[0] + gap for n in r) for r in rows) + pad * 2
    H = sum(max(size(n)[1] for n in r) + 34 + gap for r in rows) + pad * 2 + 20
    can = Image.new('RGBA', (W, H), BG + (255,))
    text(can, pad, 8, 'WATER   GROUP VFX_WATER_V3   15 SPRITES (AURA SPLIT IN AURA + AURA_BACK)   SHOWN 2X, KEY FRAME = HIS PICTURE', INK)
    y = pad + 16
    for r in rows:
        x = pad
        rh = max(size(n)[1] for n in r)
        for n in r:
            w, h = size(n)
            if n == 'beast':
                text(can, x, y, 'BEAST', ACCENT)
                panel(can, x, y + 30, w, h)
                text(can, x + 10, y + 70, 'BEAST: the approved water dragon', DIM)
                text(can, x + 10, y + 84, 'stays (beast.png copied unchanged)', DIM)
                x += w + gap
                continue
            label = 'STREAM x3 + STREAM_HEAD' if n == 'stream' else 'AURA (AURA_BACK + CHARACTER + AURA)' if n == 'aura' else n.upper()
            text(can, x, y, label, ACCENT)
            text(can, x, y + 13, info(n) if n != 'stream' else info('stream') + ' | head ' + info('stream_head'), DIM)
            panel(can, x, y + 30, w, h)
            top = y + 30
            if n == 'stream':
                hy = MAN['stream_head']['anchor'][1] - MAN['stream']['anchor'][1]
                for k in range(3):
                    can.alpha_composite(up(ALL['stream']['fly'][0], K), (x + k * 64 * K, top + hy * K))
                can.alpha_composite(up(ALL['stream_head']['fly'][0], K), (x + 3 * 64 * K, top))
            elif n == 'aura':
                can.alpha_composite(aura_comp(0, K), (x, top))
            else:
                f = keyframe(n)
                can.alpha_composite(up(f, K), (x, top))
                if n in with_char:
                    m = MAN[n]
                    gy = top + m['anchor'][1] * K
                    can.alpha_composite(CHAR, (x + m['frameW'] * K + 6, gy - CHAR_FEET[1]))
            x += w + gap
        y += rh + 34 + gap
    can.convert('RGB').save(os.path.join(ART2, 'vfx-water-v3.png'))


# --- 2. his crop next to ours ------------------------------------------------------------------------

def compare_sheet():
    K = 3
    items = ['bolt', 'stream', 'stream_head', 'breath', 'sphere', 'slash', 'multi', 'hit', 'blast', 'wall', 'wall_diag', 'wall_depth', 'aura']
    cards = []
    for n in items:
        his = Image.open(os.path.join(SRC, f'his-{n}.png')).convert('RGBA')
        if n == 'aura':
            ours = aura_comp(0, 1)
            parts = [('HIS', his), ('OURS: BACK + CHARACTER + FRONT', ours), ('OURS ON GRASS', aura_comp(0, 1, GRASS))]
        else:
            f = keyframe(n)
            g = Image.new('RGBA', f.size, GRASS + (255,))
            g.alpha_composite(f)
            parts = [('HIS', his), ('OURS', f), ('OURS ON GRASS', g)]
        cards.append((n, parts))
    pad, gap = 16, 16
    rows, cur, curw = [], [], 0
    maxw = 2400
    for c in cards:
        w = sum(p[1].width * K + 8 for p in c[1])
        if cur and curw + w > maxw:
            rows.append(cur)
            cur, curw = [], 0
        cur.append(c)
        curw += w + gap
    rows.append(cur)
    W = max(sum(sum(p[1].width * K + 8 for p in c[1]) + gap for c in r) for r in rows) + pad * 2
    H = sum(max(max(p[1].height for p in c[1]) * K for c in r) + 40 for r in rows) + pad * 2 + 20
    can = Image.new('RGBA', (W, H), BG + (255,))
    text(can, pad, 6, "HIS CROP (HIS SHEET RESAMPLED TO GAME SCALE: 0.925 x 0.912 OF HIS PX) NEXT TO OUR KEY FRAME, SAME FRAME AND ANCHOR, 3X", INK)
    y = pad + 16
    for r in rows:
        x = pad
        rh = max(max(p[1].height for p in c[1]) * K for c in r)
        for n, parts in r:
            text(can, x, y, n.upper() + '   ' + info('aura' if n == 'aura' else n), ACCENT)
            xx = x
            for lab, im in parts:
                text(can, xx, y + 12, lab, DIM)
                panel(can, xx, y + 26, im.width * K, im.height * K, PANEL if lab != 'OURS ON GRASS' else GRASS)
                can.alpha_composite(up(im, K), (xx, y + 26))
                xx += im.width * K + 8
            x = xx + gap
        y += rh + 40
    can.convert('RGB').save(os.path.join(ART2, 'vfx-water-v3-compare.png'))


# --- 3. every animation --------------------------------------------------------------------------

def anim_sheet():
    K = 2
    pad, gap = 16, 18
    cards = []
    for n in MAN:
        if n == 'beast':
            continue
        for anim, fr in ALL[n].items():
            a = MAN[n]['anims'][anim]
            cards.append((f"{n.upper()} - {anim.upper()} {len(fr)}F {a['fps']}FPS {'LOOP' if a['loop'] else 'ONCE'} - {fr[0].width}x{fr[0].height}", fr))
    maxw = 2600
    # Each card: its frames in a strip (wrapped if wider than the sheet); cards flow left to right.
    lays = []
    for lab, fr in cards:
        fw, fh = fr[0].width * K, fr[0].height * K
        per = max(1, min(len(fr), (maxw - pad * 2) // (fw + 6)))
        nrow = -(-len(fr) // per)
        lays.append((lab, fr, per, nrow, fw, fh, per * (fw + 6) - 6, nrow * (fh + 6) + 16))
    place, x, y, rowh = [], pad, pad + 18, 0
    for L in lays:
        w, h = L[6], L[7]
        if x > pad and x + w > maxw - pad:
            x, y, rowh = pad, y + rowh + gap, 0
        place.append((L, x, y))
        x += w + gap
        rowh = max(rowh, h)
    can = Image.new('RGBA', (maxw, y + rowh + pad), BG + (255,))
    text(can, pad, 6, 'VFX_WATER_V3 - EVERY ANIMATION, 2X (AURA = FRONT LAYER, AURA_BACK = BACK LAYER)', INK)
    for (lab, fr, per, nrow, fw, fh, w, h), x, y in place:
        text(can, x, y, lab, DIM)
        for i, f in enumerate(fr):
            fx = x + (i % per) * (fw + 6)
            fy = y + 14 + (i // per) * (fh + 6)
            panel(can, fx, fy, fw, fh)
            can.alpha_composite(up(f, K), (fx, fy))
    can.convert('RGB').save(os.path.join(ART2, 'vfx-water-v3-anims.png'))


# --- 4. GIFs -----------------------------------------------------------------------------------------

def save_gif(frames_, path, ms=83):
    pal_frames = [f.convert('RGB').quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for f in frames_]
    pal_frames[0].save(path, save_all=True, append_images=pal_frames[1:], duration=ms, loop=0, disposal=2)


def blast_gif():
    K = 2
    m = MAN['blast']
    w, h = m['frameW'] * K + CHAR.width + 24, m['frameH'] * K
    out = []
    seq = ALL['blast']['blast'] + [ALL['blast']['blast'][-1]] * 2 + [None] * 4
    for f in seq:
        can = Image.new('RGBA', (w, h), PANEL + (255,))
        can.alpha_composite(CHAR, (m['frameW'] * K + 12, m['anchor'][1] * K - CHAR_FEET[1]))
        if f is not None:
            can.alpha_composite(up(f, K), (0, 0))
        out.append(can)
    save_gif(out, os.path.join(ART2, 'vfx-water-v3-blast.gif'))


def walls_gif():
    K = 2
    names = ['wall', 'wall_diag', 'wall_depth']
    ws = [MAN[n]['frameW'] * K for n in names]
    hs = [MAN[n]['frameH'] * K for n in names]
    W = sum(ws) + 24 * len(names) + CHAR.width + 12
    H = max(hs)
    base = max(MAN[n]['anchor'][1] * K for n in names)
    seq = [('rise', i) for i in range(6)] + [('idle', i % 4) for i in range(12)]
    out = []
    for anim, i in seq:
        can = Image.new('RGBA', (W, H + 10), PANEL + (255,))
        x = 0
        for n in names:
            m = MAN[n]
            can.alpha_composite(up(ALL[n][anim][i], K), (x, base - m['anchor'][1] * K))
            x += m['frameW'] * K + 24
        can.alpha_composite(CHAR, (x, base - CHAR_FEET[1]))
        out.append(can)
    save_gif(out, os.path.join(ART2, 'vfx-water-v3-walls.gif'))


def aura_gif():
    out = [aura_comp(i % 6, 3) for i in range(12)]
    save_gif(out, os.path.join(ART2, 'vfx-water-v3-aura.gif'))


if LOOK:
    # Quick zoomed strips for iterating: each sprite's animations at 3x on dark and grass.
    os.makedirs(LOOK, exist_ok=True)
    for n in MAN:
        if n == 'beast':
            continue
        rows = []
        for anim, fr in ALL[n].items():
            for bg in (PANEL, GRASS):
                row = Image.new('RGBA', ((fr[0].width + 2) * len(fr), fr[0].height), (0, 0, 0, 255))
                for i, f in enumerate(fr):
                    t = Image.new('RGBA', f.size, bg + (255,))
                    t.alpha_composite(f)
                    row.alpha_composite(t, (i * (f.width + 2), 0))
                rows.append(row)
        Wd = max(r.width for r in rows)
        can = Image.new('RGBA', (Wd, sum(r.height + 2 for r in rows)), (0, 0, 0, 255))
        yy = 0
        for r in rows:
            can.alpha_composite(r, (0, yy))
            yy += r.height + 2
        k = 3 if Wd * 3 <= 2400 else 2
        up(can, k).convert('RGB').save(os.path.join(LOOK, f'{n}.png'))
    sys.exit(0)

layout_sheet()
compare_sheet()
anim_sheet()
blast_gif()
walls_gif()
aura_gif()
print('review images written')
