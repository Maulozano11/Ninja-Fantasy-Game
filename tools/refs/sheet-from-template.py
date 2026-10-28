"""One converter for every sheet drawn on the template (docs/scene-art-plan.md, section 3).

The owner (or his image generator) draws on the template that tools/refs/make-template.py
writes: a PNG with a flat key-colour background, a grid of cells of a fixed size with a gutter
between them, one piece per cell (a wide piece spans cells to the right), every piece standing on
the bottom edge of its cell, and the scale figure in cell 0. Because every sheet arrives the same
way, this one script turns any of them into a world-sprite group the game loads (the format of
tools/world-sprites/kit.ts writeGroup: <group>/<name>.png + manifest.json), plus the review sheet
"Tu dibujo / En el juego" and a round-trip report.

    python3 -I tools/refs/sheet-from-template.py <sheet.png> <spec.json> --out <dir> [--review <png>]
    python3 -I tools/refs/sheet-from-template.py --selftest <dir>

The spec names the cells (see tools/refs/template/example-spec.json):

    {"group": "patio", "factor": 8, "cell": 1024, "gutter": 32, "cols": 4, "rows": 2,
     "colors": 32,
     "pieces": [
       {"id": "table_low", "label": "Low table", "labelEs": "Mesa baja", "cell": [1, 0],
        "span": [1, 1], "kind": "prop", "meters": [1.6, 0.5], "tags": ["cover-half"]},
       ...]}

What it does with each piece, in order:
  1. crops its cell(s) by the grid (no coordinates to write);
  2. keys out the background (every pixel within KEY_TOL of the key colour, default magenta);
  3. shrinks it by `factor` by majority vote per block (no colour blending: edges stay crisp; a
     block is opaque when at least half of it is);
  4. quantises it to at most `colors` colours by median cut over its own pixels (`colors: 0`
     keeps them all);
  5. for kind "prop" (solid), draws the characters' 1 px line toward #07060b outside the
     silhouette, only where the edge pixel is not already dark (never a second line outside his
     own); kind "glow" gets none;
  6. trims to the drawing and sets the anchor at the bottom centre (the piece stood on the cell's
     bottom edge).
The round-trip report blows our piece back up by `factor` and compares it to his cell: the mean
colour distance per piece, and a warning when a piece is far off (anti-aliasing, a gradient,
something outside its cell).

Sheets that come back from an image generator rarely keep the template's geometry: it redraws
the grid at its own size, drops the label strips and ignores the scale figure for small things.
So, with `--auto-grid`, the cells are found from the sheet itself (the separators between the
key-colour cells), and a piece with `meters` in the spec is resampled to its real size
(57 px per metre, fitted inside that box) instead of trusting the drawn scale; a piece without
`meters` uses the scale figure's drawn height (cell 0) against our 94 px.

`--selftest` builds a sheet from approved world sprites in src/assets/world, converts it with
quantisation and outline off, and checks every piece comes back pixel for pixel. Deterministic:
same input, same bytes.
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

KEY_DEFAULT = (255, 0, 255)
KEY_TOL = 48          # distance from the key colour that still counts as background
KEY_TOL_SOFT = 110    # the same for anti-aliased sheets from an image generator (--auto-grid)
SPILL = 60            # key tint (min(R,B) - G) at which an edge pixel is dropped as spill
OUTLINE = (7, 6, 11)  # the characters' line colour
DARK_LUM = 60         # an edge pixel at most this bright is "already a line"
FAR_OFF = 18.0        # mean round-trip distance (0..255) above which a piece is flagged
FAR_OFF_SOFT = 60.0   # the same for --auto-grid sheets (averaged and quantised, never exact)
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))


# ------------------------------------------------------------------ image steps

def key_out(rgb, key, tol=KEY_TOL):
    """Alpha mask: 255 where the pixel is a drawing, 0 where it is the key colour."""
    d = np.sqrt(((rgb.astype(np.int32) - np.array(key, np.int32)) ** 2).sum(-1))
    return np.where(d <= tol, 0, 255).astype(np.uint8)


def shrink_majority(rgb, alpha, f):
    """Downsample by f with a majority vote per f x f block over the opaque pixels."""
    h, w = alpha.shape
    H, W = h // f, w // f
    out = np.zeros((H, W, 4), np.uint8)
    for y in range(H):
        for x in range(W):
            a = alpha[y * f:(y + 1) * f, x * f:(x + 1) * f]
            n = int((a > 0).sum())
            if n * 2 < f * f:
                continue
            block = rgb[y * f:(y + 1) * f, x * f:(x + 1) * f][a > 0].reshape(-1, 3)
            cols, counts = np.unique(block, axis=0, return_counts=True)
            # the most frequent colour; ties go to the darker one, so lines survive the vote
            best = np.lexsort((cols.sum(1), -counts))[0]
            out[y, x, :3] = cols[best]
            out[y, x, 3] = 255
    return out


def best_phase(rgb, f):
    """The (dx, dy) in 0..f-1 at which the f x f blocks are most uniform.

    Scaled-up pixel art is rarely laid on the template at a multiple of the factor; at the right
    phase nearly every block is one colour, at a wrong one the blocks straddle his pixels.
    """
    h, w = rgb.shape[:2]
    H, W = (h - f) // f, (w - f) // f
    best, best_n = (0, 0), None
    for dy in range(f):
        for dx in range(f):
            b = rgb[dy:dy + H * f, dx:dx + W * f].reshape(H, f, W, f, 3)
            mixed = int((b != b[:, :1, :, :1]).any(axis=(1, 3, 4)).sum())
            if best_n is None or mixed < best_n:
                best, best_n = (dx, dy), mixed
    return best


def detect_grid(rgb, key, cols, rows):
    """Cell boxes found from the sheet: runs of columns/rows that hold key colour, split by the
    separators (lines or gutters with none). Falls back to an even split when the count is off."""
    k = key_out(rgb, key) > 0
    h, w = k.shape

    def runs(frac, n, length):
        on = frac > 0.02
        out, start = [], None
        for i, v in enumerate(list(on) + [False]):
            if v and start is None:
                start = i
            elif not v and start is not None:
                if i - start > length // (n * 4):
                    out.append((start, i))
                start = None
        if len(out) != n:
            step = length / n
            out = [(int(i * step) + 2, int((i + 1) * step) - 2) for i in range(n)]
        return out

    return runs(k.mean(0), cols, w), runs(k.mean(1), rows, h)


def resample_majority(rgb, alpha, W, H):
    """Resample to W x H game pixels at any factor: each target pixel takes the majority colour of
    the source pixels that fall in it (opaque when at least half of them are)."""
    h, w = alpha.shape
    ys = (np.arange(h) * H // h)
    xs = (np.arange(w) * W // w)
    out = np.zeros((H, W, 4), np.uint8)
    for y in range(H):
        ry = np.where(ys == y)[0]
        if not len(ry):
            continue
        for x in range(W):
            rx = np.where(xs == x)[0]
            if not len(rx):
                continue
            a = alpha[ry[0]:ry[-1] + 1, rx[0]:rx[-1] + 1]
            n = int((a > 0).sum())
            if n * 2 < a.size:
                continue
            block = rgb[ry[0]:ry[-1] + 1, rx[0]:rx[-1] + 1][a > 0].reshape(-1, 3)
            cols, counts = np.unique(block, axis=0, return_counts=True)
            best = np.lexsort((cols.sum(1), -counts))[0]
            out[y, x, :3] = cols[best]
            out[y, x, 3] = 255
    return out


def key_weight(rgb, key):
    """How much of each pixel is drawing rather than key: 0 at the key colour, 1 from KEY_TOL_SOFT
    away, a ramp between (an edge pixel the generator blended with the background counts for the
    part of it that is drawing)."""
    d = np.sqrt(((rgb.astype(np.int32) - np.array(key, np.int32)) ** 2).sum(-1))
    by_dist = np.clip((d - KEY_TOL) / float(KEY_TOL_SOFT - KEY_TOL), 0.0, 1.0)
    # and by hue: a saturated pixel near the key's hue is key bleeding through a gap or an edge,
    # whatever its brightness (wood blended with magenta turns purple, still far from the key)
    f = rgb.astype(np.float64)
    mx, mn = f.max(-1), f.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0.0)
    kf = np.array(key, np.float64)
    kmx, kmn = kf.max(), kf.min()
    hue = _hue(f, mx, mn)
    khue = float(_hue(kf[None, None, :], np.array([[kmx]]), np.array([[kmn]]))[0, 0])
    dh = np.abs((hue - khue + 180.0) % 360.0 - 180.0)
    keyness = np.clip(1.0 - dh / 35.0, 0.0, 1.0) * np.clip((sat - 0.25) / 0.5, 0.0, 1.0)
    return np.minimum(by_dist, 1.0 - keyness)


def _hue(f, mx, mn):
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    c = np.maximum(mx - mn, 1e-9)
    h = np.where(mx == r, ((g - b) / c) % 6.0, np.where(mx == g, (b - r) / c + 2.0, (r - g) / c + 4.0))
    return (h * 60.0) % 360.0


def resample_average(rgb, alpha, W, H):
    """Resample to W x H game pixels by averaging the source pixels in each target pixel, each
    weighted by `alpha` (0..1 or 0..255). For sheets that are not real pixel art (an image
    generator's anti-aliased strokes) this keeps the values the eye sees and leaves the key colour
    out of the edges; quantisation then brings the bands back."""
    h, w = alpha.shape
    ys = (np.arange(h) * H // h)
    xs = (np.arange(w) * W // w)
    out = np.zeros((H, W, 4), np.uint8)
    a = alpha.astype(np.float64)
    if a.max() > 1.0:
        a = a / 255.0
    col = rgb.astype(np.float64) * a[..., None]
    # sums per target cell through cumulative sums along each axis
    for y in range(H):
        ry = np.where(ys == y)[0]
        if not len(ry):
            continue
        rows_a = a[ry[0]:ry[-1] + 1].sum(0)
        rows_c = col[ry[0]:ry[-1] + 1].sum(0)
        for x in range(W):
            rx = np.where(xs == x)[0]
            if not len(rx):
                continue
            n = rows_a[rx[0]:rx[-1] + 1].sum()
            if n * 2 < len(ry) * len(rx) or n <= 0:
                continue
            out[y, x, :3] = np.round(rows_c[rx[0]:rx[-1] + 1].sum(0) / n)
            out[y, x, 3] = 255
    return out


def despill(img, key):
    """Drops edge pixels that are mostly the key colour (anti-aliasing blended into the
    background) and pulls the key tint out of the rest of the edge."""
    out = img.copy()
    kr, kg, kb = key
    a = out[..., 3] > 0
    pad = np.pad(a, 1)
    h, w = a.shape
    edge = a & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    rgb = out[..., :3].astype(np.int32)
    # how much of the pixel is key: magenta = high red and blue, low green
    tint = np.clip((np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]), 0, 255)
    gone = edge & (tint > SPILL)
    out[gone] = 0
    return out


def median_cut(cols, n):
    """Palette of at most n colours by median cut over the given (k, 3) colours."""
    boxes = [cols.astype(np.int32)]
    while len(boxes) < n:
        boxes.sort(key=lambda b: -(b.max(0) - b.min(0)).max() if len(b) > 1 else 0)
        b = boxes.pop(0)
        if len(b) <= 1:
            boxes.append(b)
            break
        axis = int(np.argmax(b.max(0) - b.min(0)))
        b = b[np.argsort(b[:, axis], kind='stable')]
        m = len(b) // 2
        boxes += [b[:m], b[m:]]
    return np.array([np.round(b.mean(0)) for b in boxes if len(b)], np.uint8)


def quantize(img, n):
    if n <= 0:
        return img
    opaque = img[..., 3] > 0
    cols = img[opaque][:, :3]
    uniq = np.unique(cols, axis=0)
    if len(uniq) <= n:
        return img
    pal = median_cut(uniq, n)
    d = ((cols[:, None, :].astype(np.int32) - pal[None, :, :].astype(np.int32)) ** 2).sum(-1)
    out = img.copy()
    out[opaque, :3] = pal[d.argmin(1)]
    return out


def outline(img):
    """The 1 px line outside the silhouette, skipped where the edge pixel is already dark."""
    a = img[..., 3] > 0
    lum = img[..., :3].astype(np.int32) @ np.array([30, 59, 11]) // 100
    pad = np.pad(a, 1)
    out = img.copy()
    h, w = a.shape
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nb = pad[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]  # neighbour in that direction is opaque
        edge = ~a & nb
        # the opaque neighbour itself
        ny = np.clip(np.arange(h)[:, None] + dy, 0, h - 1)
        nx = np.clip(np.arange(w)[None, :] + dx, 0, w - 1)
        bright = lum[ny, nx] > DARK_LUM
        where = edge & bright & (out[..., 3] == 0)
        out[where, :3] = OUTLINE
        out[where, 3] = 255
    return out


def trim(img):
    a = np.argwhere(img[..., 3] > 0)
    if not len(a):
        return img[:1, :1], (0, 0)
    (y0, x0), (y1, x1) = a.min(0), a.max(0) + 1
    return img[y0:y1, x0:x1], (int(x0), int(y0))


def to_image(arr):
    return Image.fromarray(np.ascontiguousarray(arr), 'RGBA')


# ------------------------------------------------------------------ the conversion

def cell_box(spec, cx, cy, sw, sh):
    """Picture-pixel box of the cells [cx, cx+sw) x [cy, cy+sh): the template's geometry
    (make-template.py: a reminder strip on top, a label strip under every row)."""
    c, g = spec['cell'], spec['gutter']
    top, strip = spec.get('top', 0), spec.get('strip', 0)
    x0 = g + cx * (c + g)
    y0 = top + g + cy * (c + g + strip)
    return x0, y0, x0 + sw * c + (sw - 1) * g, y0 + sh * c + (sh - 1) * (g + strip)


def convert(sheet, spec, out_dir, review_path=None, quant=True, line=True, auto_grid=False):
    img = np.asarray(Image.open(sheet).convert('RGB'))
    key = tuple(spec.get('key', KEY_DEFAULT))
    f = spec['factor']
    group = spec['group']
    grid = detect_grid(img, key, spec['cols'], spec['rows']) if auto_grid else None
    fig_factor = None
    if auto_grid:
        # the drawn scale figure's height against our figure's (scale-figure.png, 95 px)
        (cx0, cx1), (cy0, cy1) = grid[0][0], grid[1][0]
        cell0 = img[cy0 + 3:cy1 - 3, cx0 + 3:cx1 - 3]
        drawn = np.argwhere(key_out(cell0, key) > 0)
        if len(drawn):
            fig_factor = (drawn[:, 0].max() - drawn[:, 0].min() + 1) / 95.0
    gdir = os.path.join(out_dir, group)
    os.makedirs(gdir, exist_ok=True)
    manifest = {'group': group, 'pxPerMeter': spec.get('pxPerMeter', 57), 'sprites': {}}
    report = []
    reviews = []
    for p in spec['pieces']:
        sw, sh = p.get('span', [1, 1])
        if 'box' in p:
            # a sheet laid out freely: the piece's box in picture pixels, written by hand
            x0, y0, x1, y1 = p['box']
        elif grid:
            cxs, cys = grid
            x0, x1 = cxs[p['cell'][0]][0] + 3, cxs[p['cell'][0] + sw - 1][1] - 3
            y0, y1 = cys[p['cell'][1]][0] + 3, cys[p['cell'][1] + sh - 1][1] - 3
        else:
            x0, y0, x1, y1 = cell_box(spec, p['cell'][0], p['cell'][1], sw, sh)
        crop = img[y0:y1, x0:x1].copy()
        for ex0, ey0, ex1, ey1 in p.get('erase', []):
            # something else's pixels inside the box (a stray piece) painted over with the key
            crop[max(0, ey0 - y0):max(0, ey1 - y0), max(0, ex0 - x0):max(0, ex1 - x0)] = key
        if grid or 'box' in p:
            # the drawn scale is not trusted: fit the piece to its metres, or to the figure's factor
            # a generator's anti-aliasing blends the key into the edge: key out more widely here
            alpha = key_out(crop, key, tol=KEY_TOL_SOFT)
            drawn = np.argwhere(alpha > 0)
            by0, bx0 = drawn.min(0)
            by1, bx1 = drawn.max(0) + 1
            crop, alpha = crop[by0:by1, bx0:bx1], alpha[by0:by1, bx0:bx1]
            bh, bw = alpha.shape
            if 'meters' in p:
                mw, mh = p['meters']
                sc = min(mw * 57 / bw, mh * 57 / bh)
            else:
                sc = 1.0 / (fig_factor or f)
            W, H = max(1, round(bw * sc)), max(1, round(bh * sc))
            small = despill(resample_average(crop, key_weight(crop, key), W, H), key)
            f_piece = bw / W
        else:
            # keep whole blocks only: the gutter inside a span is dropped from the shrink by cropping
            # the piece to the cells' union (the gutter is key colour, so it shrinks to nothing)
            dx, dy = best_phase(crop, f)
            crop = crop[dy:, dx:]
            alpha = key_out(crop, key)
            hh, ww = (crop.shape[0] // f) * f, (crop.shape[1] // f) * f
            small = shrink_majority(crop[:hh, :ww], alpha[:hh, :ww], f)
            f_piece = f
        if quant:
            small = quantize(small, spec.get('colors', 32))
        if line and p.get('kind', 'prop') == 'prop':
            small = outline(small)
        piece, (tx, ty) = trim(small)
        ph, pw = piece.shape[:2]
        name = p['id']
        to_image(piece).save(os.path.join(gdir, f'{name}.png'))
        manifest['sprites'][name] = {
            'label': p.get('label', name), 'labelEs': p.get('labelEs', p.get('label', name)),
            'file': f'{name}.png', 'frameW': pw, 'frameH': ph,
            'anchor': [pw // 2, ph - 1], 'meters': p.get('meters', [round(pw / 57, 2), round(ph / 57, 2)]),
            'tags': p.get('tags', []), 'anims': {'idle': {'row': 0, 'frames': 1, 'fps': 0, 'loop': True}},
        }
        # round trip: our piece back at his scale against his drawing
        if f_piece == int(f_piece):
            fi = int(f_piece)
            back = np.kron(piece[..., :3], np.ones((fi, fi, 1), np.uint8))
            back_a = np.kron(piece[..., 3] > 0, np.ones((fi, fi), bool))
            his = crop[ty * fi:ty * fi + ph * fi, tx * fi:tx * fi + pw * fi]
            his_a = alpha[ty * fi:ty * fi + ph * fi, tx * fi:tx * fi + pw * fi] > 0
        else:
            hb, wb = alpha.shape
            up = np.asarray(to_image(small).resize((wb, hb), Image.NEAREST))
            back, back_a, his, his_a = up[..., :3], up[..., 3] > 0, crop, alpha > 0
        both = back_a & his_a
        dist = float(np.sqrt(((back[both].astype(np.int32) - his[both].astype(np.int32)) ** 2).sum(-1)).mean()) if both.any() else 0.0
        cover = float(both.sum() / max(1, (back_a | his_a).sum()))
        flag = dist > (FAR_OFF_SOFT if (grid or 'box' in p) else FAR_OFF) or cover < 0.9
        report.append((name, pw, ph, dist, cover, flag))
        reviews.append((p.get('labelEs', name), crop, piece, flag, f_piece))
    with open(os.path.join(gdir, 'manifest.json'), 'w') as fh:
        json.dump(manifest, fh, indent=1)
    if review_path:
        write_review(reviews, f, review_path)
    return report


def write_review(reviews, f, path):
    """His crop beside our piece at the same scale (4x of game pixels), Spanish labels."""
    K = 4
    pad, top = 16, 28
    cols = []
    for label, crop, piece, flag, fp in reviews:
        his = Image.fromarray(crop).resize((max(1, round(crop.shape[1] * K / fp)), max(1, round(crop.shape[0] * K / fp))), Image.NEAREST)
        ours = to_image(piece).resize((piece.shape[1] * K, piece.shape[0] * K), Image.NEAREST)
        colw = max(his.width, ours.width, 150)
        w = colw * 2 + pad * 3
        h = top + max(his.height, ours.height) + pad * 2
        tile = Image.new('RGB', (w, h), (28, 26, 34))
        d = ImageDraw.Draw(tile)
        d.text((pad, 6), f'{label}: Tu dibujo', fill=(230, 220, 200))
        d.text((pad * 2 + colw, 6), 'En el juego' + ('  (revisar)' if flag else ''), fill=(255, 120, 120) if flag else (230, 220, 200))
        tile.paste(his, (pad, top))
        bg = Image.new('RGB', ours.size, (60, 56, 70))
        bg.paste(ours, (0, 0), ours)
        tile.paste(bg, (pad * 2 + colw, top))
        cols.append(tile)
    W = max(t.width for t in cols)
    H = sum(t.height for t in cols)
    sheet = Image.new('RGB', (W, H), (28, 26, 34))
    y = 0
    for t in cols:
        sheet.paste(t, (0, y))
        y += t.height
    sheet.save(path)


# ------------------------------------------------------------------ self test

def selftest(out_dir):
    """A sheet made from approved world sprites must convert back to the same pixels."""
    from PIL import Image as I
    src = os.path.join(REPO, 'src', 'assets', 'world', 'camp')
    with open(os.path.join(src, 'manifest.json')) as fh:
        man = json.load(fh)
    names = ['crate', 'barrel', 'tent', 'sacks', 'weapon_rack']
    f, cell, gutter = 8, 1024, 32
    game = cell // f
    frames = {}
    spans = {}
    for n in names:
        m = man['sprites'][n]
        im = I.open(os.path.join(src, m['file'])).convert('RGBA')
        arr = np.asarray(im.crop((0, 0, m['frameW'], m['frameH'])))
        piece, _ = trim(arr)
        frames[n] = piece
        spans[n] = (-(-piece.shape[1] // game), -(-piece.shape[0] // game))  # cells a piece needs
    # lay the pieces out left to right in one row of spans, after the scale figure's cell
    cols = 1 + sum(sw for sw, _ in spans.values())
    rows = max(sh for _, sh in spans.values())
    W = gutter + cols * (cell + gutter)
    H = gutter + rows * (cell + gutter)
    sheet = I.new('RGB', (W, H), KEY_DEFAULT)
    spec = {'group': 'selftest', 'factor': f, 'cell': cell, 'gutter': gutter, 'cols': cols, 'rows': rows, 'colors': 0, 'pieces': []}
    cx = 1
    for n in names:
        piece, (sw, sh) = frames[n], spans[n]
        x0, y0, x1, y1 = cell_box(spec, cx, rows - sh, sw, sh)
        big = to_image(piece).resize((piece.shape[1] * f, piece.shape[0] * f), I.NEAREST)
        # off the block grid on purpose (3 px, 5 px): a sheet never comes aligned, the phase is found
        sheet.paste(big, (x0 + (x1 - x0 - big.width) // 2 + 3, y1 - big.height - 5), big)
        spec['pieces'].append({'id': n, 'label': n, 'cell': [cx, rows - sh], 'span': [sw, sh], 'kind': 'prop'})
        cx += sw
    os.makedirs(out_dir, exist_ok=True)
    sp = os.path.join(out_dir, 'selftest_sheet.png')
    sheet.save(sp)
    rep = convert(sp, spec, out_dir, os.path.join(out_dir, 'selftest_review.png'), quant=False, line=False)
    ok = True
    for n in names:
        got = np.asarray(I.open(os.path.join(out_dir, 'selftest', f'{n}.png')).convert('RGBA'))
        want = frames[n]
        same = got.shape == want.shape and bool(np.array_equal(got[..., 3] > 0, want[..., 3] > 0)) and bool(np.array_equal(got[got[..., 3] > 0][:, :3], want[want[..., 3] > 0][:, :3]))
        print(f'{n:12s} {got.shape[1]}x{got.shape[0]}  {"ok" if same else "DIFFERENT"}')
        ok &= same
    for name, pw, ph, dist, cover, flag in rep:
        print(f'  round trip {name:12s} dist {dist:5.1f} cover {cover:4.2f}{"  REVISAR" if flag else ""}')
    print('selftest', 'passed' if ok else 'FAILED')
    return ok


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('sheet', nargs='?')
    ap.add_argument('spec', nargs='?')
    ap.add_argument('--out', help='output root (the group is written under it); never src/assets directly')
    ap.add_argument('--review', help='the "Tu dibujo / En el juego" sheet to write')
    ap.add_argument('--no-quantize', action='store_true')
    ap.add_argument('--no-outline', action='store_true')
    ap.add_argument('--auto-grid', action='store_true', help='find the cells in the sheet itself and fit pieces to their metres (sheets from an image generator)')
    ap.add_argument('--selftest', metavar='DIR')
    a = ap.parse_args()
    if a.selftest:
        sys.exit(0 if selftest(a.selftest) else 1)
    if not (a.sheet and a.spec and a.out):
        ap.error('sheet, spec and --out are required (or --selftest DIR)')
    with open(a.spec) as fh:
        spec = json.load(fh)
    rep = convert(a.sheet, spec, a.out, a.review, quant=not a.no_quantize, line=not a.no_outline, auto_grid=a.auto_grid)
    for name, pw, ph, dist, cover, flag in rep:
        print(f'{name:16s} {pw:4d}x{ph:<4d} round trip {dist:5.1f}  cover {cover:4.2f}{"  REVISAR: lejos de su dibujo" if flag else ""}')


if __name__ == '__main__':
    main()
