# Review images for the genjutsu set v3 (staging/vfx_genjutsu_v3, built by
# tools/world-sprites/vfx-genjutsu-v3.ts from the owner's paint-over):
#
#   vfx-genjutsu-v3-compare.png  every sprite: his crop rescaled to game scale | our key frame on
#                                his background | our key frame on a grass-toned map, all at 3x
#                                (the aura: his panel | back layer + our character + front layer |
#                                both layers alone)
#   vfx-genjutsu-v3-anims.png    every animation as frame strips at 2x
#   vfx-genjutsu-v3-blast.gif    the blast at 2x, with our character beside it
#   vfx-genjutsu-v3-walls.gif    the three walls at 2x: rise, then idle (looped 3 times)
#   vfx-genjutsu-v3-border.txt   the border check of every frame of every sprite
#
#   python3 -I <art2>/vfx-genjutsu-v3-review.py <art2> <REF.jpg>
#
# Needs <art2>/vfx-genjutsu-v3-character.png (our characterRef, 128x128, feet at 64,120) and
# <art2>/vfx-genjutsu-v3-refmap.json (written by tools/refs/genjutsu-from-ref.py).

import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ART2, REFJPG = sys.argv[1], sys.argv[2]
GROUP = os.path.join(ART2, 'staging', 'vfx_genjutsu_v3')
MAN = json.load(open(os.path.join(GROUP, 'manifest.json')))['sprites']
REFMAP = json.load(open(os.path.join(ART2, 'vfx-genjutsu-v3-refmap.json')))
REF = Image.open(REFJPG).convert('RGB')
CHAR = Image.open(os.path.join(ART2, 'vfx-genjutsu-v3-character.png')).convert('RGBA')
CHAR_FEET = (64, 120)
CHAR_X0, CHAR_X1 = 27, 83
FONT = ImageFont.load_default_imagefont()

SHEET_BG = (21, 21, 29)
PANEL = (32, 33, 43)
HIS_BG = (32, 32, 42)
GRASS = (78, 104, 64)
ACCENT = (192, 140, 240)
INK = (201, 203, 214)
DIM = (125, 128, 146)

def save(img, name):
    path = os.path.join(ART2, name)
    tmp = path + '.part'
    if name.endswith('.gif'):
        img[0].save(tmp, format='GIF', save_all=True, append_images=img[1], duration=img[2], loop=0, disposal=2, optimize=False)
    else:
        img.save(tmp, format='PNG')
    os.replace(tmp, path)

def frames(name):
    s = MAN[name]
    sheet = Image.open(os.path.join(GROUP, s['file'])).convert('RGBA')
    out = {}
    for an, a in s['anims'].items():
        out[an] = [sheet.crop((i * s['frameW'], a['row'] * s['frameH'], (i + 1) * s['frameW'], (a['row'] + 1) * s['frameH'])) for i in range(a['frames'])]
    return out

KEY = {'hit': ('hit', 3), 'blast': ('blast', 4)}  # the peak frame (= his picture) of the one-shots
def key_frame(name):
    fr = frames(name)
    an, i = KEY.get(name, ('idle' if 'idle' in fr else next(iter(fr)), 0))
    return fr[an][i]

def text(img, xy, s, col):
    ImageDraw.Draw(img).text(xy, s, fill=col, font=FONT)

def upscale(img, k):
    return img.resize((img.width * k, img.height * k), Image.NEAREST)

def on_bg(img, bg):
    base = Image.new('RGBA', img.size, bg + (255,))
    return Image.alpha_composite(base, img)

# --- border check ------------------------------------------------------------------------------

lines, total_bad, total = [], 0, 0
for name, s in MAN.items():
    fr = frames(name)
    nf, bad_here = 0, []
    for an, fl in fr.items():
        for i, f in enumerate(fl):
            a = np.asarray(f)[..., 3] > 0
            sides = {'top': int(a[0].sum()), 'bottom': int(a[-1].sum()), 'left': int(a[:, 0].sum()), 'right': int(a[:, -1].sum())}
            if name == 'stream': sides['left'] = sides['right'] = 0  # the tile wraps by design
            if name == 'stream_head': sides['left'] = 0               # the joint with the last tile
            bad = {k: v for k, v in sides.items() if v}
            nf += 1
            if bad: bad_here.append('%s %s[%d]: %s' % (name, an, i, bad))
    total += nf
    note = '  (copied through unchanged from vfx_genjutsu; another artist\'s)' if name == 'beast' else ''
    if bad_here and name != 'beast':
        total_bad += len(bad_here); lines += bad_here
    lines.append('%-11s %3dx%-3d %2d frames  %s%s' % (name, s['frameW'], s['frameH'], nf, 'ok' if not bad_here else 'ART ON BORDER: %d frames' % len(bad_here), note))
lines.append('frames checked: %d; frames of this set with opaque pixels on the border: %d (stream sides and the head\'s left joint exempt)' % (total, total_bad))
open(os.path.join(ART2, 'vfx-genjutsu-v3-border.txt'), 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines))

