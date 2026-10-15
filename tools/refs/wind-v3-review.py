"""Review sheets for the wind set v3 (vfx_wind_v3), after the generator has run.

    python3 -I tools/refs/wind-v3-review.py <art2>

Reads <art2>/staging/vfx_wind_v3 (PNGs + manifest), his paint-over <art2>/REF-wind-set-owner.jpg,
our 2x wind sheet <art2>/vfx-wind.png (for our character) and tools/world-sprites/vfx-wind-v3-refdata.ts
(where each sprite sits in his sheet), and writes into <art2>:
  vfx-wind-v3.png          every key frame at 2x in his layout, labelled, with our character for scale
  vfx-wind-v3-compare.png  his panel at game scale beside ours, same scale (2x), sprite by sprite
  vfx-wind-v3-anims.png    every animation as frame strips at 2x
  vfx-wind-v3-blast.gif    the blast at 2x, our character beside it
  vfx-wind-v3-walls.gif    the three walls at 2x: rise, then the idle loop three times (each at its fps)
Every file is written whole (temp name, then rename). Deterministic.
"""
import json, os, re, sys
import numpy as np
from PIL import Image

ART2 = sys.argv[1]
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STAGE = os.path.join(ART2, 'staging', 'vfx_wind_v3')
MAN = json.load(open(os.path.join(STAGE, 'manifest.json')))['sprites']
REF = Image.open(os.path.join(ART2, 'REF-wind-set-owner.jpg')).convert('RGB')
OURS = np.asarray(Image.open(os.path.join(ART2, 'vfx-wind.png')).convert('RGBA'))
TS = open(os.path.join(REPO, 'tools', 'world-sprites', 'vfx-wind-v3-refdata.ts')).read()
SRC = json.loads(re.search(r'export const WV3_SRC[^=]*= (\{.*\});', TS).group(1))
REFW = json.loads(re.search(r'export const WV3_REF[^=]*= (\{.*\});', TS).group(1))

BG = (21, 21, 29, 255)        # his sheet background
PANEL = (32, 32, 42, 255)     # his panel fill
EDGE = (44, 46, 58, 255)
INK = (201, 203, 214, 255)
DIM = (125, 128, 146, 255)
ACCENT = (146, 216, 180, 255)

def save(img, path):
    tmp = path + '.part'
    img.save(tmp, format='GIF' if path.endswith('.gif') else 'PNG', **({} if not path.endswith('.gif') else {}))
    os.replace(tmp, path)

# --- the 3x5 pixel font of the review sheets -----------------------------------------------------------
GLYPHS = {
    'A': '010101111101101', 'B': '110101110101110', 'C': '011100100100011', 'D': '110101101101110', 'E': '111100110100111',
    'F': '111100110100100', 'G': '011100101101011', 'H': '101101111101101', 'I': '111010010010111', 'J': '001001001101010',
    'K': '101101110101101', 'L': '100100100100111', 'M': '101111111101101', 'N': '110101101101101', 'O': '010101101101010',
    'P': '110101110100100', 'Q': '010101101110011', 'R': '110101110101101', 'S': '011100010001110', 'T': '111010010010010',
    'U': '101101101101111', 'V': '101101101101010', 'W': '101101111111101', 'X': '101101010101101', 'Y': '101101010010010',
    'Z': '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
    '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111',
    '9': '111101111001110', ' ': '000000000000000', '-': '000000111000000', '.': '000000000000010', ':': '000010000010000',
    '/': '001001010100100', '(': '010100100100010', ')': '010001001001010', '_': '000000000000111', 'x': '000101010101000',
    ',': '000000000010100', '+': '000010111010000', '=': '000111000111000', "'": '010010000000000', '>': '100010001010100',
    '@': '010101111100011',
}

def text(img, x, y, s, col):
    px = img.load()
    for ch in s:
        g = GLYPHS.get(ch, GLYPHS.get(ch.upper(), GLYPHS[' ']))
        for i in range(15):
            if g[i] == '1':
                X, Y = x + i % 3, y + i // 3
                if 0 <= X < img.width and 0 <= Y < img.height: px[X, Y] = col
        x += 4
    return x

def tw(s): return len(s) * 4

# --- our sprites -------------------------------------------------------------------------------------------
def frames(name, anim):
    m = MAN[name]; a = m['anims'][anim]
    sheet = Image.open(os.path.join(STAGE, m['file'])).convert('RGBA')
    fw, fh = m['frameW'], m['frameH']
    return [sheet.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh)) for i in range(a['frames'])]

def info(name):
    m = MAN[name]
    an = ', '.join(f"{k} {a['frames']}f {a['fps']}fps {'loop' if a['loop'] else 'once'}" for k, a in m['anims'].items())
    return f"{m['frameW']}x{m['frameH']}  anchor {m['anchor'][0]},{m['anchor'][1]}  {an}"

