# Review images for the lightning set v3 (staging/vfx_lightning_v3, built by
# tools/world-sprites/vfx-lightning-v3.ts from the owner's paint-over):
#
#   vfx-lightning-v3.png          key frames at 2x in the layout of his sheet, labelled, with our
#                                 character for scale (beside the blast and walls, inside the aura)
#   vfx-lightning-v3-compare.png  every sprite: his crop | our key frame on his background | our
#                                 key frame on a grass-toned map (to judge the see-through glow)
#   vfx-lightning-v3-anims.png    every animation as frame strips at 2x
#   vfx-lightning-v3-blast.gif    the blast at 2x, with the character beside it
#   vfx-lightning-v3-walls.gif    the three walls at 2x: rise, then idle (looped 3 times)
#   vfx-lightning-v3-loops.gif    the fly loops (stream assembled) and the hit at 2x, at 12 fps
#   vfx-lightning-v3-aura.gif     the aura over our character at 3x, at its own fps
#   vfx-lightning-v3-border.txt   the border check of every frame of every sprite
#   vfx-lightning-v3-energy.txt   the flash check: each frame's light (mean alpha x brightness, % of
#                                 the animation's brightest frame) and the biggest step between
#                                 neighbouring frames (loops include the wrap back to frame 0)
#
#   python3 -I <art2>/vfx-lightning-v3-review.py <art2>

import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ART2 = sys.argv[1]
GROUP = os.path.join(ART2, 'staging', 'vfx_lightning_v3')
MAN = json.load(open(os.path.join(GROUP, 'manifest.json')))['sprites']
REFMAP = json.load(open(os.path.join(ART2, 'vfx-lightning-v3-refmap.json')))
REF = Image.open(os.path.join(ART2, 'REF-lightning-set-owner.jpg')).convert('RGB')
FONT = ImageFont.load_default_imagefont()

SHEET_BG = (21, 21, 29)
PANEL = (32, 33, 43)
PANEL_EDGE = (44, 46, 58)
HIS_BG = (32, 32, 42)
GRASS = (78, 104, 64)
ACCENT = (147, 214, 255)
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

def our_character():
    """Our character (kit characterRef, 128x128, feet at (64, 120)), from our 2x sheet."""
    sheet = np.asarray(Image.open(os.path.join(ART2, 'vfx-lightning.png')).convert('RGBA'))[::2, ::2]
    out = np.zeros((128, 128, 4), np.uint8)
    reg = sheet[278 + 27:278 + 123, 510 + 27:510 + 83]
    on = np.abs(reg[..., :3].astype(int) - [0x20, 0x21, 0x2b]).sum(-1) > 0
    out[27:123, 27:83][on] = reg[on]
    return Image.fromarray(out, 'RGBA')
CHAR = our_character()
CHAR_FEET = (64, 120)
CHAR_X0, CHAR_X1 = 27, 83  # the figure's columns in its canvas

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

def anim_info(name):
    s = MAN[name]
    return ', '.join('%s %dF %dFPS %s' % (an.upper(), a['frames'], a['fps'], 'LOOP' if a['loop'] else 'ONCE') for an, a in s['anims'].items())

def text(img, xy, s, col):
    ImageDraw.Draw(img).text(xy, s, fill=col, font=FONT)

def upscale(img, k):
    return img.resize((img.width * k, img.height * k), Image.NEAREST)

def on_bg(img, bg):
    base = Image.new('RGBA', img.size, bg + (255,))
    return Image.alpha_composite(base, img)

# --- border check ------------------------------------------------------------------------------

lines = []
total_bad = 0
for name, s in MAN.items():
    fr = frames(name)
    nf = 0
    for an, fl in fr.items():
        for i, f in enumerate(fl):
            a = np.asarray(f)[..., 3] > 0
            sides = {'top': int(a[0].sum()), 'bottom': int(a[-1].sum()), 'left': int(a[:, 0].sum()), 'right': int(a[:, -1].sum())}
            if name == 'stream': sides['left'] = sides['right'] = 0  # the tile wraps by design
            if name == 'stream_head': sides['left'] = 0               # the joint with the last tile
            bad = {k: v for k, v in sides.items() if v}
            nf += 1
            if bad:
                total_bad += 1
                lines.append('%s %s[%d]: %s' % (name, an, i, bad))
    lines.append('%-11s %3dx%-3d %2d frames  ok' % (name, s['frameW'], s['frameH'], nf) if not any(l.startswith(name + ' ') for l in lines) else '%s: FAILED' % name)
lines.append('frames with art on the border: %d' % total_bad)
open(os.path.join(ART2, 'vfx-lightning-v3-border.txt'), 'w').write('\n'.join(lines) + '\n')