# --- flash check: the mean alpha x brightness of every frame, and its biggest step between
# neighbouring frames (looping anims include the wrap back to frame 0), as a share of the peak ---

fl_lines = ['mean alpha x brightness per frame (x1000); "max step" is the biggest change between neighbouring frames, as a share of the anim\'s peak; "changed" is how many pixels change between neighbours']
for name, s in MAN.items():
    for an, fl in frames(name).items():
        a = s['anims'][an]
        ms, ch, prev = [], [], None
        for f in fl:
            v = np.asarray(f).astype(float)
            L = (0.299 * v[..., 0] + 0.587 * v[..., 1] + 0.114 * v[..., 2]) / 255
            ms.append(float((v[..., 3] / 255 * L).mean() * 1000))
            if prev is not None: ch.append(int((np.abs(v - prev).sum(-1) > 30).sum()))
            prev = v
        m = np.array(ms)
        d = np.abs(np.diff(np.r_[m, m[0]] if a['loop'] else m)) / max(m.max(), 1e-6)
        note = '  (another artist\'s, copied through)' if name == 'beast' else ''
        fl_lines.append('%-11s %-5s %2df@%-2d max step %5.1f%%  |  %s  |  changed %s%s' % (name, an, a['frames'], a['fps'], d.max() * 100, ' '.join('%.0f' % v for v in m), ' '.join(map(str, ch)), note))
open(os.path.join(ART2, 'vfx-genjutsu-v3-flash.txt'), 'w').write('\n'.join(fl_lines) + '\n')
print('\n'.join(fl_lines))

# --- compare: his crop | ours on his background | ours on a map ----------------------------------

def his_crop(name, size, anchor):
    """His pixels under our frame, area-resampled to game scale."""
    r = REFMAP[name]
    k = r['k']
    # The generator may have added room round the extractor's frame: move his origin with it.
    ox = r['origin'][0] - (anchor[0] - r['anchor'][0]) / k
    oy = r['origin'][1] - (anchor[1] - r['anchor'][1]) / k
    W, H = size
    if r.get('tile'):
        tx, tw = r['tile']
        strip = REF.crop((tx - tw, int(oy) - 2, tx + 2 * tw, int(oy + H / k) + 3))
        return strip.resize((W * 3, H), Image.BOX, box=(0, oy - int(oy) + 2, 3 * tw, oy - int(oy) + 2 + H / k)).crop((W, 0, 2 * W, H))
    return REF.resize((W, H), Image.BOX, box=(ox, oy, ox + W / k, oy + H / k))

comp_rows = []
for name in MAN:
    if name in ('beast', 'aura_back'): continue
    s = MAN[name]
    f = key_frame(name)
    k = 3
    his = upscale(his_crop(name, f.size, s['anchor']), k)
    if name == 'aura':
        back = key_frame('aura_back')
        withc = Image.new('RGBA', f.size, HIS_BG + (255,))
        withc.alpha_composite(back)
        cl = Image.new('RGBA', f.size); cl.paste(CHAR, (s['anchor'][0] - CHAR_FEET[0], s['anchor'][1] - CHAR_FEET[1]))
        withc.alpha_composite(cl); withc.alpha_composite(f)
        alone = Image.alpha_composite(back, f)
        ours = upscale(withc.convert('RGB'), k)
        grass = upscale(on_bg(alone, GRASS).convert('RGB'), k)
        label = 'AURA (+ AURA_BACK)  %dX%d  SHOWN 3X:  HIS PANEL  |  BACK + OUR CHARACTER + FRONT  |  BOTH LAYERS ON A MAP' % f.size
    else:
        ours = upscale(on_bg(f, HIS_BG).convert('RGB'), k)
        grass = upscale(on_bg(f, GRASS).convert('RGB'), k)
        label = '%s  %dX%d  SHOWN 3X:  HIS PAINT-OVER (GAME SCALE)  |  OURS (KEY FRAME) ON HIS BACKGROUND  |  OURS ON A MAP' % (name.upper(), f.width, f.height)
    w = his.width * 3 + 20
    row = Image.new('RGB', (max(w, FONT.getbbox(label)[2] + 4), his.height + 18), SHEET_BG)
    text(row, (0, 2), label, ACCENT)
    row.paste(his, (0, 16)); row.paste(ours, (his.width + 10, 16)); row.paste(grass, (his.width * 2 + 20, 16))
    comp_rows.append(row)
    if os.environ.get('GJ_ROWS'):
        os.makedirs(os.environ['GJ_ROWS'], exist_ok=True)
        row.save(os.path.join(os.environ['GJ_ROWS'], name + '.png'))
# Rows packed into two columns by height (the big walls get a column to themselves as needed).
comp_rows.sort(key=lambda r: -r.width)
cols = [[], []]; hts = [0, 0]
for r in comp_rows:
    i = 0 if hts[0] <= hts[1] else 1
    cols[i].append(r); hts[i] += r.height + 14
