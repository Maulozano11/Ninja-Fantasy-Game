"""Lifts the owner's S-rank Devouring Tide (his paint-over of our widest wave frame) into the layers
the S-rank Tide animates: his central curl wave, his water dragon (head, horns, whiskers, jaw), his
kanji 水 with its glow, and his extra spray.

His picture: docs/reference/tide-s-owner-reference.jpg (1024x765, on black). We gave him our wave at
its widest (601x484 game px, the Tide 2280 ms after the cast); he painted over it: "a la ola pasame
el sprite donde se ven mas olas para agregarle un kanji y una bestia animada que sera el jutsu en
version mejorada clase s".

His grid. The whole picture is one pixel-art canvas of 320x240 of his pixels, scaled up 3.2 times
(nearest) and saved as a JPEG 1024 wide (3 rows of the 768 cut off): the edges between blocks repeat
every 3.20 picture px across and down, everywhere (his lanes, his columns, his dragon, his kanji),
with the phase GRID_PHASE. Each of his pixels is taken back as the median of the 2x2 picture px
nearest its centre (the JPEG smears the block's ring).

His scale against ours. His trailing lanes (the water left behind, at the left) are ours: our frame's
lanes laid on his canvas match his with an IoU of 0.967 at 2.04 x 1.95 game px per his pixel; his
right side (the columns at the crest, his spouts) is ours redrawn, matching at 0.896 with 2.19 x 1.88
(FIT below; he moved the lanes 69 of his px down and stretched the right side). So one of his
pixels is about 2 game px, never finer: his new parts (curl, dragon, kanji, spray) are on that same
grid. They are lifted as his pixels, each 2x2 game px (K = 2, as his wood dragon), placed about
ANCHOR (the middle of his new parts) where the right-side fit puts it on our frame; `crest` is where
our crest point falls in his pixels (the layers ride on the crest in the battle).

The layers (his pixels only; nothing drawn anew):
  - curl: his curl wave (CURL polygon), without the dragon, the kanji's strokes and the spray. What
    the dragon and the kanji's strokes hide of it is continued with his own curl turned about its eye
    (EYE), so his rings run on round the spiral: each stroke's patch takes his curl turned back as a
    whole (the least turn, up to TURN_MAX degrees, that lands it on his pixels); under the head each
    pixel takes its own least turn. The whiskers leave thin gaps, filled
    from the edge in with the neighbour's colour most like its surroundings.
  - head: his dragon's head with its mane (HEAD polygon) less the horns, whiskers and jaw; under the
    jaw his mouth runs on (each pixel the one JAW_FILL rows above it), and under the horns and
    whiskers the head's own neighbours fill in.
  - horn_l, horn_r: his horns (polygons), whole.
  - whisker_l, whisker_r: his whiskers: his light pixels (luma >= WHISKER_LUMA) in their strips.
  - jaw: his lower jaw (JAW polygon).
  - kanji: his kanji's strokes: what his dark line (luma < KANJI_LINE) shuts in, in the kanji's box
    (pockets under KANJI_MIN px are specks of the spiral), and that line where it bounds them.
  - glow: his bright pixels round the kanji (luma >= GLOW_LUMA in GLOW, not the strokes): his light
    aura. They stay in the curl too; the glow is laid over it again as light to make it pulse.
  - spray: his loose splashes and drops outside the curl (SPRAY zone), each piece on its own.
His colours: the JPEG gives each of his pixels a slightly different colour, so every lifted pixel is
grouped (k-means, started from the luma order) into PAL_N colours, each the mean of its group: no
colour that is not his.

Writes tools/world-sprites/vfx-tide-s-refdata.ts (generated: rerun this to change it). With a third
argument, a folder, it also writes his canvas, every layer alone at 4x and the masks over his
picture. Same input, same bytes.

  python3 -I tools/refs/tide-s-from-ref.py docs/reference/tide-s-owner-reference.jpg \
      tools/world-sprites/vfx-tide-s-refdata.ts [reviewDir]
"""

