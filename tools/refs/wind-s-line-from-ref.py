"""Lifts the owner's Gale Dragon Ray (his paint-over of our sample) into the layers the ray animates:
his twisted beam with its crescent rings and swirl strands, his wind dragon (the whole head with its
mane and long whiskers trailing back), his kanji 風 with its green flame, the dust and rocks at the
caster's feet and under the dragon, and his flying rocks and leaves.

His picture: docs/reference/aurelia-wind-s-owner-reference.jpg (2000x1116, on a night forest). We
gave him our sample (Aurelia casting, a 2 m beam, a dragon head at its front, the kanji 風); he
painted over it: "a ver copia esta ignora a aurelia o a el rayo que sale despues de la boca del
dragon". So Aurelia (AURELIA) and the ray out of the dragon's mouth (CONE) are left out.

His grid. The picture is one pixel-art canvas of 480x267 of his pixels, scaled up about 4.17 times
and saved as a JPEG: the edges between blocks repeat every PITCH picture px, with the phase
GRID_PHASE. Each of his pixels is taken back as the median of the 2x2 picture px nearest its
centre. His Aurelia stands about 96 of his pixels tall, as ours does in game px: one of his pixels
is one game px (K = 1).

The night behind it. His effect glows over his dark forest: where it is solid (his beam, rings,
dragon, kanji, dust, rocks: STRONG, and his darker pixels right against them, as his line and his
shading) it is his pixels, opaque. Round it, his glow tints the night: the forest he painted it on
is read off (BACK: the picture away from the effect, carried in under it by a widening blur), and
each glow pixel is taken as his glow colour over that forest (GLOW_TONE) at the alpha that gives his
pixel there; the colour it stands for is that alpha's (his pixel less the forest), and both are
grouped into GLOW_N colours and the ALPHAS steps the wind set's glow uses. Laid over any map, it reads
as his glow over that map. The rest of the night is left out.

What Aurelia and the cut ray hid is continued with his own pixels from the edge in: his dust behind
her (DUST_FILL), the dragon's mouth behind the ray (MOUTH_FILL).

The layers (his pixels only; nothing drawn anew), each with the glow round it:
  - beam: his beam and its rings and strands (everything solid that is no other layer).
  - dragon: his dragon (DRAGON zone, its teal pixels).
  - kanji: his kanji and its flame (KANJI zone).
  - dust_l, dust_r: his dust and the rocks in it at the caster's feet and under the dragon (DUST_L,
    DUST_R zones, his earthy pixels).
  - debris: his loose rocks and leaves elsewhere, each piece on its own.
His colours: every lifted pixel is grouped (k-means, started from the luma order) into PAL_N
colours, each the mean of its group: no colour that is not his.

`hand` is where his beam leaves Aurelia's hand (the leftmost of its bright core), `ground` the row
her feet stand on, `tile`: the stretch of his beam (x0, length) whose two ends match best, which the
generator repeats to any length.

Writes tools/world-sprites/vfx-wind-s-line-refdata.ts (generated: rerun this to change it). With a
third argument, a folder, it also writes his canvas, every layer at 4x over light, grass and night,
and the masks over his picture. Same input, same bytes.

  python3 -I tools/refs/wind-s-line-from-ref.py docs/reference/aurelia-wind-s-owner-reference.jpg \
      tools/world-sprites/vfx-wind-s-line-refdata.ts [reviewDir]
"""

import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

NATIVE = (480, 267)
PITCH = (4.1667, 4.168)
GRID_PHASE = (-0.3, -1.0)
K = 1
PAL_N = 46
GLOW_N = 3
# The wind set's glow steps (its palettes' alpha tints).
ALPHAS = (0x1f, 0x3d, 0x5c, 0x80, 0xa3, 0xc7)
PROBES = 24
ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

# His glow's own colour: the teal his halo tints the night toward.
GLOW_TONE = (40, 255, 215)
# Solid: his teal, his earthy dust and rocks, anything bright; and next to it, his darker pixels
# standing out from the night by DARK_EDGE (his line and shading). Glow: standing out by GLOW_MIN,
# within GLOW_REACH px of something solid.
DARK_EDGE = 40
GLOW_MIN = 16
GLOW_REACH = 14
# The forest is read from the picture farther than BACK_CLEAR px from anything solid.
BACK_CLEAR = 10