cw = [max((r.width for r in c), default=0) for c in cols]
comp = Image.new('RGB', (cw[0] + cw[1] + 40, max(hts) + 30), SHEET_BG)
text(comp, (10, 6), 'GENJUTSU V3 - THE OWNER\'S PAINT-OVER (RESCALED TO GAME SCALE) NEXT TO OUR KEY FRAMES, SAME SCALE, 3X', INK)
for ci, c in enumerate(cols):
    y = 24
    for r in c:
        comp.paste(r, (10 + (cw[0] + 20) * ci, y)); y += r.height + 14
save(comp, 'vfx-genjutsu-v3-compare.png')

# --- every animation as frame strips at 2x ----------------------------------------------------------

strips = []
for name, s in MAN.items():
    fr = frames(name)
    for an, fl in fr.items():
        a = s['anims'][an]
        fw, fh = fl[0].size
        per = max(1, min(len(fl), 1300 // (fw + 3)))
        nrow = (len(fl) + per - 1) // per
        st = Image.new('RGBA', (per * (fw + 3), nrow * (fh + 3) + 12), SHEET_BG + (255,))
        extra = ' (COPIED THROUGH, ANOTHER ARTIST\'S)' if name == 'beast' else ''
        text(st, (0, 0), '%s - %s %dF %dFPS %s - %dX%d - ANCHOR %d,%d%s' % (name.upper(), an.upper(), a['frames'], a['fps'], 'LOOP' if a['loop'] else 'ONCE', fw, fh, *s['anchor'], extra), DIM)
        for i, f in enumerate(fl):
            x, y = (i % per) * (fw + 3), 12 + (i // per) * (fh + 3)
            ImageDraw.Draw(st).rectangle([x, y, x + fw - 1, y + fh - 1], fill=PANEL)
            st.alpha_composite(f, (x, y))
            # The anchor, as a small mark.
            ax, ay = s['anchor']
            ImageDraw.Draw(st).point([(x + ax, y + ay)], fill=(255, 220, 80, 255))
        strips.append(st)
W = max(s.width for s in strips) + 20
H = sum(s.height + 10 for s in strips) + 30
an_img = Image.new('RGBA', (W, H), SHEET_BG + (255,))
text(an_img, (10, 6), 'GENJUTSU V3 - EVERY ANIMATION (2X; THE YELLOW DOT IS THE ANCHOR)', INK)
y = 24
for s in strips:
    an_img.alpha_composite(s, (10, y)); y += s.height + 10
save(upscale(an_img.convert('RGB'), 2), 'vfx-genjutsu-v3-anims.png')

# --- GIFs -------------------------------------------------------------------------------------------

def gif_frames(stages, size, k=2):
    out = []
    for parts in stages:
        g = Image.new('RGBA', size, HIS_BG + (255,))
        for im, xy in parts: g.alpha_composite(im, xy)
        out.append(upscale(g.convert('RGB'), k).quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))
    return out

s = MAN['blast']; bl = frames('blast')['blast']
W, H = s['frameW'] + 90, s['frameH'] + 10
cx = s['frameW'] + 20 - CHAR_X0
st = []
for f in bl + [None] * 6:
    parts = [(CHAR, (cx, 5 + s['anchor'][1] - CHAR_FEET[1]))]
    if f is not None: parts.append((f, (5, 5)))
    st.append(parts)
fr = gif_frames(st, (W, H))
save((fr[0], fr[1:], [round(1000 / s['anims']['blast']['fps'])] * len(fr)), 'vfx-genjutsu-v3-blast.gif')

names = ['wall', 'wall_diag', 'wall_depth']
anims = {n: frames(n) for n in names}
xs, x = {}, 5
for n in names:
    xs[n] = x; x += MAN[n]['frameW'] + 12
cxw = x + 6
W = cxw + (CHAR_X1 - CHAR_X0) + 10
gy = max(MAN[n]['anchor'][1] for n in names) + 5
H = gy + max(MAN[n]['frameH'] - MAN[n]['anchor'][1] for n in names) + 5
nr, ni = len(anims['wall']['rise']), len(anims['wall']['idle'])
seq = [('rise', i) for i in range(nr)] + [('idle', i % ni) for i in range(ni * 3)]
st = []
for an, i in seq:
    parts = []
    for n in names:
        fl = anims[n][an]
        parts.append((fl[i % len(fl)], (xs[n], gy - MAN[n]['anchor'][1])))
    parts.append((CHAR, (cxw - CHAR_X0, gy - CHAR_FEET[1])))
    st.append(parts)
dur = [round(1000 / MAN['wall']['anims']['rise']['fps'])] * nr + [round(1000 / MAN['wall']['anims']['idle']['fps'])] * (ni * 3)
fr = gif_frames(st, (W, H))
save((fr[0], fr[1:], dur), 'vfx-genjutsu-v3-walls.gif')
print('review images written')