import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

# His canvas and its grid on the picture (picture px): cell (i, j) spans x0 + 3.2 i ... x0 + 3.2 (i + 1).
NATIVE = (320, 240)
PITCH = 3.2
GRID_PHASE = (-0.55, -2.2)
# Fitted (scratch, from our frame's PNG): his px = s * our px + o, on our frame's right side (x >= 380).
FIT = {'right': {'s': [0.456, 0.532], 'o': [49.5, -6.0], 'iou': 0.896}, 'lanes': {'s': [0.49, 0.514], 'o': [-2.0, 69.0], 'iou': 0.967}}
# Our crest point in that frame (the middle of the crest on the ground: the battle anchors the layers there).
OUR_CREST = (493.0, 281.5)
# Game px per his pixel.
K = 2
PAL_N = 64
PROBES = 24
ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
BLACK = 40
WHISKER_LUMA = 135
KANJI_LINE = 100
# A pocket his line shuts in that is smaller than this is a speck of the spiral, not a stroke.
KANJI_MIN = 40
GLOW_LUMA = 170
JAW_FILL = 9
TURN_MAX = 200
TURN_MISS = 0.03

# Polygons in his pixels (x, y).
CURL = [(117, 239), (117, 200), (119, 168), (117, 150), (116, 128), (118, 110), (121, 92), (124, 76), (129, 62), (135, 50), (143, 40), (152, 33), (163, 28), (176, 26),
        (190, 30), (205, 33), (222, 33), (238, 36), (247, 46), (252, 62), (254, 80), (257, 100), (259, 120), (260, 150), (260, 175), (258, 192), (238, 197), (220, 200),
        (210, 210), (204, 225), (202, 239)]
HEAD = [(178, 40), (181, 22), (186, 9), (194, 5), (200, 7), (206, 12), (214, 12), (222, 9), (229, 5), (236, 8), (240, 18), (243, 32), (247, 48), (247, 66), (241, 78),
        (232, 87), (224, 94), (223, 107), (200, 107), (199, 94), (190, 87), (181, 78), (176, 62)]
HORN_L = [(194, 6), (198, 8), (195, 13), (192, 19), (192, 26), (191, 31), (185, 31), (185, 24), (187, 16), (190, 10)]
HORN_R = [(229, 6), (233, 7), (237, 12), (239, 18), (238, 25), (237, 31), (231, 31), (232, 24), (233, 17), (231, 11)]
WHISKER_L = [(203, 74), (204, 80), (192, 88), (176, 89), (170, 85), (170, 66), (166, 63), (161, 62), (161, 57), (168, 56), (176, 62), (177, 80), (180, 83), (188, 83), (197, 76)]
WHISKER_R = [(217, 74), (230, 75), (237, 81), (245, 81), (247, 54), (250, 54), (250, 87), (246, 89), (233, 89), (227, 84), (217, 81)]
JAW = [(201, 98), (221, 98), (224, 107), (199, 107)]
KANJI_BOX = [(176, 108), (258, 108), (258, 184), (176, 184)]
GLOW = [(160, 96), (262, 96), (262, 200), (160, 200)]
SPRAY = [(96, 0), (246, 0), (246, 26), (180, 26), (160, 28), (140, 36), (128, 50), (120, 70), (114, 100), (113, 130), (113, 150), (96, 150)]
# The eye of his spiral, the pivots the generator turns pieces about, and the line under the
# dragon's chin it rises out of and dives back into.
EYE = (188, 118)
PIVOTS = {'head': (212, 104), 'jaw': (211, 98), 'whisker_l': (201, 78), 'whisker_r': (220, 78), 'horn_l': (189, 30), 'horn_r': (234, 30)}
SURFACE = 108
# The middle of his new parts: placed where the right-side fit puts it.
ANCHOR = (188, 120)