KEY = {'hit': ('hit', 3), 'blast': ('blast', 5), 'wall': ('idle', 0), 'wall_diag': ('idle', 0), 'wall_depth': ('idle', 0), 'aura': ('idle', 0), 'aura_back': ('idle', 0)}
def key(name):
    anim, i = KEY.get(name, (next(iter(MAN[name]['anims'])), 0))
    return frames(name, anim)[i]

# --- our character, cropped from our 2x wind sheet (the wall panel) -----------------------------------------
def our_character():
    c = OURS[700:910, 615:741].astype(int)
    fill = np.array([32, 33, 43])
    a = (np.abs(c[..., :3] - fill).sum(-1) > 12)
    c1 = c[::2, ::2].copy(); a1 = a[::2, ::2]
    out = np.zeros(c1.shape, np.uint8)
    out[a1] = c1[a1].astype(np.uint8); out[a1, 3] = 255
    im = Image.fromarray(out, 'RGBA')
    bb = im.getbbox()
    im = im.crop(bb)
    return im
# Our character (kit characterRef: bounds x 27-82, y 27-122 of its 128 px canvas, feet at (64, 120)):
# the feet are 37 px right of its left edge and its soles 2 px below the ground line.
CHAR = our_character()
FEET_X, SOLE = 37, 2
assert CHAR.size == (56, 96), CHAR.size

def place_char(canvas, gx, gy):
    """Our character with the soles SOLE px below ground row gy, its left edge at gx (canvas px, 1x)."""
    canvas.alpha_composite(CHAR, (int(gx), int(gy + SOLE - CHAR.height + 1)))

def panel(img, x, y, w, h):
    img.paste(EDGE, (x - 1, y - 1, x + w + 1, y + h + 1))
    img.paste(PANEL, (x, y, x + w, y + h))

def x2(img): return img.resize((img.width * 2, img.height * 2), Image.NEAREST)

# --- 1. the overview in his layout ----------------------------------------------------------------------------
ROWS = [['bolt', 'beast', 'stream', 'breath', 'sphere'], ['slash', 'multi', 'hit', 'blast'], ['wall', 'wall_diag'], ['wall_depth', 'aura']]
LABEL = {'stream': 'STREAM x2 + STREAM_HEAD', 'aura': 'AURA_BACK + CHARACTER + AURA', 'beast': 'BEAST'}

def card(name):
    """A card at 1x: label lines, a panel, the art; returns (image)."""
    if name == 'beast':
        w, h = 90, 60
        img = Image.new('RGBA', (max(w, 120), h + 16), BG)
        text(img, 0, 0, 'BEAST', ACCENT); text(img, 0, 7, 'OUT OF SCOPE: COPIED UNCHANGED', DIM)
        panel(img, 0, 14, w, h)
        text(img, 4, 30, 'THE CRANE IS DONE', DIM); text(img, 4, 37, 'IN VFX_BEASTS', DIM)
        return img
    if name == 'stream':
        t, hd = key('stream'), key('stream_head')
        ma, mh = MAN['stream']['anchor'], MAN['stream_head']['anchor']
        H = max(t.height, hd.height)
        art = Image.new('RGBA', (2 * t.width + hd.width, H), (0, 0, 0, 0))
        oy = 0
        for k in range(2): art.alpha_composite(t, (k * t.width, oy))
        art.alpha_composite(hd, (2 * t.width, oy + ma[1] - mh[1]))
        lines = [LABEL['stream'], f"TILE {info('stream')}", f"HEAD {info('stream_head')}"]
    elif name == 'aura':
        f, b = key('aura'), key('aura_back')
        ax, ay = MAN['aura']['anchor']
        art = Image.new('RGBA', f.size, (0, 0, 0, 0))
        art.alpha_composite(b)
        cb = CHAR.getbbox()
        art.alpha_composite(CHAR, (ax - FEET_X, ay + SOLE - CHAR.height + 1))
        art.alpha_composite(f)
        lines = [LABEL['aura'], info('aura'), 'AURA_BACK SAME FRAME AND ANCHOR (DRAWN BEHIND)']
    else:
        art = key(name)
        lines = [name.upper(), info(name)]
        if name in ('blast', 'wall', 'wall_diag', 'wall_depth'):
            ax, ay = MAN[name]['anchor']
            ext = Image.new('RGBA', (art.width + CHAR.width + 6, max(art.height, ay + SOLE + 1)), (0, 0, 0, 0))
            ext.alpha_composite(art)
            place_char(ext, art.width + 4, ay)
            art = ext
    w = max(art.width, max(tw(l) for l in lines))
    img = Image.new('RGBA', (w, art.height + 7 * len(lines) + 2), BG)
    for i, l in enumerate(lines): text(img, 0, i * 7, l, ACCENT if i == 0 else DIM)
    top = 7 * len(lines)
    panel(img, 0, top, art.width, art.height)
    img.alpha_composite(art, (0, top))
    return img