# How far across his dust is looked for to continue it behind her (his px).
DUST_SHIFT = 40
# The repeating stretch is a whole number of TILE_STEP px (the flow moves its 8th each frame).
TILE_STEP = 8
# The rows his Aurelia's hand holds the beam in.
HAND_ROWS = (152, 170)
# Under the kanji, his beam is continued from this row down, with his beam this far along (his px).
KANJI_FILL_TOP = 30
KANJI_SHIFTS = (-56, -112, -168, 56, 112)
# A loose rock or leaf is a piece of at most this many px.
LOOSE_MAX = 60
# Zones on his canvas (his px).
AURELIA = [(42, 136), (76, 133), (100, 145), (121, 149), (122, 183), (101, 189), (99, 241), (38, 243), (38, 200)]
CONE = [(428, 151), (480, 124), (480, 184), (434, 167)]
DUST_FILL = [(38, 184), (100, 200), (113, 214), (113, 243), (38, 243)]
MOUTH_FILL = [(428, 148), (436, 147), (436, 166), (430, 166)]
KANJI = [(186, 0), (294, 0), (294, 80), (284, 97), (204, 97), (186, 86)]
DRAGON = [(330, 25), (476, 25), (476, 205), (430, 210), (396, 233), (340, 236), (330, 200), (318, 120)]
DUST_L = [(0, 132), (142, 132), (142, 252), (0, 252)]
DUST_R = [(276, 190), (446, 186), (446, 252), (272, 252)]
BEAM = [(104, 30), (346, 30), (346, 252), (104, 252)]


def luma(c):
    return c[..., 0] * 0.299 + c[..., 1] * 0.587 + c[..., 2] * 0.114


def his_pixels(a):
    """His 480x267 pixels: the median of the 2x2 picture px nearest each block's centre."""
    H, W, _ = a.shape
    out = np.zeros((NATIVE[1], NATIVE[0], 3))
    for j in range(NATIVE[1]):
        cy = GRID_PHASE[1] + PITCH[1] * (j + 0.5)
        ys = [y for y in (int(math.floor(cy - 0.5)), int(math.floor(cy + 0.5))) if 0 <= y < H]
        for i in range(NATIVE[0]):
            cx = GRID_PHASE[0] + PITCH[0] * (i + 0.5)
            xs = [x for x in (int(math.floor(cx - 0.5)), int(math.floor(cx + 0.5))) if 0 <= x < W]
            v = [a[y, x] for y in ys for x in xs]
            out[j, i] = np.median(v, axis=0) if v else 0
    return np.clip(np.round(out), 0, 255).astype(int)


def check_grid(a):
    """The edges between his blocks are where GRID_PHASE and PITCH say (else the picture changed)."""
    for axis, ph, p in ((1, GRID_PHASE[0], PITCH[0]), (0, GRID_PHASE[1], PITCH[1])):
        g = np.abs(np.diff(a, axis=axis)).sum(2)
        prof = g.sum(0) if axis == 1 else g.sum(1)
        n = len(prof)
        on = [int(math.ceil(ph + p * k)) - 1 for k in range(0, 600)]
        on = [i for i in on if 0 <= i < n]
        ratio = prof[on].mean() / prof.mean()
        if ratio < 1.3:
            sys.exit('his pixel grid is not where it was: edge ratio %.2f on axis %d' % (ratio, axis))


def poly(pts):
    im = Image.new('L', NATIVE, 0)
    ImageDraw.Draw(im).polygon(pts, fill=1, outline=1)
    return np.array(im) > 0


def grow(m, r=1):
    H, W = m.shape
    p = np.pad(m, r)
    out = np.zeros_like(m)
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out |= p[r + dy:r + dy + H, r + dx:r + dx + W]
    return out


def blur(img, r):
    """A box blur twice (edges held), across and down."""
    def box1(a, axis):
        pad = [(r + 1, r) if i == axis else (0, 0) for i in range(a.ndim)]
        c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis)
        n = a.shape[axis]
        return (np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis) - np.take(c, np.arange(0, n), axis=axis)) / (2 * r + 1)
    for _ in range(2):
        img = box1(box1(img, 0), 1)
    return img