def luma(c):
    return c[..., 0] * 0.299 + c[..., 1] * 0.587 + c[..., 2] * 0.114


def his_pixels(a):
    """His 320x240 pixels: the median of the 2x2 picture px nearest each block's centre."""
    H, W, _ = a.shape
    out = np.zeros((NATIVE[1], NATIVE[0], 3))
    for j in range(NATIVE[1]):
        cy = GRID_PHASE[1] + PITCH * (j + 0.5)
        ys = [y for y in (int(math.floor(cy - 0.5)), int(math.floor(cy + 0.5))) if 0 <= y < H]
        for i in range(NATIVE[0]):
            cx = GRID_PHASE[0] + PITCH * (i + 0.5)
            xs = [x for x in (int(math.floor(cx - 0.5)), int(math.floor(cx + 0.5))) if 0 <= x < W]
            v = [a[y, x] for y in ys for x in xs]
            out[j, i] = np.median(v, axis=0) if v else 0
    return np.clip(np.round(out), 0, 255).astype(int)


def check_grid(a):
    """The edges between his blocks are where GRID_PHASE and PITCH say (else the picture changed)."""
    for axis, ph in ((1, GRID_PHASE[0]), (0, GRID_PHASE[1])):
        g = np.abs(np.diff(a, axis=axis)).sum(2)
        prof = g.sum(0) if axis == 1 else g.sum(1)
        n = len(prof)
        on = [int(math.ceil(ph + PITCH * k)) - 1 for k in range(0, 400)]
        on = [i for i in on if 0 <= i < n]
        ratio = prof[on].mean() / prof.mean()
        if ratio < 1.4:
            sys.exit('his pixel grid is not where it was: edge ratio %.2f on axis %d' % (ratio, axis))


def poly(pts):
    im = Image.new('L', NATIVE, 0)
    ImageDraw.Draw(im).polygon(pts, fill=1, outline=1)
    return np.array(im) > 0


def components(mask, conn8=False):
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