def overview(path):
    cards = [[card(n) for n in row] for row in ROWS]
    gap, pad = 12, 10
    W = max(sum(c.width for c in r) + gap * (len(r) - 1) for r in cards) + 2 * pad
    H = sum(max(c.height for c in r) for r in cards) + gap * (len(cards) - 1) + 2 * pad + 16
    img = Image.new('RGBA', (W, H), BG)
    text(img, pad, pad, 'WIND V3   GROUP VFX_WIND_V3   15 SPRITES   (SHOWN 2X, KEY FRAME = HIS PAINT-OVER)', INK)
    y = pad + 16
    for r in cards:
        x = pad
        for c in r:
            img.alpha_composite(c, (x, y)); x += c.width + gap
        y += max(c.height for c in r) + gap
    save(x2(img), path)

# --- 2. his panel beside ours -----------------------------------------------------------------------------------
def his_crop(name, w, h):
    s = SRC[name]
    sx = s.get('sx', s['s'])
    return REF.resize((w, h), Image.BOX, box=(s['x'], s['y'], s['x'] + w * sx, s['y'] + h * s['s'])).convert('RGBA')

def compare(path):
    items = []
    for name in ['bolt', 'stream', 'breath', 'sphere', 'slash', 'multi', 'hit', 'blast', 'wall', 'wall_diag', 'wall_depth', 'aura']:
        if name == 'stream':
            # His whole jet; ours: two tiles then the head, the head's joint where his head starts.
            s = SRC['stream']; ph = SRC['stream_head']
            W = REFW['stream_head']['w'] + 64 * 2 + 4; H = REFW['stream']['h']
            x0 = ph['x'] - 128 * s['s']
            his = REF.resize((W, H), Image.BOX, box=(x0, s['y'], x0 + W * s['s'], s['y'] + H * s['s'])).convert('RGBA')
            ours = Image.new('RGBA', (W, H), PANEL)
            t, hd = key('stream'), key('stream_head')
            ma, mh = MAN['stream']['anchor'], MAN['stream_head']['anchor']
            ry = REFW['stream']['anchor'][1] - ma[1]
            for k in range(2): ours.alpha_composite(t, (k * 64, ry))
            ours.alpha_composite(hd, (128, REFW['stream_head']['anchor'][1] - mh[1]))
            note = 'HIS JET (TAIL INCLUDED) / OURS: TILE x2 + HEAD (THE TILE IS HIS X 64-132, PRESSED TO 64 PX)'
        else:
            r = REFW[name]
            his = his_crop(name, r['w'], r['h'])
            ma = MAN[name]['anchor']
            f = key(name)
            ox, oy = r['anchor'][0] - ma[0], r['anchor'][1] - ma[1]
            W = max(r['w'], ox + f.width) - min(0, ox); H = max(r['h'], oy + f.height) - min(0, oy)
            sh = (-min(0, ox), -min(0, oy))
            his2 = Image.new('RGBA', (W, H), PANEL); his2.alpha_composite(his, sh); his = his2
            ours = Image.new('RGBA', (W, H), PANEL)
            if name == 'aura':
                b = key('aura_back'); ours.alpha_composite(b, (ox + sh[0], oy + sh[1]))
                ours.alpha_composite(CHAR, (r['anchor'][0] + sh[0] - FEET_X, r['anchor'][1] + sh[1] + SOLE - CHAR.height + 1))
            ours.alpha_composite(f, (ox + sh[0], oy + sh[1]))
            note = 'HIS PANEL / OURS (KEY FRAME), SAME SCALE, ANCHORS ALIGNED'
        items.append((name, his, ours, note))
    pad, gap = 10, 8
    W = max(i[1].width * 2 + gap for i in items) + 2 * pad
    W = max(W, 420)
    H = sum(i[1].height + 16 for i in items) + gap * len(items) + 2 * pad + 12
    img = Image.new('RGBA', (W, H), BG)
    text(img, pad, pad, 'WIND V3 - HIS PAINT-OVER (LEFT) BESIDE OURS (RIGHT), GAME SCALE, SHOWN 2X', INK)
    y = pad + 12
    for name, his, ours, note in items:
        text(img, pad, y, name.upper(), ACCENT); text(img, pad + tw(name) + 8, y, note, DIM)
        y += 8
        panel(img, pad, y, his.width, his.height); img.alpha_composite(his, (pad, y))
        panel(img, pad + his.width + gap, y, ours.width, ours.height); img.alpha_composite(ours, (pad + his.width + gap, y))
        y += his.height + gap + 8
    save(x2(img), path)