def components(mask, conn8=True):
    H, W = mask.shape
    lab = -np.ones((H, W), int)
    out = []
    nb = ((1, 0), (-1, 0), (0, 1), (0, -1)) + (((1, 1), (1, -1), (-1, 1), (-1, -1)) if conn8 else ())
    for y in range(H):
        for x in range(W):
            if mask[y, x] and lab[y, x] < 0:
                k = len(out)
                stack = [(y, x)]
                lab[y, x] = k
                pts = []
                while stack:
                    cy, cx = stack.pop()
                    pts.append((cy, cx))
                    for dy, dx in nb:
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and lab[ny, nx] < 0:
                            lab[ny, nx] = k
                            stack.append((ny, nx))
                out.append(sorted(pts))
    return out, lab


def fill_mode(img, known, holes):
    """Fills `holes` from the edge in: each pass, a hole next to known pixels takes the colour of the
    known neighbour (8 ways) nearest the mean of them all (a colour of his, the one most like its
    surroundings; ties: the first in reading order), until none is left."""
    img = img.copy()
    known = known.copy()
    todo = holes & ~known
    H, W = known.shape
    while todo.any():
        new = []
        ys, xs = np.nonzero(todo)
        for y, x in zip(ys, xs):
            cs = []
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if (dy or dx) and 0 <= ny < H and 0 <= nx < W and known[ny, nx]:
                        cs.append(tuple(int(v) for v in img[ny, nx]))
            if cs:
                m = np.mean(cs, axis=0)
                best = min(cs, key=lambda c: float(((np.array(c) - m) ** 2).sum()))
                new.append((y, x, best))
        if not new:
            break
        for y, x, c in new:
            img[y, x] = c
            known[y, x] = True
            todo[y, x] = False
    return img, known


def fill_patch(img, known, holes, shifts, tries=4):
    """Continues his texture into `holes` as whole patches: the hidden area takes his pixels shifted
    by the offset (from `shifts`) that lands most of it on known ones, then what is still open by the
    next best, up to `tries` offsets (his texture stays whole, no streaks); the rest stays open."""
    img = img.copy()
    filled = np.zeros_like(holes)
    H, W = holes.shape
    todo = holes & ~known
    ys, xs = np.nonzero(todo)
    for _ in range(tries):
        if not len(ys):
            break
        best = None
        for dx, dy in shifts:
            sy, sx = ys + dy, xs + dx
            ok = (sy >= 0) & (sy < H) & (sx >= 0) & (sx < W)
            ok[ok] = known[sy[ok], sx[ok]]
            if best is None or ok.sum() > best[0]:
                best = (int(ok.sum()), dx, dy, ok)
        n, dx, dy, ok = best
        if not n:
            break
        img[ys[ok], xs[ok]] = img[ys[ok] + dy, xs[ok] + dx]
        filled[ys[ok], xs[ok]] = True
        ys, xs = ys[~ok], xs[~ok]
    return img, filled


def kmeans(px, k, iters=25):
    lum = px @ np.array([0.299, 0.587, 0.114])
    order = np.argsort(lum, kind='stable')
    c = np.array([px[order[int((i + 0.5) / k * len(order))]] for i in range(k)], float)
    for _ in range(iters):
        a = np.concatenate([((px[s:s + 4096, None, :] - c[None]) ** 2).sum(-1).argmin(1) for s in range(0, len(px), 4096)])
        for j in range(k):
            if (a == j).any():
                c[j] = px[a == j].mean(0)
    a = np.concatenate([((px[s:s + 4096, None, :] - c[None]) ** 2).sum(-1).argmin(1) for s in range(0, len(px), 4096)])
    return np.round(c).astype(int), a