def fill_turn(img, known, holes, eye, max_deg, whole=True):
    """Continues his curl round its eye into each hidden patch (4-connected) as a whole: the patch
    takes his curl turned back (counter-clockwise on the screen) about `eye` by the least whole degree
    at which all but TURN_MISS of it lands on his known pixels, so his rings run on unbroken; a pixel
    that still lands on none takes the least turn beyond that which reaches one. With whole=False,
    every pixel takes its own least turn."""
    img = img.copy()
    filled = known.copy()
    H, W = known.shape

    def src(x, y, d):
        r = math.radians(-d)
        dx, dy = x - eye[0], y - eye[1]
        sx = int(round(eye[0] + dx * math.cos(r) - dy * math.sin(r)))
        sy = int(round(eye[1] + dx * math.sin(r) + dy * math.cos(r)))
        return (sx, sy) if 0 <= sx < W and 0 <= sy < H and known[sy, sx] else None

    for patch in components(holes & ~known)[0] if whole else [[(int(y), int(x))] for y, x in zip(*np.nonzero(holes & ~known))]:
        turn = max_deg
        for d in range(1, max_deg + 1):
            if sum(1 for y, x in patch if src(x, y, d) is None) <= TURN_MISS * len(patch):
                turn = d
                break
        for y, x in patch:
            for d in [turn] + list(range(turn + 1, max_deg + 1)) + list(range(1, turn)):
                q = src(x, y, d)
                if q:
                    img[y, x] = img[q[1], q[0]]
                    filled[y, x] = True
                    break
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
    L = luma(his.astype(float))
    lit = his.max(2) >= BLACK

    head_area = poly(HEAD) & lit
    horn_l = poly(HORN_L) & head_area
    horn_r = poly(HORN_R) & head_area
    whisker_l = poly(WHISKER_L) & lit & (L >= WHISKER_LUMA)
    whisker_r = poly(WHISKER_R) & lit & (L >= WHISKER_LUMA)
    jaw = poly(JAW) & lit
    dragon = head_area | whisker_l | whisker_r | jaw
    head = head_area & ~horn_l & ~horn_r & ~whisker_l & ~whisker_r & ~jaw

    # The kanji: his dark line in its box and what it shuts in (not reachable from the box's edge).
    box = poly(KANJI_BOX)
    line = box & (L < KANJI_LINE)
    free = box & ~line
    outside = np.zeros_like(free)
    stack = [(y, x) for y in range(NATIVE[1]) for x in range(NATIVE[0]) if free[y, x] and not (box[max(0, y - 1), x] and box[min(NATIVE[1] - 1, y + 1), x] and box[y, max(0, x - 1)] and box[y, min(NATIVE[0] - 1, x + 1)])]
    for y, x in stack:
        outside[y, x] = True
    while stack:
        y, x = stack.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < NATIVE[1] and 0 <= nx < NATIVE[0] and free[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True
                stack.append((ny, nx))
    inside = free & ~outside
    for c in components(inside)[0]:
        if len(c) < KANJI_MIN:
            for y, x in c:
                inside[y, x] = False
    # His line counts only where it bounds a stroke (a dark speck of the spiral in the box does not).
    strokes = inside.copy()
    H, W = NATIVE[1], NATIVE[0]
    for y, x in zip(*np.nonzero(line)):
        if any(0 <= y + dy < H and 0 <= x + dx < W and inside[y + dy, x + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)):
            strokes[y, x] = True
    glow = poly(GLOW) & lit & ~strokes & ~dragon & (L >= GLOW_LUMA)

    curl_area = poly(CURL)
    # His line round the strokes (two px out) goes with them: left in the curl it would smear dark.
    near = strokes.copy()
    for _ in range(2):
        g = near.copy()
        g[1:] |= near[:-1]
        g[:-1] |= near[1:]
        g[:, 1:] |= near[:, :-1]
        g[:, :-1] |= near[:, 1:]
        near = g
    rim = near & line & ~strokes
    curl_known = curl_area & lit & ~dragon & ~strokes & ~rim
    # Thin gaps first (whiskers outside the head, the strokes), then what the head hides, round the eye.
    thin = curl_area & (whisker_l | whisker_r) & ~poly(HEAD)
    curl_img, curl_ok = fill_mode(his, curl_known, thin)
    # The strokes, patch by patch (whole turns keep his rings' grain); then what the head hides, pixel
    # by pixel (the least turn: his rings run on smoothly over its big patch).
    curl_img, curl_ok = fill_turn(curl_img, curl_ok, curl_area & (strokes | rim) & ~curl_ok, EYE, TURN_MAX)
    curl_img, curl_ok = fill_turn(curl_img, curl_ok, curl_area & poly(HEAD) & ~curl_ok, EYE, TURN_MAX, whole=False)
    curl = curl_ok

    # The head under its jaw: his mouth runs on down; under the horns and whiskers, its neighbours.
    head_img = his.copy()
    under_jaw = jaw.copy()
    for y, x in zip(*np.nonzero(under_jaw)):
        head_img[y, x] = his[y - JAW_FILL, x]
    head_known = head | under_jaw
    head_img, head_ok = fill_mode(head_img, head_known, head_area & (horn_l | horn_r | whisker_l | whisker_r))
    head_full = head_ok & head_area

    spray_zone = poly(SPRAY) & lit & ~curl_area & ~dragon
    pieces, _ = components(spray_zone, conn8=True)

    layers = {
        'curl': (curl_img, curl),
        'head': (head_img, head_full),
        'horn_l': (his, horn_l),
        'horn_r': (his, horn_r),
        'whisker_l': (his, whisker_l),
        'whisker_r': (his, whisker_r),
        'jaw': (his, jaw),
        'kanji': (his, strokes),
        'glow': (his, glow),
    }
    # His colours: every lifted pixel, grouped.
    pts = []
    for img, m in layers.values():
        pts.append(img[m])
    pts.append(his[spray_zone])
    px = np.concatenate(pts).astype(float)
    pal, _ = kmeans(px, PAL_N)
    lum = pal @ np.array([0.299, 0.587, 0.114])
    pal = pal[np.argsort(lum, kind='stable')]

    def index(img):
        flat = img.reshape(-1, 3).astype(float)
        a = np.concatenate([((flat[s:s + 4096, None, :] - pal[None]) ** 2).sum(-1).argmin(1) for s in range(0, len(flat), 4096)])
        return a.reshape(img.shape[:2])

    def rows_of(idx, m):
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()) + 1, int(xs.min()), int(xs.max()) + 1
        return {'x': x0, 'y': y0, 'rows': [''.join(ALPHABET[idx[y, x]] if m[y, x] else '.' for x in range(x0, x1)) for y in range(y0, y1)]}

    out_layers = {}
    for name, (img, m) in layers.items():
        out_layers[name] = rows_of(index(img), m)
    his_idx = index(his)
    # Probes for the test (src/battle/tideS.test.ts): pixels of each layer that are his (not filled),
    # PROBES of them spread through it in reading order, with his colour there before grouping.
    own = {'curl': curl_known, 'head': head}
    probes = {}
    for name, (img, m) in layers.items():
        ys, xs = np.nonzero(m & own.get(name, m))
        pick = np.linspace(0, len(ys) - 1, min(PROBES, len(ys))).round().astype(int)
        probes[name] = [[int(xs[i]), int(ys[i]), '#%02x%02x%02x' % tuple(int(v) for v in his[ys[i], xs[i]])] for i in pick]
    spray = []
    for p in pieces:
        m = np.zeros(lit.shape, bool)
        for y, x in p:
            m[y, x] = True
        spray.append(rows_of(his_idx, m))

    # Our crest in his pixels: ANCHOR sits where the right-side fit puts it on our frame, every other
    # pixel K game px per his pixel from it.
    s, o = FIT['right']['s'], FIT['right']['o']
    ax, ay = (ANCHOR[0] - o[0]) / s[0], (ANCHOR[1] - o[1]) / s[1]
    crest = [round(ANCHOR[0] + (OUR_CREST[0] - ax) / K, 2), round(ANCHOR[1] + (OUR_CREST[1] - ay) / K, 2)]

    data = {
        'source': os.path.basename(src),
        'native': list(NATIVE),
        'pitch': PITCH,
        'phase': list(GRID_PHASE),
        'k': K,
        'fit': FIT,
        'crest': crest,
        'eye': list(EYE),
        'surface': SURFACE,
        'pivots': {k: list(v) for k, v in PIVOTS.items()},
        'pal': ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in pal],
        'layers': out_layers,
        'spray': spray,
        'probes': probes,
    }
    text = ('// Generated by tools/refs/tide-s-from-ref.py from the owner\'s S-rank Devouring Tide\n'
            '// (docs/reference/tide-s-owner-reference.jpg, his 320x240 pixels at 3.2x): rerun the script to\n'
            '// change it. His layers in his own pixels (rows of palette letters, \'.\' clear; x, y: where the\n'
            '// rows start on his canvas), his colours (darkest first), his loose spray piece by piece, the\n'
            '// pivots the pieces turn about, and where our crest point falls on his canvas (each of his\n'
            '// pixels is k x k game px); probes: his pixels and his colours there, for the test.\n\n'
            'export interface TidePiece {\n  x: number;\n  y: number;\n  rows: string[];\n}\n\n'
            'export interface TideSRef {\n  source: string;\n  native: number[];\n  pitch: number;\n  phase: number[];\n  k: number;\n'
            '  fit: Record<string, { s: number[]; o: number[]; iou: number }>;\n  crest: number[];\n  eye: number[];\n  surface: number;\n'
            '  pivots: Record<\'head\' | \'jaw\' | \'whisker_l\' | \'whisker_r\' | \'horn_l\' | \'horn_r\', number[]>;\n  pal: string[];\n'
            '  layers: Record<\'curl\' | \'head\' | \'horn_l\' | \'horn_r\' | \'whisker_l\' | \'whisker_r\' | \'jaw\' | \'kanji\' | \'glow\', TidePiece>;\n'
            '  spray: TidePiece[];\n  probes: Record<string, [number, number, string][]>;\n}\n\n'
            'export const TIDE_S_REF: TideSRef = %s;\n') % json.dumps(data, indent=1)
    tmp = dst + '.tmp-%d' % os.getpid()
    with open(tmp, 'w') as f:
        f.write(text)
    os.replace(tmp, dst)

    if len(sys.argv) == 4:
        rev = sys.argv[3]
        os.makedirs(rev, exist_ok=True)
        Image.fromarray(his.astype(np.uint8)).save(os.path.join(rev, 'his-canvas.png'))
        Image.fromarray(his.astype(np.uint8)).resize((NATIVE[0] * 4, NATIVE[1] * 4), Image.NEAREST).save(os.path.join(rev, 'his-canvas-x4.png'))
        tints = {'curl': (60, 200, 255), 'head': (255, 80, 80), 'horn_l': (255, 200, 0), 'horn_r': (255, 200, 0), 'whisker_l': (0, 255, 120), 'whisker_r': (0, 255, 120),
                 'jaw': (255, 0, 255), 'kanji': (255, 255, 255), 'glow': (255, 160, 60)}
        ov = his.astype(float) * 0.45
        for name in ('curl', 'glow', 'head', 'horn_l', 'horn_r', 'jaw', 'whisker_l', 'whisker_r', 'kanji'):
            m = layers[name][1] & lit if name != 'curl' else (layers[name][1] & lit & ~poly(HEAD))
            ov[m] = ov[m] * 0.5 + np.array(tints[name]) * 0.5
        ov[spray_zone] = ov[spray_zone] * 0.4 + np.array((255, 255, 0)) * 0.6
        im = Image.fromarray(np.clip(ov, 0, 255).astype(np.uint8)).resize((NATIVE[0] * 4, NATIVE[1] * 4), Image.NEAREST)
        d = ImageDraw.Draw(im)
        for P in (CURL, HEAD, HORN_L, HORN_R, WHISKER_L, WHISKER_R, JAW, KANJI_BOX, GLOW, SPRAY):
            d.line([(x * 4 + 2, y * 4 + 2) for x, y in P + [P[0]]], fill=(255, 255, 255), width=1)
        d.ellipse((EYE[0] * 4 - 4, EYE[1] * 4 - 4, EYE[0] * 4 + 4, EYE[1] * 4 + 4), outline=(255, 0, 0), width=2)
        im.save(os.path.join(rev, 'masks-x4.png'))
        for name, (img, m) in layers.items():
            lay = np.zeros(NATIVE[::-1] + (4,), np.uint8)
            lay[..., :3] = pal[index(img)]
            lay[..., 3] = np.where(m, 255, 0)
            Image.fromarray(lay).save(os.path.join(rev, 'layer-%s.png' % name))
        lay = np.zeros(NATIVE[::-1] + (4,), np.uint8)
        lay[..., :3] = pal[his_idx]
        lay[..., 3] = np.where(spray_zone, 255, 0)
        Image.fromarray(lay).save(os.path.join(rev, 'layer-spray.png'))
    print('tide S: %d colours; curl %d, head %d, horns %d+%d, whiskers %d+%d, jaw %d, kanji %d, glow %d px; %d spray pieces; crest at his (%.2f, %.2f) -> %s' % (
        len(pal), curl.sum(), head_full.sum(), horn_l.sum(), horn_r.sum(), whisker_l.sum(), whisker_r.sum(), jaw.sum(), strokes.sum(), glow.sum(), len(spray), crest[0], crest[1], dst))


if __name__ == '__main__':
    main()