# --- 3. every animation --------------------------------------------------------------------------------------------
def anims(path):
    rows = []
    for name, m in MAN.items():
        for k in m['anims']:
            fr = frames(name, k)
            rows.append((f"{name.upper()} - {k.upper()} {m['anims'][k]['frames']}F {m['anims'][k]['fps']}FPS {'LOOP' if m['anims'][k]['loop'] else 'ONCE'} - {m['frameW']}x{m['frameH']}", fr))
    pad, gap, maxW = 10, 3, 1500
    def layout(fr):
        fw, fh = fr[0].size
        per = max(1, min(len(fr), (maxW + gap) // (fw + gap)))
        nrow = -(-len(fr) // per)
        return per, nrow, per * (fw + gap) - gap, nrow * (fh + gap)
    W = max(max(layout(fr)[2], tw(l)) for l, fr in rows) + 2 * pad
    H = sum(layout(fr)[3] + 12 for _, fr in rows) + 2 * pad + 12
    img = Image.new('RGBA', (W, H), BG)
    text(img, pad, pad, 'WIND V3 - EVERY ANIMATION, FRAME BY FRAME (2X)', INK)
    y = pad + 12
    for l, fr in rows:
        text(img, pad, y, l, DIM); y += 8
        per, nrow, _, hh = layout(fr)
        fw, fh = fr[0].size
        for i, f in enumerate(fr):
            x = pad + (i % per) * (fw + gap); yy = y + (i // per) * (fh + gap)
            panel(img, x, yy, fw, fh); img.alpha_composite(f, (x, yy))
        y += hh + 4
    save(x2(img), path)

# --- 4. GIFs -----------------------------------------------------------------------------------------------------------
def gif(path, frames_rgba, ms=83):
    """ms: one duration for every frame, or a list (one per frame)."""
    some = frames_rgba[::max(1, len(frames_rgba) // 12)]
    pal_src = Image.new('RGB', (frames_rgba[0].width, frames_rgba[0].height * len(some)))
    for i, f in enumerate(some): pal_src.paste(f.convert('RGB'), (0, i * f.height))
    pq = pal_src.quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    qs = [f.convert('RGB').quantize(palette=pq, dither=Image.Dither.NONE) for f in frames_rgba]
    tmp = path + '.part'
    qs[0].save(tmp, format='GIF', save_all=True, append_images=qs[1:], duration=ms, loop=0, disposal=1, optimize=False)
    os.replace(tmp, path)

def stage_frame(name, f, char=True):
    ax, ay = MAN[name]['anchor']
    W = f.width + (CHAR.width + 8 if char else 0) + 8; H = max(f.height, ay + SOLE + 1) + 8
    img = Image.new('RGBA', (W, H), PANEL)
    img.alpha_composite(f, (4, 4))
    if char: place_char(img, 4 + f.width + 4, 4 + ay)
    return img

def fps(name, anim): return MAN[name]['anims'][anim]['fps']

def blast_gif(path):
    fr = frames('blast', 'blast')
    seq = [stage_frame('blast', f) for f in fr]
    blank = stage_frame('blast', Image.new('RGBA', fr[0].size, (0, 0, 0, 0)))
    ms = round(1000 / fps('blast', 'blast'))
    gif(path, [x2(f) for f in seq + [blank]], [ms] * len(seq) + [600])

def walls_gif(path):
    names = ['wall', 'wall_diag', 'wall_depth']
    seqs = []
    for n in names:
        rise, idle = frames(n, 'rise'), frames(n, 'idle')
        seqs.append([stage_frame(n, f) for f in rise + idle * 3])
    # rise at its fps, then the idle loop three times at its own fps
    ms = [round(1000 / fps('wall', 'rise'))] * len(frames('wall', 'rise')) + [round(1000 / fps('wall', 'idle'))] * (3 * len(frames('wall', 'idle')))
    H = max(s[0].height for s in seqs); W = sum(s[0].width for s in seqs) + 8 * (len(seqs) - 1)
    out = []
    for i in range(len(seqs[0])):
        img = Image.new('RGBA', (W, H), BG); x = 0
        for s in seqs:
            img.alpha_composite(s[i], (x, H - s[i].height)); x += s[i].width + 8
        out.append(x2(img))
    gif(path, out, ms)

overview(os.path.join(ART2, 'vfx-wind-v3.png'))
compare(os.path.join(ART2, 'vfx-wind-v3-compare.png'))
anims(os.path.join(ART2, 'vfx-wind-v3-anims.png'))
blast_gif(os.path.join(ART2, 'vfx-wind-v3-blast.gif'))
walls_gif(os.path.join(ART2, 'vfx-wind-v3-walls.gif'))
print('review sheets written to', ART2)