def main():
    if len(sys.argv) not in (3, 4):
        sys.exit(__doc__)
    src, dst = sys.argv[1], sys.argv[2]
    a = np.asarray(Image.open(src).convert('RGB')).astype(float)
    check_grid(a)
    his = his_pixels(a)
    f = his.astype(float)
    L = luma(f)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    out_of_it = poly(AURELIA) | poly(CONE)

    teal = (g - r > 60) & (g >= 120)
    earthy = (r >= 70) & (r - b >= 15) & (np.abs(r - g) < 70) & (L >= 60)
    leafy = (g > r + 25) & (g > b + 15) & (r > 15) & ~teal
    strong = (teal | earthy | (L >= 150)) & ~out_of_it

    # His forest: read away from the effect, carried in under it by a widening blur.
    clear = ~(grow(strong, BACK_CLEAR) | out_of_it)
    back = f.copy()
    w = clear.astype(float)
    have = clear.copy()
    for rad in (3, 6, 12, 24, 48, 96):
        nb = np.stack([blur(f[..., i] * w, rad) for i in range(3)], -1)
        wb = blur(w, rad)
        new = ~have & (wb > 0.02)
        back[new] = nb[new] / wb[new][:, None]
        have |= new
    D = f - back
    stand = np.sqrt((D ** 2).sum(-1))
    solid = (strong | ((stand > DARK_EDGE) & grow(strong, 1))) & ~out_of_it

    # What Aurelia and the cut ray hid: his dust behind her, the dragon's mouth behind the ray.
    img = his.copy()
    hid_dust = poly(DUST_FILL) & poly(AURELIA)
    dust_known = solid & poly(DUST_L) & earthy
    img, filled = fill_patch(img, dust_known, hid_dust, [(dx, dy) for dx in range(-DUST_SHIFT, DUST_SHIFT + 1) for dy in range(-6, 7) if abs(dx) >= 8])
    solid |= hid_dust & filled
    hid_dust &= filled
    hid_mouth = poly(MOUTH_FILL) & poly(CONE)
    img, filled = fill_mode(img, solid & poly(DRAGON), hid_mouth)
    solid |= hid_mouth & filled

    # His glow over the night: his glow colour at the alpha that gives his pixel over his forest.
    G = np.array(GLOW_TONE, float)
    GB = G[None, None] - back
    alpha = np.clip((D * GB).sum(-1) / np.maximum((GB ** 2).sum(-1), 1), 0, 1)
    tone = np.clip(back + D / np.maximum(alpha, 0.05)[..., None], 0, 255)
    # Only his teal glow: the ground's own greens and greys near the dust are the night.
    glow = ~solid & ~out_of_it & (stand > GLOW_MIN) & (alpha > 0.06) & grow(solid, GLOW_REACH) & ~earthy & (tone[..., 1] - tone[..., 0] > 90)

    # The layers: zones decide, the beam takes the rest.
    kanji_z, dragon_z, dust_lz, dust_rz, beam_z = poly(KANJI), poly(DRAGON), poly(DUST_L), poly(DUST_R), poly(BEAM)
    tealish = g - r > 40
    dust_l = solid & dust_lz & ~tealish
    dust_r = solid & dust_rz & ~tealish
    dust = dust_l | dust_r
    kanji = solid & kanji_z & ~dust
    # His loose rocks and leaves: earthy pieces anywhere off the dust, and small leafy ones standing
    # clear of his teal (the beam's own darker greens are the beam's).
    cand, _ = components(solid & (earthy | leafy) & ~tealish & ~dust & ~kanji_z)
    loose = np.zeros_like(solid)
    teal_near = grow(solid & tealish, 1)
    for p in cand:
        ys = np.array([q[0] for q in p])
        xs = np.array([q[1] for q in p])
        rocky = earthy[ys, xs].mean() > 0.5
        if len(p) <= LOOSE_MAX and (rocky or not teal_near[ys, xs].any()):
            loose[ys, xs] = True
    dragon = solid & dragon_z & ~kanji_z & ~dust & ~loose
    beam = solid & beam_z & ~kanji & ~dragon & ~dust & ~loose
    pieces, _ = components(loose)
    # The glow goes with the layer it surrounds (the nearest, growing out one px at a time).
    owner = np.full(NATIVE[::-1], -1)
    # (the dust takes none: his glow is the wind's)
    for i, m in enumerate((beam, dragon, kanji)):
        owner[m] = i
    frontier = owner.copy()
    for _ in range(GLOW_REACH + 1):
        grown = frontier.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(np.roll(frontier, dy, 0), dx, 1)
            grown = np.where((grown < 0) & (sh >= 0), sh, grown)
        frontier = grown
    glow_of = [glow & (frontier == i) for i in range(5)]

    # His colours: opaque groups, and his glow's groups at the wind set's alpha steps.
    opq = img[solid].astype(float)
    pal, _ = kmeans(opq, PAL_N)
    pal = pal[np.argsort(pal @ np.array([0.299, 0.587, 0.114]), kind='stable')]
    gpal, _ = kmeans(tone[glow], GLOW_N)
    gpal = gpal[np.argsort(gpal @ np.array([0.299, 0.587, 0.114]), kind='stable')]
    colours = ['#%02x%02x%02xff' % tuple(int(v) for v in c) for c in pal]
    for c in gpal:
        for al in ALPHAS:
            colours.append('#%02x%02x%02x%02x' % (int(c[0]), int(c[1]), int(c[2]), al))
    assert len(colours) <= len(ALPHABET)

    def nearest(cs, px):
        return np.concatenate([((px[s:s + 4096, None, :] - cs[None]) ** 2).sum(-1).argmin(1) for s in range(0, len(px), 4096)])

    idx = -np.ones(NATIVE[::-1], int)
    idx[solid] = nearest(pal.astype(float), img[solid].astype(float))
    gi = nearest(gpal.astype(float), tone[glow])
    al = alpha[glow] * 255
    ai = np.abs(al[:, None] - np.array(ALPHAS)[None]).argmin(1)
    idx[glow] = PAL_N + gi * len(ALPHAS) + ai

    # Under his kanji the beam is hidden: it is continued with his own beam a whole number of his
    # repeats (KANJI_SHIFTS) along, where the kanji is not (his rings and the tube's top run on); what
    # lands where his beam has nothing stays clear.
    hidden = kanji_z & beam_z & (np.arange(NATIVE[1])[:, None] >= KANJI_FILL_TOP)
    beam_all = beam | glow_of[0]
    src_ok = beam_z & ~kanji_z
    ys, xs = np.nonzero(hidden & ~beam_all)
    hid_beam = np.zeros_like(beam)
    for dx in KANJI_SHIFTS:
        if not len(ys):
            break
        sx = xs + dx
        ok = (sx >= 0) & (sx < NATIVE[0])
        ok[ok] = src_ok[ys[ok], sx[ok]]
        take = ok.copy()
        take[ok] = beam_all[ys[ok], sx[ok]]
        idx[ys[take], xs[take]] = idx[ys[take], sx[take]]
        hid_beam[ys[take], xs[take]] = True
        ys, xs = ys[~ok], xs[~ok]
    beam = beam | (hid_beam & (idx < PAL_N))
    glow_of[0] |= hid_beam & (idx >= PAL_N)

    def rows_of(m):
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()) + 1, int(xs.min()), int(xs.max()) + 1
        return {'x': x0, 'y': y0, 'rows': [''.join(ALPHABET[idx[y, x]] if m[y, x] else '.' for x in range(x0, x1)) for y in range(y0, y1)]}

    names = ('beam', 'dragon', 'kanji', 'dust_l', 'dust_r')
    masks = dict(zip(names, (beam, dragon, kanji, dust_l, dust_r)))
    layers = {n: rows_of(masks[n] | glow_of[i]) for i, n in enumerate(names)}
    debris = []
    for p in pieces:
        m = np.zeros(NATIVE[::-1], bool)
        for y, x in p:
            m[y, x] = True
        debris.append(rows_of(m))

    # Where his beam leaves her hand: the leftmost of its bright core, in the rows of her hand.
    core = beam & (L >= 200) & (np.arange(NATIVE[1])[:, None] >= HAND_ROWS[0]) & (np.arange(NATIVE[1])[:, None] < HAND_ROWS[1])
    ys, xs = np.nonzero(core)
    x_min = int(xs.min())
    hand = [x_min, int(np.median(ys[xs == x_min]))]
    # The row her feet stand on: the lowest of his Aurelia's own (the polygon's foot).
    ground = max(y for _, y in AURELIA) - 2
    # The stretch of his beam whose two ends match best (between the flare and the kanji's right
    # edge, under which the beam is his on every column), to repeat it to any length.
    band_y = (int(np.nonzero(beam.any(1))[0].min()), int(np.nonzero(beam.any(1))[0].max()) + 1)
    best = None
    for x0 in range(170, 215):
        for n in range(TILE_STEP * 6, TILE_STEP * 14, TILE_STEP):
            x1 = x0 + n
            if x1 >= 300:
                continue
            ca, cb = idx[band_y[0]:band_y[1], x0], idx[band_y[0]:band_y[1], x1]
            pa, pb = f[band_y[0]:band_y[1], x0], f[band_y[0]:band_y[1], x1]
            d = float(np.abs(pa - pb).sum()) / (band_y[1] - band_y[0])
            if best is None or d < best[0]:
                best = (d, x0, n)
    tile = [best[1], best[2]]

    probes = {}
    for n, m in masks.items():
        own = m & ~(hid_dust | hid_mouth | hid_beam)
        ys, xs = np.nonzero(own)
        pick = np.linspace(0, len(ys) - 1, min(PROBES, len(ys))).round().astype(int)
        probes[n] = [[int(xs[i]), int(ys[i]), '#%02x%02x%02x' % tuple(int(v) for v in his[ys[i], xs[i]])] for i in pick]

    data = {
        'source': os.path.basename(src),
        'native': list(NATIVE),
        'pitch': list(PITCH),
        'phase': list(GRID_PHASE),
        'k': K,
        'hand': hand,
        'ground': ground,
        'band': list(band_y),
        'tile': tile,
        'opaque': PAL_N,
        'pal': colours,
        'layers': layers,
        'debris': debris,
        'probes': probes,
    }
    text = ('// Generated by tools/refs/wind-s-line-from-ref.py from the owner\'s Gale Dragon Ray\n'
            '// (docs/reference/aurelia-wind-s-owner-reference.jpg, his 480x267 pixels at about 4.17x): rerun the\n'
            '// script to change it. His layers in his own pixels (rows of palette letters, \'.\' clear; x, y:\n'
            '// where the rows start on his canvas), his colours (#rrggbbaa: his opaque ones darkest first, then\n'
            '// his glow at the wind set\'s alpha steps), his loose rocks and leaves piece by piece, where his\n'
            '// beam leaves the hand, the row the feet stand on, the rows his beam spans, the stretch of it that\n'
            '// repeats (x0, length); probes: his pixels and his colours there, for the test.\n\n'
            'export interface RayPiece {\n  x: number;\n  y: number;\n  rows: string[];\n}\n\n'
            'export interface WindSLineRef {\n  source: string;\n  native: number[];\n  pitch: number[];\n  phase: number[];\n  k: number;\n'
            '  hand: number[];\n  ground: number;\n  band: number[];\n  tile: number[];\n  opaque: number;\n  pal: string[];\n'
            '  layers: Record<\'beam\' | \'dragon\' | \'kanji\' | \'dust_l\' | \'dust_r\', RayPiece>;\n'
            '  debris: RayPiece[];\n  probes: Record<string, [number, number, string][]>;\n}\n\n'
            'export const WIND_S_LINE_REF: WindSLineRef = %s;\n') % json.dumps(data, indent=1)
    tmp = dst + '.tmp-%d' % os.getpid()
    with open(tmp, 'w') as fh:
        fh.write(text)
    os.replace(tmp, dst)

    if len(sys.argv) == 4:
        rev = sys.argv[3]
        os.makedirs(rev, exist_ok=True)
        Image.fromarray(his.astype(np.uint8)).save(os.path.join(rev, 'his-canvas.png'))
        rgba = np.zeros(NATIVE[::-1] + (4,), np.uint8)
        for y, x in zip(*np.nonzero(idx >= 0)):
            h = colours[idx[y, x]]
            rgba[y, x] = [int(h[i:i + 2], 16) for i in (1, 3, 5, 7)]
        lifted = Image.fromarray(rgba)
        for name, bgc in (('light', (236, 233, 222)), ('grass', (74, 98, 58)), ('night', (10, 14, 24))):
            c = Image.new('RGBA', lifted.size, bgc + (255,))
            c.alpha_composite(lifted)
            c.resize((NATIVE[0] * 4, NATIVE[1] * 4), Image.NEAREST).convert('RGB').save(os.path.join(rev, 'lifted-%s-4x.png' % name))
        tint = {'beam': (255, 255, 0), 'dragon': (255, 0, 255), 'kanji': (255, 255, 255), 'dust_l': (255, 140, 0), 'dust_r': (255, 90, 0)}
        over = Image.fromarray(his.astype(np.uint8)).convert('RGB')
        ov = np.array(over).astype(float)
        for n, m in masks.items():
            ov[m] = ov[m] * 0.4 + np.array(tint[n]) * 0.6
        ov[glow] = ov[glow] * 0.5 + np.array((0, 120, 255)) * 0.5
        Image.fromarray(ov.astype(np.uint8)).resize((NATIVE[0] * 3, NATIVE[1] * 3), Image.NEAREST).save(os.path.join(rev, 'masks-3x.png'))
    print('wind S line: %d colours (%d opaque); beam %d, dragon %d, kanji %d, dust %d+%d px, glow %d px; %d loose pieces; hand %s, ground %d, tile %s (match %.1f)' % (
        len(colours), PAL_N, beam.sum(), dragon.sum(), kanji.sum(), dust_l.sum(), dust_r.sum(), glow.sum(), len(debris), hand, ground, tile, best[0]))


if __name__ == '__main__':
    main()