# --- flash check ---------------------------------------------------------------------------------

elines = ['sprite      anim   frames fps  biggest step   light per frame (% of the brightest)']
for name, s in MAN.items():
    for an, fl in frames(name).items():
        a = s['anims'][an]
        e = []
        for f in fl:
            px = np.asarray(f).astype(float)
            L = (0.3 * px[..., 0] + 0.59 * px[..., 1] + 0.11 * px[..., 2]) / 255
            e.append(float((L * px[..., 3] / 255).sum()))
        e = np.array(e) / max(e)
        steps = np.abs(np.diff(np.concatenate([e, e[:1]]) if a['loop'] else e))
        elines.append('%-11s %-6s %3d %4d   %5.1f%%        %s' % (name, an, a['frames'], a['fps'], steps.max() * 100, ' '.join('%3d' % round(v * 100) for v in e)))
open(os.path.join(ART2, 'vfx-lightning-v3-energy.txt'), 'w').write('\n'.join(elines) + '\n')
print('\n'.join(elines))
print('\n'.join(lines))

# --- 1. the overview, in the layout of his sheet ------------------------------------------------

K = 2
def card(name):
    """A labelled panel (at 1x) with the key frame, plus our character where his sheet has it."""
    s = MAN[name]
    f = key_frame(name)
    w, h = f.size
    ax, ay = s['anchor']
    char_beside = name in ('blast', 'wall', 'wall_diag', 'wall_depth')
    extra = (CHAR_X1 - CHAR_X0 + 8) if char_beside else 0
    if name == 'stream':
        head = key_frame('stream_head')
        w = f.width * 3 + head.width
    pw = w + extra
    label = 'STREAM X3 + STREAM_HEAD' if name == 'stream' else name.upper()
    size = '%dX%d' % (MAN[name]['frameW'], MAN[name]['frameH'])
    if name == 'stream': size += ' + %dX%d' % (MAN['stream_head']['frameW'], MAN['stream_head']['frameH'])
    info = size + '  ' + anim_info(name)
    tw = max(FONT.getbbox(info)[2], FONT.getbbox(label)[2]) + 2
    c = Image.new('RGBA', (max(pw + 2, tw), h + 26), SHEET_BG + (255,))
    text(c, (0, 0), label, ACCENT)
    text(c, (0, 11), info, DIM)
    d = ImageDraw.Draw(c)
    d.rectangle([0, 24, pw + 1, 24 + h + 1], fill=PANEL_EDGE)
    d.rectangle([1, 25, pw, 25 + h], fill=PANEL)
    px, py = 1, 25
    if name == 'stream':
        for i in range(3): c.alpha_composite(f, (px + i * f.width, py))
        c.alpha_composite(head, (px + 3 * f.width, py))
        return c
    if name == 'aura':
        c.alpha_composite(CHAR, (px + ax - CHAR_FEET[0], py + ay - CHAR_FEET[1]))
    c.alpha_composite(f, (px, py))
    if char_beside:
        # On the anchor's ground line (for the 3/4 wall, at the strip's right end, as in his sheet).
        gy = ay if name != 'wall_diag' else ay - 30
        c.alpha_composite(CHAR, (px + w + 4 - CHAR_X0, py + gy - CHAR_FEET[1]))
    return c

def beast_card():
    c = Image.new('RGBA', (150, 96), SHEET_BG + (255,))
    text(c, (0, 0), 'BEAST', ACCENT)
    text(c, (0, 11), 'NOT IN THIS GROUP', DIM)
    d = ImageDraw.Draw(c)
    d.rectangle([0, 24, 149, 95], fill=PANEL_EDGE); d.rectangle([1, 25, 148, 94], fill=PANEL)
    text(c, (8, 44), 'RAIJU: DRAWN BY THE', DIM)
    text(c, (8, 56), 'BEASTS ARTIST', DIM)
    return c

rows = [['bolt', 'beast', 'stream', 'breath', 'sphere'], ['slash', 'multi', 'hit', 'blast'], ['wall', 'wall_diag'], ['wall_depth', 'aura']]
cards = [[beast_card() if n == 'beast' else card(n) for n in r] for r in rows]
GAP, PAD = 12, 10
W = max(sum(c.width for c in r) + GAP * (len(r) - 1) for r in cards) + PAD * 2
H = sum(max(c.height for c in r) for r in cards) + GAP * (len(cards) - 1) + PAD * 2 + 16
sheet = Image.new('RGBA', (W, H), SHEET_BG + (255,))
text(sheet, (PAD, PAD), 'LIGHTNING V3   GROUP VFX_LIGHTNING_V3   %d SPRITES   (SHOWN 2X, KEY FRAME = THE OWNER\'S PAINT-OVER)' % len(MAN), INK)
y = PAD + 16
for r in cards:
    x = PAD
    for c in r:
        sheet.alpha_composite(c, (x, y)); x += c.width + GAP
    y += max(c.height for c in r) + GAP
