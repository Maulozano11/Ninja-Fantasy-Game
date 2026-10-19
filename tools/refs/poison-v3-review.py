"""Review images and checks for vfx_poison_v3.

    python3 -I tools/refs/poison-v3-review.py <art2> <srcDir> <character.png> [--only-check] [--look <dir>]

Reads <art2>/staging/vfx_poison_v3 (PNGs + manifest), his crops at game scale in <srcDir>/his-*.png
(written by tools/refs/poison-from-ref.py as its review folder) and our character at 1x
(<character.png>: kit characterRef(), feet at 64,120), and writes into <art2>:
  vfx-poison-v3-compare.png   his crop next to our key frame at the same scale (3x), every sprite
  vfx-poison-v3-anims.png     every animation as frame strips (2x)
  vfx-poison-v3-blast.gif, vfx-poison-v3-walls.gif, vfx-poison-v3-aura.gif (each at its anim fps)
  vfx-poison-v3-border.txt    the border check over every frame
  vfx-poison-v3-flash.txt     the flash check: each frame's light (mean alpha x brightness)
With --look it also writes each sprite's animations at 3x on dark and grass into <dir>.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ART2, SRC, CHAR_PNG = sys.argv[1], sys.argv[2], sys.argv[3]
ONLY_CHECK = '--only-check' in sys.argv
LOOK = sys.argv[sys.argv.index('--look') + 1] if '--look' in sys.argv else None
G = os.path.join(ART2, 'staging', 'vfx_poison_v3')
MAN = json.load(open(os.path.join(G, 'manifest.json')))['sprites']

BG = (21, 21, 29)
PANEL = (31, 33, 46)
EDGE = (44, 46, 58)
INK = (201, 203, 214)
DIM = (125, 128, 146)
ACCENT = (166, 224, 90)
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


def write(path, s):
    tmp = path + '.part'
    with open(tmp, 'w') as fh:
        fh.write(s + '\n')
    os.replace(tmp, path)


# --- checks ------------------------------------------------------------------------------------

def border_check():
    lines, bad = [], 0
    for name, anims in ALL.items():
        if name == 'beast':
            continue
        for anim, fr in anims.items():
            for i, f in enumerate(fr):
                a = np.asarray(f)[..., 3]
                if name == 'stream':
                    continue  # the tile wraps by design
                sides = {'top': a[0], 'bottom': a[-1], 'left': a[:, 0], 'right': a[:, -1]}
                if name == 'stream_head':
                    sides.pop('left')  # the joint with the last tile
                hits = {k: int((v > 0).sum()) for k, v in sides.items() if (v > 0).any()}
                if hits:
                    bad += 1
                    lines.append(f'  FAIL {name} {anim} frame {i}: {hits}')
    n = sum(len(fr) for nm, an in ALL.items() if nm != 'beast' for fr in an.values())
    lines.insert(0, f'border check: {n} frames of {len(ALL) - 1} sprites (beast is the approved cobra copied through unchanged; stream tiles wrap; stream_head left = joint)')
    lines.append(f'  {"OK: no pixel with any alpha on any frame border" if not bad else str(bad) + " frames touch the border"}')
    return '\n'.join(lines)


def energy(f):
    a = np.asarray(f).astype(np.float64)
    return float((a[..., 3] / 255 * (0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]) / 255).mean())


def flash_check():
    """The light of every frame (mean of alpha x brightness) and, per animation, the biggest step
    between neighbouring frames as a share of the animation's brightest frame (loops include the
    wrap), and any frame brighter than both neighbours by more than 10 % of the peak (a pop)."""
    lines = ['flash check: light per frame = mean of alpha x brightness (x1000); max step between neighbours as % of the peak (loops include the wrap)']
    worst = {}
    for name, anims in ALL.items():
        if name == 'beast':
            continue
        for anim, fr in anims.items():
            E = [energy(f) for f in fr]
            peak = max(E)
            loop = MAN[name]['anims'][anim]['loop']
            pairs = list(zip(E, E[1:])) + ([(E[-1], E[0])] if loop else [])
            step = max(abs(b - a) for a, b in pairs) / peak
            pops = [i for i in range(1, len(E) - 1) if E[i] - max(E[i - 1], E[i + 1]) > 0.10 * peak]
            worst[(name, anim)] = step
            lines.append(f'  {name:11s} {anim:5s} {len(E):2d}f  max step {step * 100:4.1f} %  ' + ('POP at ' + str(pops) if pops else 'no pop') + '  [' + ' '.join(f'{e * 1000:.1f}' for e in E) + ']')
    loops = [v for (n, a), v in worst.items() if MAN[n]['anims'][a]['loop']]
    lines.append(f'  loops: worst step {max(loops) * 100:.1f} % of the peak')
    return '\n'.join(lines)


def enclosed(a, thr=128):
    """Pixels with alpha under thr that the outside cannot reach (4-way through such pixels)."""
    open_ = a < thr
    H, W = a.shape
    seen = np.zeros_like(open_)
    st = [(y, x) for x in range(W) for y in (0, H - 1) if open_[y, x]] + [(y, x) for y in range(H) for x in (0, W - 1) if open_[y, x]]
    for y, x in st:
        seen[y, x] = True
    while st:
        y, x = st.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            u, v = y + dy, x + dx
            if 0 <= u < H and 0 <= v < W and open_[u, v] and not seen[u, v]:
                seen[u, v] = True
                st.append((u, v))
    return open_ & ~seen


def holes_check():
    """His stone is solid: enclosed see-through pixels (alpha < 128) on every rise and idle frame
    of the three walls."""
    lines, bad = ['holes check: enclosed see-through pixels (alpha < 128, not reachable from outside) per frame'], 0
    for name in ('wall', 'wall_diag'):
        for anim, fr in ALL[name].items():
            n = [int(enclosed(np.asarray(f)[..., 3]).sum()) for f in fr]
            bad += sum(1 for v in n if v)
            lines.append(f'  {name:10s} {anim:4s} {n}')
    lines.append('  OK: no see-through pixel in the stone on any frame of wall and wall_diag' if not bad else f'  {bad} frames have see-through pixels')
    # The blast: the ground must never show through the middle of the effect (the pool round the
    # moving pillar's foot above all). Also counted against a threshold scaled by the frame's own
    # opacity (its strongest alpha), so a hole in a fading frame is caught too.
    bb = 0
    for anim, fr in ALL['blast'].items():
        n = [int(enclosed(np.asarray(f)[..., 3]).sum()) for f in fr]
        ns = [int(enclosed(np.asarray(f)[..., 3], max(8, int(0.98 * np.asarray(f)[..., 3].max()))).sum()) for f in fr]
        bb += sum(1 for v in n + ns if v)
        lines.append(f'  blast      {anim:4s} {n}')
        lines.append(f'  blast      {anim:4s} {ns}  (alpha under 98 % of the frame\'s strongest)')
    lines.append('  OK: no enclosed see-through pixel on any blast frame' if not bb else f'  {bb} blast frames have enclosed see-through pixels')
    # wall_depth is OURS (kept as the owner asked): our mist curtain has a few thin-gas pinholes by
    # design; they are listed for information, and must be the same as in our old vfx_poison frames.
    for anim, fr in ALL['wall_depth'].items():
        n = [int(enclosed(np.asarray(f)[..., 3]).sum()) for f in fr]
        lines.append(f'  wall_depth {anim:4s} {n}  (ours, not stone: thin mist pinholes, as in our old frames)')
    return '\n'.join(lines)


def light_holes(f, rgb):
    """The blast light check (the same rule the generator's build check uses): pixels darker than half
    the light round them, a hole in the light and not its own outer edge. A pixel counts when it is
    not slime (alpha under 200), the strongest pixel of the light's own colour within 3 px is alpha 24
    or more and over twice its alpha, and along some direction (across, down or a diagonal) there is
    something over twice its alpha (light or slime) on both sides of it within 3 px."""
    a = np.asarray(f).astype(int)
    al = a[..., 3]
    H, W = al.shape
    lit = np.where((al > 0) & (np.abs(a[..., 0] - rgb[0]) <= 3) & (np.abs(a[..., 1] - rgb[1]) <= 3) & (np.abs(a[..., 2] - rgb[2]) <= 3), al, 0)
    S = np.where(al >= 200, 255, al)

    def sh(m, dy, dx):
        o = np.zeros_like(m)
        o[max(dy, 0):H + min(dy, 0), max(dx, 0):W + min(dx, 0)] = m[max(-dy, 0):H + min(-dy, 0), max(-dx, 0):W + min(-dx, 0)]
        return o
    m = np.zeros_like(al)
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            if (dy or dx) and dy * dy + dx * dx <= 9:
                m = np.maximum(m, sh(lit, dy, dx))
    br = np.zeros(al.shape, bool)
    for d in ((0, 1), (1, 0), (1, 1), (1, -1)):
        sp = np.zeros_like(al)
        sn = np.zeros_like(al)
        for k in (1, 2, 3):
            sp = np.maximum(sp, sh(S, d[0] * k, d[1] * k))
            sn = np.maximum(sn, sh(S, -d[0] * k, -d[1] * k))
        br |= (sp > 2 * al) & (sn > 2 * al)
    return (al < 200) & (m >= 24) & (2 * al < m) & br


def light_rgb():
    import re
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'world-sprites', 'vfx-poison-v3-refdata.ts')).read()
    h = re.search(r'"rgb": "#([0-9a-f]{6})"', src).group(1)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def blast_light_check():
    """No hole in the blast's light on any frame. His own picture (frame 4) has a few pixels the rule
    counts (a drop's dark JPEG halo, a dark column beside the pool's foot): they are listed apart, and
    exempt on another frame only at the same place."""
    rgb = light_rgb()
    fr = ALL['blast']['blast']
    his = light_holes(fr[4], rgb)
    lines, bad = [f'blast light holes (pixels darker than half the light within 3 px, light colour #{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}):'], 0
    counts, own = [], []
    for f in fr:
        h = light_holes(f, rgb)
        counts.append(int((h & ~his).sum()))
        own.append(int((h & his).sum()))
    bad = sum(1 for v in counts if v)
    lines.append(f'  blast      blast {counts}')
    lines.append(f'  his own picture where it stands (frame 4\'s own pixels, at the same place): {own}')
    lines.append('  OK: no hole in the light on any blast frame' if not bad else f'  {bad} blast frames have holes in the light')
    return '\n'.join(lines)


def aura_check():
    """The aura's two layers together (back + front, no character): enclosed see-through pockets
    (alpha 60 or less) per frame, and his pale-lime highlights on the green strands, whole (their
    7 px matched at some offset) on every frame."""
    B, F = ALL['aura_back']['idle'], ALL['aura']['idle']
    pk = []
    for b, f in zip(B, F):
        c = b.copy()
        c.alpha_composite(f)
        pk.append(int(enclosed(np.asarray(c)[..., 3], 61).sum()))
    lines = [f'aura pockets: enclosed see-through px (alpha 60 or less) in back + front, per frame: {pk}']
    f0 = np.asarray(B[0]).astype(int)
    L0 = 0.3 * f0[..., 0] + 0.59 * f0[..., 1] + 0.11 * f0[..., 2]
    # (his highlights: pieces of 12 px or less of his bright pixels (brightness 135 or more) holding
    # his brightest colour #e6fcb9, as the generator lifts them out)
    bright = (L0 >= 135) & (f0[..., 3] > 0)
    H, W = bright.shape
    lab = np.zeros((H, W), int)
    n = 0
    for y0 in range(H):
        for x0 in range(W):
            if not bright[y0, x0] or lab[y0, x0]:
                continue
            n += 1
            st, pc = [(y0, x0)], []
            lab[y0, x0] = n
            while st:
                y, x = st.pop()
                pc.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        v, u = y + dy, x + dx
                        if 0 <= v < H and 0 <= u < W and bright[v, u] and not lab[v, u]:
                            lab[v, u] = n
                            st.append((v, u))
            if len(pc) > 12 or not any(tuple(f0[y, x, :3]) == (0xe6, 0xfc, 0xb9) for y, x in pc):
                continue
            pat = [(x, y, tuple(f0[y, x, :3])) for y, x in pc]
            x, y = min(p[0] for p in pat), min(p[1] for p in pat)
            res = []
            for b in B:
                a = np.asarray(b).astype(int)
                best = max(sum(1 for xx, yy, cc in pat if tuple(a[yy + oy, xx + ox, :3]) == cc) for oy in range(-6, 7) for ox in range(-6, 7))
                res.append(best)
            lines.append(f'  highlight at {x},{y} ({len(pat)} px): whole on frames {sum(1 for r in res if r == len(pat))}/{len(B)} {res}')
    return '\n'.join(lines)


def wall_top_check():
    """The straight wall's rising slime top on rise frames 3-7 (between the posts): how far its top
    row ranges, its mean distance from a straight line, and its longest flat run."""
    lines = ['wall rise: the rising slime top (x 44-248)']
    for i, f in enumerate(ALL['wall']['rise']):
        if i < 3 or i > 7:
            continue
        a = np.asarray(f).astype(int)
        sl = (a[..., 3] >= 200) & (a[..., 1] > a[..., 0] + 30) & (a[..., 1] > a[..., 2] + 30)
        t = np.array([np.nonzero(sl[:, x])[0].min() if sl[:, x].any() else -1 for x in range(44, 249)])
        xs = np.arange(44, 249)[t >= 0]
        ts = t[t >= 0]
        A = np.vstack([xs, np.ones_like(xs)]).T
        dev = np.abs(ts - A @ np.linalg.lstsq(A, ts, rcond=None)[0]).mean()
        run = best = 1
        for k in range(1, len(ts)):
            run = run + 1 if ts[k] == ts[k - 1] else 1
            best = max(best, run)
        lines.append(f'  rise {i}: top rows range {ts.max() - ts.min()} px, line-fit deviation {dev:.1f} px, longest flat run {best} px')
    return '\n'.join(lines)


def light_check():
    """The blast's light against his: his green excess over his panel colour (G - 33) next to ours
    (key frame composited on his panel colour), where ours is light only, outside the mask of his
    removed character and its shadow, inside his panel (written by poison-from-ref.py)."""
    try:
        his = np.asarray(Image.open(os.path.join(SRC, 'his-blast.png')).convert('RGB')).astype(np.float64)
        mask = np.asarray(Image.open(os.path.join(SRC, 'mask-blast.png'))) > 0
        zone = np.asarray(Image.open(os.path.join(SRC, 'zone-blast.png'))) > 0
    except FileNotFoundError:
        return 'light check: skipped (no his-blast.png / mask-blast.png / zone-blast.png in ' + SRC + ')'
    f = np.asarray(ALL['blast']['blast'][4]).astype(np.float64)
    BGp = np.array(PANEL, np.float64)
    comp = f[..., :3] * f[..., 3:] / 255 + BGp * (1 - f[..., 3:] / 255)
    rm = json.load(open(os.path.join(SRC, 'refmap.json')))['blast']
    xs = rm['box'][0] + (np.arange(f.shape[1]) + 0.5) * (rm['box'][2] - rm['box'][0]) / f.shape[1]
    sel = (f[..., 3] > 0) & (f[..., 3] < 250) & ~mask & zone & (xs[None, :] <= 579)
    d = np.abs((comp[..., 1] - 33) - (his[..., 1] - 33))[sel]
    return (f'light check (blast key frame vs his, green excess G - 33, {int(sel.sum())} px of his light outside his character and its shadow): '
            f'mean |diff| {d.mean():.2f}, 90th percentile {np.percentile(d, 90):.1f} (target: mean under 8)')


B = border_check() + '\n' + holes_check() + '\n' + aura_check() + '\n' + wall_top_check()
F = flash_check() + '\n' + light_check() + '\n' + blast_light_check()
print(B)
print(F)
write(os.path.join(ART2, 'vfx-poison-v3-border.txt'), B)
write(os.path.join(ART2, 'vfx-poison-v3-flash.txt'), F)
if ONLY_CHECK:
    sys.exit(0)

# --- helpers ------------------------------------------------------------------------------------

CHAR1 = Image.open(CHAR_PNG).convert('RGBA')  # feet (64, 120)


def up(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


CHAR = up(CHAR1, 2)
CHAR_FEET = (128, 240)


def panel(can, x, y, w, h, fill=PANEL):
    ImageDraw.Draw(can).rectangle([x - 1, y - 1, x + w, y + h], outline=EDGE, fill=fill)


def text(can, x, y, s, col=INK):
    ImageDraw.Draw(can).text((x, y), s, fill=col, font=FONT)


def info(name):
    m = MAN[name]
    return f"{m['frameW']}x{m['frameH']}  " + ', '.join(f"{k} {a['frames']}f {a['fps']}fps {'loop' if a['loop'] else 'once'}" for k, a in m['anims'].items())


def keyframe(name):
    a = ALL[name]
    if name == 'hit':
        return a['hit'][3]
    if name == 'blast':
        return a['blast'][4]
    if 'idle' in a:
        return a['idle'][0]
    return list(a.values())[0][0]


def aura_comp(i=0, k=2, bg=PANEL):
    """aura_back, our character (feet on the anchor), aura on top, at k x."""
    m = MAN['aura']
    w, h = m['frameW'], m['frameH']
    can = Image.new('RGBA', (w * k, h * k), bg + (255,))
    can.alpha_composite(up(ALL['aura_back']['idle'][i], k))
    can.alpha_composite(up(CHAR1, k), (m['anchor'][0] * k - 64 * k, m['anchor'][1] * k - 120 * k))
    can.alpha_composite(up(ALL['aura']['idle'][i], k))
    return can


def on(im, bg):
    c = Image.new('RGBA', im.size, bg + (255,))
    c.alpha_composite(im)
    return c


# --- 1. his crop next to ours --------------------------------------------------------------------------

def compare_sheet():
    K = 3
    items = ['bolt', 'stream', 'stream_head', 'breath', 'sphere', 'slash', 'multi', 'hit', 'blast', 'wall', 'wall_diag', 'wall_depth', 'aura']
    cards = []
    for n in items:
        if n == 'wall_depth':
            f = keyframe(n)
            cards.append((n, [('OURS (KEPT OURS, AS ASKED)', f), ('ON GRASS', on(f, GRASS))]))
            continue
        his = Image.open(os.path.join(SRC, f'his-{n}.png')).convert('RGBA')
        if n == 'aura':
            parts = [('HIS', his), ('OURS: BACK + CHARACTER + FRONT', aura_comp(0, 1)), ('ON GRASS', aura_comp(0, 1, GRASS))]
        else:
            f = keyframe(n)
            parts = [('HIS', his), ('OURS', f), ('ON GRASS', on(f, GRASS))]
        cards.append((n, parts))
    pad, gap = 16, 20
    rows, cur, curw = [], [], 0
    maxw = 2600
    for c in cards:
        w = sum(p[1].width * K + 8 for p in c[1])
        if cur and curw + w > maxw:
            rows.append(cur)
            cur, curw = [], 0
        cur.append(c)
        curw += w + gap
    rows.append(cur)
    W = max(sum(sum(p[1].width * K + 8 for p in c[1]) + gap for c in r) for r in rows) + pad * 2
    H = sum(max(max(p[1].height for p in c[1]) * K for c in r) + 44 for r in rows) + pad * 2 + 20
    can = Image.new('RGBA', (W, H), BG + (255,))
    text(can, pad, 6, "POISON V3: HIS CROP (HIS SHEET AT GAME SCALE: 1.0 x 0.98 OF HIS PX; THE STREAM 0.971 ACROSS) NEXT TO OUR KEY FRAME, SAME FRAME AND ANCHOR, 3X.  WALL_DEPTH: KEPT OURS, AS ASKED.", INK)
    y = pad + 16
    for r in rows:
        x = pad
        rh = max(max(p[1].height for p in c[1]) * K for c in r)
        for n, parts in r:
            text(can, x, y, n.upper() + '   ' + info(n), ACCENT)
            xx = x
            for lab, im in parts:
                text(can, xx, y + 13, lab, DIM)
                panel(can, xx, y + 28, im.width * K, im.height * K, GRASS if lab == 'ON GRASS' else PANEL)
                can.alpha_composite(up(im, K), (xx, y + 28))
                xx += im.width * K + 8
            x = xx + gap
        y += rh + 44
    can.convert('RGB').save(os.path.join(ART2, 'vfx-poison-v3-compare.png'))


# --- 2. every animation --------------------------------------------------------------------------

def anim_sheet():
    K = 2
    pad, gap = 16, 18
    cards = []
    for n in MAN:
        if n == 'beast':
            continue
        for anim, fr in ALL[n].items():
            a = MAN[n]['anims'][anim]
            cards.append((f"{n.upper()} - {anim.upper()} {len(fr)}F {a['fps']}FPS {'LOOP' if a['loop'] else 'ONCE'} - {fr[0].width}x{fr[0].height}  ANCHOR {MAN[n]['anchor'][0]},{MAN[n]['anchor'][1]}", fr, MAN[n]['anchor']))
    maxw = 3000
    lays = []
    for lab, fr, anc in cards:
        fw, fh = fr[0].width * K, fr[0].height * K
        per = max(1, min(len(fr), (maxw - pad * 2) // (fw + 6)))
        nrow = -(-len(fr) // per)
        lays.append((lab, fr, anc, per, nrow, fw, fh, per * (fw + 6) - 6, nrow * (fh + 6) + 16))
    place, x, y, rowh = [], pad, pad + 18, 0
    for L in lays:
        w, h = L[7], L[8]
        if x > pad and x + w > maxw - pad:
            x, y, rowh = pad, y + rowh + gap, 0
        place.append((L, x, y))
        x += w + gap
        rowh = max(rowh, h)
    can = Image.new('RGBA', (maxw, y + rowh + pad), BG + (255,))
    text(can, pad, 6, 'VFX_POISON_V3 - EVERY ANIMATION, 2X (YELLOW DOT = ANCHOR; AURA = FRONT LAYER, AURA_BACK = BACK LAYER)', INK)
    d = ImageDraw.Draw(can)
    for (lab, fr, anc, per, nrow, fw, fh, w, h), x, y in place:
        text(can, x, y, lab, DIM)
        for i, f in enumerate(fr):
            fx = x + (i % per) * (fw + 6)
            fy = y + 14 + (i // per) * (fh + 6)
            panel(can, fx, fy, fw, fh)
            can.alpha_composite(up(f, K), (fx, fy))
            d.rectangle([fx + anc[0] * K, fy + anc[1] * K, fx + anc[0] * K + 1, fy + anc[1] * K + 1], fill=(255, 220, 0))
    can.convert('RGB').save(os.path.join(ART2, 'vfx-poison-v3-anims.png'))


# --- 3. GIFs -----------------------------------------------------------------------------------------

def save_gif(frames_, path, ms):
    pal_frames = [f.convert('RGB').quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for f in frames_]
    tmp = path + '.part.gif'
    pal_frames[0].save(tmp, save_all=True, append_images=pal_frames[1:], duration=ms, loop=0, disposal=2)
    os.replace(tmp, path)


def blast_gif():
    K = 2
    m = MAN['blast']
    w, h = m['frameW'] * K + CHAR.width // 2 + 40, m['frameH'] * K
    out = []
    seq = ALL['blast']['blast'] + [None] * 6
    for f in seq:
        can = Image.new('RGBA', (w, h), PANEL + (255,))
        can.alpha_composite(CHAR, (m['frameW'] * K + 6 - 40, m['anchor'][1] * K - CHAR_FEET[1]))
        if f is not None:
            can.alpha_composite(up(f, K), (0, 0))
        out.append(can)
    save_gif(out, os.path.join(ART2, 'vfx-poison-v3-blast.gif'), 83)


def walls_gif():
    K = 2
    names = ['wall', 'wall_diag', 'wall_depth']
    W = sum(MAN[n]['frameW'] * K for n in names) + 24 * len(names) + 140
    above = max(MAN[n]['anchor'][1] * K for n in names)
    below = max((MAN[n]['frameH'] - MAN[n]['anchor'][1]) * K for n in names)
    nr, ni = len(ALL['wall']['rise']), len(ALL['wall']['idle'])
    seq = [('rise', i) for i in range(nr)] + [('idle', i % ni) for i in range(ni * 3)]
    out = []
    for anim, i in seq:
        can = Image.new('RGBA', (W, above + below), PANEL + (255,))
        x = 0
        for n in names:
            m = MAN[n]
            can.alpha_composite(up(ALL[n][anim][i], K), (x, above - m['anchor'][1] * K))
            x += m['frameW'] * K + 24
        can.alpha_composite(CHAR, (x - 60, above - CHAR_FEET[1]))
        out.append(can)
    save_gif(out, os.path.join(ART2, 'vfx-poison-v3-walls.gif'), [83] * nr + [100] * (ni * 3))


def aura_gif():
    n = len(ALL['aura']['idle'])
    out = [aura_comp(i % n, 3) for i in range(n * 2)]
    save_gif(out, os.path.join(ART2, 'vfx-poison-v3-aura.gif'), 100)


if LOOK:
    # Zoomed strips for iterating: each sprite's animations at 3x on dark and grass.
    os.makedirs(LOOK, exist_ok=True)
    for n in MAN:
        if n == 'beast':
            continue
        rows = []
        for anim, fr in ALL[n].items():
            for bg in (PANEL, GRASS):
                row = Image.new('RGBA', ((fr[0].width + 2) * len(fr), fr[0].height), (0, 0, 0, 255))
                for i, f in enumerate(fr):
                    row.alpha_composite(on(f, bg), (i * (f.width + 2), 0))
                rows.append(row)
        Wd = max(r.width for r in rows)
        can = Image.new('RGBA', (Wd, sum(r.height + 2 for r in rows)), (0, 0, 0, 255))
        yy = 0
        for r in rows:
            can.alpha_composite(r, (0, yy))
            yy += r.height + 2
        k = 3 if Wd * 3 <= 3000 else 2 if Wd * 2 <= 4000 else 1
        up(can, k).convert('RGB').save(os.path.join(LOOK, f'{n}.png'))
    sys.exit(0)

compare_sheet()
anim_sheet()
blast_gif()
walls_gif()
aura_gif()
print('review images written')