save(upscale(sheet.convert('RGB'), K), 'vfx-lightning-v3.png')

# --- 2. compare: his crop | ours on his background | ours on a map ------------------------------

def his_crop(name):
    s, r = MAN[name], REFMAP[name]
    pad = (s['anchor'][0] - r['anchor'][0], s['anchor'][1] - r['anchor'][1])
    x0, y0 = r['origin'][0] - pad[0], r['origin'][1] - pad[1]
    return REF.crop((x0, y0, x0 + s['frameW'], y0 + s['frameH']))

BIG = ImageFont.load_default(size=15)
cells = []
for name in MAN:
    f = key_frame(name)
    k = 3 if max(f.size) <= 140 else 2
    his = upscale(his_crop(name), k)
    ours = upscale(on_bg(f, HIS_BG).convert('RGB'), k)
    grass = upscale(on_bg(f, GRASS).convert('RGB'), k)
    cell = Image.new('RGB', (his.width * 3 + 16, his.height + 44), SHEET_BG)
    d = ImageDraw.Draw(cell)
    d.text((0, 2), '%s  %dx%d  (shown %dx)' % (name, f.width, f.height, k), fill=ACCENT, font=BIG)
    d.text((0, 22), 'his paint-over', fill=DIM, font=BIG)
    d.text((his.width + 8, 22), 'ours, key frame', fill=DIM, font=BIG)
    d.text((his.width * 2 + 16, 22), 'ours on a map', fill=DIM, font=BIG)
    cell.paste(his, (0, 44)); cell.paste(ours, (his.width + 8, 44)); cell.paste(grass, (his.width * 2 + 16, 44))
    cells.append(cell)
# Flow the cells into rows no wider than MAXW.
MAXW, GAPX, GAPY = 2100, 40, 24
rows_, cur, w = [], [], 0
for c in cells:
    if cur and w + GAPX + c.width > MAXW:
        rows_.append(cur); cur, w = [], 0
    w += (GAPX if cur else 0) + c.width; cur.append(c)
rows_.append(cur)
W = max(sum(c.width for c in r) + GAPX * (len(r) - 1) for r in rows_) + 40
H = sum(max(c.height for c in r) for r in rows_) + GAPY * len(rows_) + 50
comp = Image.new('RGB', (W, H), SHEET_BG)
ImageDraw.Draw(comp).text((20, 12), "Lightning v3: the owner's paint-over next to our key frames, at the same scale", fill=INK, font=BIG)
y = 44
for r in rows_:
    x = 20
    for c in r:
        comp.paste(c, (x, y)); x += c.width + GAPX
    y += max(c.height for c in r) + GAPY
save(comp, 'vfx-lightning-v3-compare.png')

# --- 3. every animation as frame strips at 2x -----------------------------------------------------

strips = []
for name, s in MAN.items():
    fr = frames(name)
    for an, fl in fr.items():
        a = s['anims'][an]
        fw, fh = fl[0].size
        per = max(1, min(len(fl), 1500 // (fw + 3)))
        nrow = (len(fl) + per - 1) // per
        st = Image.new('RGBA', (per * (fw + 3), nrow * (fh + 3) + 12), SHEET_BG + (255,))
        text(st, (0, 0), '%s - %s %dF %dFPS %s - %dX%d - ANCHOR %d,%d' % (name.upper(), an.upper(), a['frames'], a['fps'], 'LOOP' if a['loop'] else 'ONCE', fw, fh, *s['anchor']), DIM)
        for i, f in enumerate(fl):
            x, y = (i % per) * (fw + 3), 12 + (i // per) * (fh + 3)
            ImageDraw.Draw(st).rectangle([x, y, x + fw - 1, y + fh - 1], fill=PANEL)
            st.alpha_composite(f, (x, y))
        strips.append(st)
W = max(s.width for s in strips) + 20
H = sum(s.height + 10 for s in strips) + 30
an_img = Image.new('RGBA', (W, H), SHEET_BG + (255,))
text(an_img, (10, 6), 'LIGHTNING V3 - EVERY ANIMATION (2X)', INK)
y = 24
for s in strips:
    an_img.alpha_composite(s, (10, y)); y += s.height + 10
save(upscale(an_img.convert('RGB'), 2), 'vfx-lightning-v3-anims.png')

# --- 4. GIFs --------------------------------------------------------------------------------------

def gif_frames(stages, size, k=2):
    """stages: list of frames, each a list of (RGBA image, (x, y)) to paste on the dark ground."""
    out = []
    for parts in stages:
        g = Image.new('RGBA', size, HIS_BG + (255,))
        for im, xy in parts: g.alpha_composite(im, xy)
        out.append(upscale(g.convert('RGB'), k).quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))
    return out

# The blast: the character beside it, the strike, then a pause.
s = MAN['blast']; bl = frames('blast')['blast']
W, H = s['frameW'] + 90, s['frameH'] + 10
cx = s['frameW'] + 30 - CHAR_X0
st = []
for f in bl + [None] * 8:
    parts = [(CHAR, (cx, 5 + s['anchor'][1] - CHAR_FEET[1]))]
    if f is not None: parts.append((f, (5, 5)))
    st.append(parts)
fr = gif_frames(st, (W, H))
save((fr[0], fr[1:], [round(1000 / s['anims']['blast']['fps'])] * len(fr)), 'vfx-lightning-v3-blast.gif')

# The walls: rise, then idle three times, all three side by side with a character.
names = ['wall', 'wall_diag', 'wall_depth']
anims = {n: frames(n) for n in names}
xs, x = {}, 5
for n in names:
    xs[n] = x; x += MAN[n]['frameW'] + 12
cxw = x + 6
W = cxw + (CHAR_X1 - CHAR_X0) + 10
gy = max(MAN[n]['anchor'][1] for n in names) + 5
H = gy + max(MAN[n]['frameH'] - MAN[n]['anchor'][1] for n in names) + 5
nr, ni = MAN['wall']['anims']['rise']['frames'], MAN['wall']['anims']['idle']['frames']
seq = [('rise', i) for i in range(nr)] + [('idle', i) for i in range(ni)] * 3
dur = [round(1000 / MAN['wall']['anims'][an]['fps']) for an, _ in seq] + [500]
st = []
for an, i in seq:
    parts = [(anims[n][an][i], (xs[n], gy - MAN[n]['anchor'][1])) for n in names]
    parts.append((CHAR, (cxw - CHAR_X0, gy - CHAR_FEET[1])))
    st.append(parts)
st += [[(CHAR, (cxw - CHAR_X0, gy - CHAR_FEET[1]))]]
fr = gif_frames(st, (W, H))
save((fr[0], fr[1:], dur), 'vfx-lightning-v3-walls.gif')

# The fly loops (the stream as 3 tiles + its head) and the hit, all at 12 fps: the loops play
# three times while the hit plays once and the ground stays empty after it.
fl = {n: frames(n)['fly'] for n in ['bolt', 'breath', 'sphere', 'slash', 'multi', 'stream', 'stream_head']}
ht = frames('hit')['hit']
nf = len(fl['bolt']) * 3
order = ['bolt', 'sphere', 'slash', 'multi', 'breath']
xs, x = {}, 5
for n in order:
    xs[n] = x; x += MAN[n]['frameW'] + 8
xh = x
x += MAN['hit']['frameW'] + 8
rowH = max([MAN[n]['frameH'] for n in order] + [MAN['hit']['frameH']])
sw = MAN['stream']['frameW'] * 3 + MAN['stream_head']['frameW']
W, H = max(x, sw + 10), rowH + MAN['stream']['frameH'] + 20
st = []
for i in range(nf):
    parts = [(fl[n][i % len(fl[n])], (xs[n], 5 + (rowH - MAN[n]['frameH']) // 2)) for n in order]
    if i < len(ht): parts.append((ht[i], (xh, 5 + (rowH - MAN['hit']['frameH']) // 2)))
    y = rowH + 12
    for k in range(3): parts.append((fl['stream'][i % len(fl['stream'])], (5 + k * MAN['stream']['frameW'], y)))
    parts.append((fl['stream_head'][i % len(fl['stream_head'])], (5 + 3 * MAN['stream']['frameW'], y)))
    st.append(parts)
fr = gif_frames(st, (W, H))
save((fr[0], fr[1:], [round(1000 / MAN['bolt']['anims']['fly']['fps'])] * len(fr)), 'vfx-lightning-v3-loops.gif')

# The aura over our character, three times round.
a = MAN['aura']; au = frames('aura')['idle']
st = []
for i in range(len(au) * 3):
    st.append([(CHAR, (5 + a['anchor'][0] - CHAR_FEET[0], 5 + a['anchor'][1] - CHAR_FEET[1])), (au[i % len(au)], (5, 5))])
fr = gif_frames(st, (a['frameW'] + 10, a['frameH'] + 10), 3)
save((fr[0], fr[1:], [round(1000 / a['anims']['idle']['fps'])] * len(fr)), 'vfx-lightning-v3-aura.gif')
print('review images written')
