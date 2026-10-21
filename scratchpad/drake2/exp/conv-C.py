"""Turns the owner's reference sheets into game frames for vfx_beasts (the phoenix, the raiju, the crane, the drake).

    python3 -I beasts-from-ref.py phoenix REF-phoenix-owner.jpg REF-raiju-owner.jpg <out.ts> [debugDir]
    python3 -I beasts-from-ref.py raiju   REF-raiju-owner.jpg   REF-raiju-owner.jpg <out.ts> [debugDir]
    python3 -I beasts-from-ref.py crane   REF-wind-set-owner.jpg REF-wind-set-owner.jpg <out.ts> [debugDir]
    python3 -I beasts-from-ref.py drake   REF-earth-set-owner.jpg REF-earth-set-owner.jpg <out.ts> [debugDir]

The owner asked for his sheets to be copied as exactly as possible, so his panels ARE the frames:
each numbered fly-loop panel is cropped, its olive background, frame number and anchor ticks
removed, scaled so the beast matches his scale row next to our character (the raiju sheet's bottom
row: the ninja on the left is our 96 px character), area-averaged down, snapped to a palette sampled
from his own pixels, and cleaned to a 1 px dark outline in his outline colour. Every frame is placed
on one canvas with the anchor his ticks mark, so the loop does not jitter. Glows that are not part
of the body (the raiju's speed streaks, arcs and sparks, the phoenix's embers and smoke) keep no
outline; the raiju's semi-transparent streaks are un-mixed from the background into cream with alpha.
The phoenix's dive and attack are built around his key frames with in-betweens derived from them:
the wings and tail sway by a smooth warp, the embers drift, and the fireball grows out of the beak
and flies off. The result is a TypeScript data module (palette + run-length rows) that the generator
(tools/world-sprites/vfx-beasts.ts) decodes, so the build needs no image files. Deterministic.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

MODE, REF, SCALE_REF, OUT_TS = sys.argv[1:5]
DEBUG = sys.argv[5] if len(sys.argv) > 5 else None
CHAR_H = 96.0  # our character (kit characterRef), feet to hair, at 1x

ref = np.asarray(Image.open(REF).convert('RGB')).astype(np.float32)
sref = np.asarray(Image.open(SCALE_REF).convert('RGB')).astype(np.float32)


# --- shared helpers --------------------------------------------------------------------------------------

def components(mask):
    H, W = mask.shape
    lab = -np.ones((H, W), np.int32)
    out = []
    ys, xs = np.nonzero(mask)
    for y, x in zip(ys.tolist(), xs.tolist()):
        if lab[y, x] >= 0:
            continue
        q = deque([(y, x)])
        lab[y, x] = len(out)
        pts = []
        while q:
            cy, cx = q.popleft()
            pts.append((cy, cx))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and lab[ny, nx] < 0:
                        lab[ny, nx] = len(out)
                        q.append((ny, nx))
        out.append(pts)
    return out


def dilate(m, n):
    for _ in range(n):
        g = m.copy()
        g[1:] |= m[:-1]
        g[:-1] |= m[1:]
        g[:, 1:] |= m[:, :-1]
        g[:, :-1] |= m[:, 1:]
        m = g
    return m


def border_bg(crop):
    ring = np.concatenate([crop[5:9, 30:-30].reshape(-1, 3), crop[-9:-5, 60:-30].reshape(-1, 3)])
    return np.median(ring, 0)


def warp(arr, dx, dy):
    """Samples arr at (x - dx, y - dy), bilinear (arr is H x W or H x W x C)."""
    H, W = arr.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sx = np.clip(xx - dx, 0, W - 1.001)
    sy = np.clip(yy - dy, 0, H - 1.001)
    x0 = np.floor(sx).astype(int)
    y0 = np.floor(sy).astype(int)
    fx = sx - x0
    fy = sy - y0
    if arr.ndim == 3:
        fx = fx[..., None]
        fy = fy[..., None]
    a = arr[y0, x0] * (1 - fx) + arr[y0, x0 + 1] * fx
    b = arr[y0 + 1, x0] * (1 - fx) + arr[y0 + 1, x0 + 1] * fx
    return a * (1 - fy) + b * fy


def shrink(rgb, cov, anchor, s, out_size, out_anchor):
    """Area-averages coverage `cov` and the colour under it onto the output grid, anchors aligned."""
    H, W = cov.shape
    ow, oh = out_size
    ax, ay = anchor
    oax, oay = out_anchor
    x0 = ax - oax / s
    y0 = ay - oay / s
    pad = int(max(ow, oh) / s) + 4
    def big(a):
        z = np.zeros((H + 2 * pad, W + 2 * pad), np.float32)
        z[pad:pad + H, pad:pad + W] = a
        return Image.fromarray(z, 'F')
    box = (x0 + pad, y0 + pad, x0 + pad + ow / s, y0 + pad + oh / s)
    A = np.asarray(big(cov).resize((ow, oh), Image.BOX, box=box))
    ch = [np.asarray(big(rgb[..., c] * cov).resize((ow, oh), Image.BOX, box=box)) for c in range(3)]
    ch = np.stack(ch, -1)
    col = np.where(A[..., None] > 1e-4, ch / np.maximum(A[..., None], 1e-4), 0)
    return A, col


def snap(col, pal):
    d = ((col[..., None, :] - pal[None, None]) ** 2).sum(-1)
    return pal[np.argmin(d, -1)]


def median_palette(pixels, n):
    img = Image.fromarray(pixels.astype(np.uint8).reshape(1, -1, 3), 'RGB')
    q = img.quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    return np.array(q.getpalette()[:n * 3], np.float32).reshape(-1, 3)


def best_shift(a, b, R=30):
    """Translation (dx, dy) that best lays mask b onto mask a."""
    best, arg = -1, (0, 0)
    H, W = a.shape
    for dy in range(-R, R + 1):
        for dx in range(-R, R + 1):
            ys0, ys1 = max(0, dy), min(H, H + dy)
            xs0, xs1 = max(0, dx), min(W, W + dx)
            ov = (a[ys0:ys1, xs0:xs1] * b[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]).sum()
            if ov > best:
                best, arg = ov, (dx, dy)
    return arg


def outline_clean(op):
    """Pinholes filled and specks dropped; returns (opaque, edge ring)."""
    nb = np.zeros(op.shape, np.int32)
    for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nb += np.roll(np.roll(op, oy, 0), ox, 1)
    op = (op & (nb >= 1)) | (~op & (nb >= 3))
    edge = np.zeros_like(op)
    for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        edge |= op & ~np.roll(np.roll(op, oy, 0), ox, 1)
    return op, edge


def bbox_main(img, x0, y0, x1, y1, kind):
    """Bounding box of the biggest thing in a region of a sheet (for measuring his scale row)."""
    c = img[y0:y1, x0:x1]
    bg = border_bg(c)
    diff = np.abs(c - bg).sum(2)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    if kind == 'char':
        m = diff > 70
    elif kind == 'warm':
        m = ((r - b > 45) & (diff > 45)) | ((r > g + 18) & (r > b + 18) & (diff > 40))
    else:
        m = (r - b > 60) & (diff > 60)
    m[:8] = m[-8:] = False
    m[:, :8] = m[:, -8:] = False
    pts = max(components(m), key=len)
    ys = [p[0] for p in pts]
    xs = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


if MODE in ('phoenix', 'raiju'):
    # His scale row (bottom of the raiju sheet): the ninja, the phoenix, the raiju at flight height.
    cx0, cy0, cx1, cy1 = bbox_main(sref, 40, 1040, 520, 1460, 'char')
    REF_CHAR_H = cy1 - cy0 + 1
    px0, py0, px1, py1 = bbox_main(sref, 520, 1040, 1000, 1460, 'warm')
    REF_PHX_H = py1 - py0 + 1
    rx0, ry0, rx1, ry1 = bbox_main(sref, 1100, 1040, 1900, 1460, 'yellow')
    REF_RAI_H = ry1 - ry0 + 1
    print('scale row: character', REF_CHAR_H, 'phoenix', REF_PHX_H, 'raiju', REF_RAI_H)

ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-./:;<=>?@[]^_{|}'


def write_module(frames, size, anchor, note):
    colors = {}
    def cid(px):
        key = '#%02x%02x%02x%02x' % tuple(int(v) for v in px)
        if key not in colors:
            colors[key] = len(colors) + 1
        return colors[key]
    OW, OH = size
    enc = {}
    for anim, fr in frames.items():
        enc[anim] = []
        for img in fr:
            rows = []
            for y in range(OH):
                ids = [0 if img[y, x][3] == 0 else cid(img[y, x]) for x in range(OW)]
                toks = []
                x = 0
                while x < OW:
                    n = 1
                    while x + n < OW and ids[x + n] == ids[x]:
                        n += 1
                    toks.append(ALPH[ids[x]] + (str(n) if n > 1 else ''))
                    x += n
                rows.append(''.join(toks))
            enc[anim].append(rows)
    assert len(colors) < len(ALPH), len(colors)
    pal = ['#00000000'] + list(colors.keys())
    ts = ["// Generated by art2/beasts-from-ref.py from the owner's reference sheet. Do not edit by hand.", '//']
    ts += ['// ' + line for line in note]
    ts += ['//', f'// Each frame is {OW}x{OH} with the anchor at ({anchor[0]}, {anchor[1]}). Rows are run-length encoded: a symbol', '// (an index into PALETTE through ALPHABET, 0 = clear) followed by its repeat count when above one.', '']
    ts.append(f'export const SIZE: [number, number] = [{OW}, {OH}];')
    ts.append(f'export const ANCHOR: [number, number] = [{anchor[0]}, {anchor[1]}];')
    ts.append(f"export const ALPHABET = '{ALPH}';")
    ts.append('export const PALETTE: string[] = [')
    for i in range(0, len(pal), 8):
        ts.append('  ' + ', '.join(f"'{c}'" for c in pal[i:i + 8]) + ',')
    ts.append('];')
    ts.append('export const FRAMES: Record<string, string[][]> = {')
    for anim, fr in enc.items():
        ts.append(f'  {anim}: [')
        for f in fr:
            ts.append('    [')
            for row in f:
                ts.append(f"      '{row}',")
            ts.append('    ],')
        ts.append('  ],')
    ts.append('};')
    ts.append('')
    tmp = OUT_TS + '.part'
    with open(tmp, 'w') as fh:
        fh.write('\n'.join(ts))
    os.replace(tmp, OUT_TS)
    print('colors', len(colors), 'bytes', os.path.getsize(OUT_TS))


def sidecar(tag, info):
    """Where each frame came from (for the review sheets): scale, panel boxes and anchors in his sheet."""
    import json
    if not DEBUG:
        return
    path = os.path.join(DEBUG, f'beasts-ref-{tag}.json')
    tmp = path + '.part'
    with open(tmp, 'w') as fh:
        json.dump(info, fh, indent=1)
    os.replace(tmp, path)


def debug(frames, size, tag):
    if not DEBUG:
        return
    OW, OH = size
    for anim, fr in frames.items():
        strip = np.zeros((OH, OW * len(fr), 4), np.uint8)
        for i, f in enumerate(fr):
            strip[:, i * OW:(i + 1) * OW] = f
        bg = Image.new('RGBA', (strip.shape[1], OH), (0x5d, 0x6b, 0x57, 255))
        bg.alpha_composite(Image.fromarray(strip, 'RGBA'))
        bg.resize((bg.width * 3, bg.height * 3), Image.NEAREST).save(os.path.join(DEBUG, f'{tag}-{anim}.png'))


def canvas_for(anchors, pw, ph, s, extra_right=0):
    """Output canvas size and anchor that hold every panel."""
    axs = [a[0] for a in anchors]
    ays = [a[1] for a in anchors]
    oax = int(np.ceil(max(axs) * s)) + 3
    oay = int(np.ceil(max(ays) * s)) + 3
    ow = oax + int(np.ceil((pw - min(axs)) * s)) + 3 + extra_right
    oh = oay + int(np.ceil((ph - min(ays)) * s)) + 3
    return (ow, oh), (oax, oay)


# =========================================================================================================
# PHOENIX
# =========================================================================================================

def phoenix():
    COLS = [(11, 256), (263, 509), (516, 761), (768, 1013)]
    ROWS = {'top': (25, 178), 'r1': (210, 348), 'r2': (355, 493)}

    def panel(row, col):
        y0, y1 = ROWS[row]
        x0, x1 = COLS[col]
        return ref[y0:y1, x0:x1].copy()

    def masks(crop, row):
        r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
        bg = border_bg(crop)
        diff = np.abs(crop - bg).sum(2)
        bird = ((r - b > 45) & (diff > 45)) | ((r > g + 18) & (r > b + 18) & (diff > 40))
        lum = crop.sum(2)
        # White-hot cores (the fireball, the brightest flame) are part of the bird: close small gaps.
        bird = bird | (~dilate(~dilate(bird, 3), 3) & (diff > 60))
        sat = crop.max(2) - crop.min(2)
        smoke = ~bird & (sat < 30) & (lum < bg.sum() - 26) & ~dilate(bird, 3)
        for m in (bird, smoke):
            m[-22:, :24] = False
            m[:4, :] = m[-4:, :] = False
            m[:, :4] = m[:, -4:] = False
            if row == 'top':
                m[:16, :170] = False
        return bird, smoke

    def layers(crop, row, fireball=False):
        bird, smoke = masks(crop, row)
        H, W = bird.shape
        body = np.zeros((H, W), np.float32)
        ember = np.zeros((H, W), np.float32)
        ball = np.zeros((H, W), np.float32)
        comps = sorted(components(bird), key=len, reverse=True)
        bbox = None
        if fireball:
            for i, pts in enumerate(comps):
                xs = np.array([p[1] for p in pts])
                if i > 0 and len(pts) > 300 and xs.mean() > W * 0.7:
                    ys = np.array([p[0] for p in pts])
                    bbox = (xs.min() - 30, ys.min() - 20, xs.max() + 12, ys.max() + 20)
        for i, pts in enumerate(comps):
            ys = np.array([p[0] for p in pts])
            xs = np.array([p[1] for p in pts])
            if bbox and xs.min() >= bbox[0] and xs.max() <= bbox[2] and ys.min() >= bbox[1] and ys.max() <= bbox[3]:
                ball[ys, xs] = 1  # the fireball and the sparks of its trail
            elif len(pts) >= 120:
                body[ys, xs] = 1  # (smaller bits are embers and flame flakes: no outline)
            else:
                ember[ys, xs] = 1
        return body, ember, smoke.astype(np.float32), ball

    def tick_x(row, col):
        y0, _ = ROWS[row]
        x0, x1 = COLS[col]
        return float(np.argmax(ref[y0:y0 + 4, x0:x1].sum(2).max(0)))

    LOOP = [('r1', c) for c in range(4)] + [('r2', c) for c in range(4)]
    anchors = {rc: (tick_x(*rc), 79.0 if rc[0] == 'r1' else 80.0) for rc in LOOP}
    mt = masks(panel('top', 0), 'top')[0].astype(np.float32)
    ml = masks(panel('r1', 0), 'r1')[0].astype(np.float32)
    h, w = min(mt.shape[0], ml.shape[0]), min(mt.shape[1], ml.shape[1])
    sdx, sdy = best_shift(mt[:h, :w], ml[:h, :w])
    top_anchor = (anchors[('r1', 0)][0] + sdx, anchors[('r1', 0)][1] + sdy)
    body0 = layers(panel('r1', 0), 'r1')[0]
    ys = np.nonzero(body0.any(1))[0]
    target_h = CHAR_H * REF_PHX_H / REF_CHAR_H
    S = target_h / (ys.max() - ys.min() + 1)
    print('phoenix: top-row shift', (sdx, sdy), 'target height', round(target_h, 1), 'scale', round(S, 4))
    size, oanchor = canvas_for(list(anchors.values()) + [top_anchor], 246, 153, S, extra_right=16)
    OW, OH = size

    samples = []
    for row, col in LOOP + [('top', 2), ('top', 3)]:
        crop = panel(row, col)
        samples.append(crop[masks(crop, row)[0]])
    PAL = median_palette(np.concatenate(samples), 48)
    lumv = PAL @ np.array([0.3, 0.55, 0.15], np.float32)
    OUTLINE = PAL[np.argmin(lumv + (PAL[:, 0] < PAL[:, 2]) * 999)]
    smk = np.concatenate([panel(r, c)[masks(panel(r, c), r)[1]] for r, c in [('r2', 2), ('r2', 3)]])
    SPAL = median_palette(smk, 3)
    print('phoenix outline', OUTLINE.astype(int).tolist())

    def frame(row, col, anchor, dx=None, dy=None, ember_shift=(0.0, 0.0), ball_at=None):
        crop = panel(row, col)
        body, ember, smoke, ball = layers(crop, row, fireball=ball_at is not None)
        crop_w = crop
        if dx is not None:
            crop_w = warp(crop, dx, dy)
            body = warp(body, dx, dy)
            smoke = warp(smoke, dx, dy)
        ember_col = crop
        if ember_shift != (0.0, 0.0):
            e = warp(np.concatenate([crop, ember[..., None]], -1), np.full(ember.shape, ember_shift[0], np.float32), np.full(ember.shape, ember_shift[1], np.float32))
            ember_col, ember = e[..., :3], e[..., 3]
        A, C = shrink(crop_w, body, anchor, S, size, oanchor)
        Ae, Ce = shrink(ember_col, ember, anchor, S, size, oanchor)
        As, Cs = shrink(crop_w, smoke, anchor, S, size, oanchor)
        out = np.zeros((OH, OW, 4), np.uint8)
        sm = As > 0.3
        out[sm, :3] = snap(Cs, SPAL)[sm]
        out[sm, 3] = np.where(As[sm] > 0.75, 190, np.where(As[sm] > 0.5, 150, 110)).astype(np.uint8)
        em = Ae > 0.22
        out[em, :3] = snap(Ce, PAL)[em]
        out[em, 3] = 255
        op, edge = outline_clean(A >= 0.5)
        out[op, :3] = snap(C, PAL)[op]
        out[op, 3] = 255
        if ball_at is not None and ball_at[2] > 0:
            bx, by, bs = ball_at
            ys_, xs_ = np.nonzero(ball)
            cxb, cyb = xs_.mean(), ys_.mean()
            Hh, Ww = ball.shape
            yy, xx = np.mgrid[0:Hh, 0:Ww].astype(np.float32)
            ddx = xx - (cxb + (xx - (cxb + bx)) / bs)
            ddy = yy - (cyb + (yy - (cyb + by)) / bs)
            Ab, Cb = shrink(warp(crop, ddx, ddy), warp(ball, ddx, ddy), anchor, S, size, oanchor)
            bm = Ab > 0.35
            out[bm, :3] = snap(Cb, PAL)[bm]
            out[bm, 3] = 255
        out[edge, :3] = OUTLINE
        out[edge, 3] = 255
        return out

    def flutter(row, col, anchor, k, n, amp_tail, amp_wing):
        H = ROWS[row][1] - ROWS[row][0]
        W = COLS[col][1] - COLS[col][0]
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        ph = 2 * np.pi * k / n
        rx, ry = xx - anchor[0], yy - anchor[1]
        dist = np.hypot(rx, ry)
        w = np.clip((dist - 14) / 50, 0, 1) ** 1.5
        tail = np.clip(-rx / 40, 0, 1)
        wing = np.clip(-ry / 50, 0, 1)
        dy = w * (tail * amp_tail * np.sin(ph - dist / 16) + wing * amp_wing * np.sin(ph + 0.6))
        dx = w * (wing * amp_wing * 0.5 * np.cos(ph + 0.6))
        return dx.astype(np.float32), dy.astype(np.float32)

    frames = {'fly': [frame(r, c, anchors[(r, c)]) for r, c in LOOP], 'dive': [], 'attack': []}
    # Dive: his DIVE FRAME 0 as the key of a five-frame loop; wings and tail sway, embers drift.
    for k in range(5):
        dx, dy = flutter('top', 2, top_anchor, k, 5, 3.2, 2.2)
        frames['dive'].append(frame('top', 2, top_anchor, dx, dy, ember_shift=(-(k % 5) * 2.2, -(k % 5) * 1.4)))
    # Attack (once): wings beat into his ATTACK FRAME 3 while the fireball grows out of the beak and flies.
    BEAK = -46.0  # the beak sits this far left of his fireball's centre (ref px)
    plan = [(0.0, None, 0), (0.25, BEAK + 4, 0.32), (0.5, BEAK + 22, 0.62), (0.75, 0.0, 1.0), (1.0, 18.0, 0.88), (1.25, None, 0)]
    for k, (ph, bx, bs) in enumerate(plan):
        dx, dy = flutter('top', 3, top_anchor, ph * 4, 4, 1.2, 1.8)
        frames['attack'].append(frame('top', 3, top_anchor, dx, dy, ember_shift=(-k * 1.5, -k * 1.0), ball_at=(bx if bx is not None else 0, 0, bs)))
    note = [
        "The phoenix (vfx_beasts/fire), copied from his phoenix sheet: the eight numbered fly panels are",
        "the fly loop; his DIVE FRAME 0 and ATTACK FRAME 3 are the keys of the dive and attack, with",
        f"in-betweens warped from them. Scale: his scale row puts the phoenix at {REF_PHX_H}/{REF_CHAR_H} of the",
        f"ninja's height, so frame 0 is {target_h:.0f} px tall next to our {CHAR_H:.0f} px character.",
    ]
    write_module(frames, size, oanchor, note)
    def src(row, col, anchor):
        (y0, y1), (x0, x1) = ROWS[row], COLS[col]
        return {'box': [x0, y0, x1, y1], 'anchor': [x0 + anchor[0], y0 + anchor[1]]}
    sidecar('fire', {'ref': os.path.basename(REF), 'scale': S, 'fly': [src(r, c, anchors[(r, c)]) for r, c in LOOP], 'dive': src('top', 2, top_anchor), 'attack': src('top', 3, top_anchor), 'scaleRow': [20, 1030, 1000, 1470]})
    debug(frames, size, 'phx')


# =========================================================================================================
# RAIJU
# =========================================================================================================

def raiju():
    COLS = [(22, 500), (514, 993), (1007, 1486), (1500, 1978)]
    ROWS = {'r1': (410, 679), 'r2': (692, 963)}
    FX = np.array([[255, 254, 240], [255, 244, 200], [255, 226, 122], [248, 200, 64], [200, 242, 255]], np.float32)

    def panel(row, col):
        y0, y1 = ROWS[row]
        x0, x1 = COLS[col]
        return ref[y0:y1, x0:x1].copy()

    def split(crop):
        """Body (outlined), and glow effects un-mixed from the background (alpha, colour)."""
        r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
        bg = border_bg(crop)
        diff = np.abs(crop - bg).sum(2)
        lum = crop.sum(2)
        solid = ((r - b > 95) & (diff > 90)) | ((r - g > 20) & (r - b > 50) & (diff > 60)) | ((lum < bg.sum() - 70) & (r > b + 25))
        for m in (solid,):
            m[:6, :] = m[-6:, :] = False
            m[:, :6] = m[:, -6:] = False
        H, W = solid.shape
        # Close narrow gaps (the white-hot core of the bolt tail, veins) that differ from the background.
        closed = ~dilate(~dilate(solid, 4), 4)
        solid = solid | (closed & (diff > 60))
        body = np.zeros((H, W), bool)
        for pts in components(solid):
            if len(pts) >= 150:
                ys = np.array([p[0] for p in pts])
                xs = np.array([p[1] for p in pts])
                body[ys, xs] = True
        # Holes inside the body that are not background (veins, highlights) belong to it.
        outside = np.zeros((H, W), bool)
        q = deque()
        for y in range(H):
            for x in (0, W - 1):
                if not body[y, x]:
                    outside[y, x] = True
                    q.append((y, x))
        for x in range(W):
            for y in (0, H - 1):
                if not body[y, x] and not outside[y, x]:
                    outside[y, x] = True
                    q.append((y, x))
        while q:
            y, x = q.popleft()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and not body[ny, nx] and not outside[ny, nx]:
                    outside[ny, nx] = True
                    q.append((ny, nx))
        holes = ~body & ~outside
        body |= holes & (diff > 60)
        # Effects: what differs from the background off the body, un-mixed as alpha over one of the glow colours.
        fx = (diff > 36) & ~dilate(body, 2)
        fx[:6, :] = fx[-6:, :] = False
        fx[:, :6] = fx[:, -6:] = False
        fx[-40:, :40] = False  # the frame number
        d = crop - bg
        best_a = np.zeros((H, W), np.float32)
        best_c = np.zeros((H, W, 3), np.float32)
        best_e = np.full((H, W), 1e9, np.float32)
        for E in FX:
            v = E - bg
            a = np.clip((d * v).sum(2) / (v * v).sum(), 0, 1)
            err = np.abs(d - a[..., None] * v).sum(2)
            better = err < best_e
            best_e = np.where(better, err, best_e)
            best_a = np.where(better, a, best_a)
            best_c = np.where(better[..., None], E, best_c)
        alpha = np.where(fx & (best_e < 90), best_a, 0).astype(np.float32)
        return body.astype(np.float32), alpha, best_c, bg

    def ticks(row, col):
        y0, y1 = ROWS[row]
        x0, x1 = COLS[col]
        lum = ref.sum(2)
        tx = float(np.argmax(lum[y0:y0 + 5, x0:x1].max(0)))
        ty = float(np.argmax(lum[y0:y1, x0:x0 + 5].max(1)))
        return tx, ty

    LOOP = [('r1', c) for c in range(4)] + [('r2', c) for c in range(4)]
    anchors = {rc: ticks(*rc) for rc in LOOP}
    # Scale: frame 3 in his scale row against the same frame in the loop, the ninja as our character.
    lx0, ly0, lx1, ly1 = bbox_main(ref, 1500, 410, 1978, 679, 'yellow')
    loop3_h = ly1 - ly0 + 1
    S = CHAR_H / REF_CHAR_H * REF_RAI_H / loop3_h
    print('raiju: anchors', anchors, 'loop3 h', loop3_h, 'scale', round(S, 4))
    size, oanchor = canvas_for(list(anchors.values()), 478, 269, S)
    OW, OH = size
    parts = {rc: split(panel(*rc)) for rc in LOOP}
    samples = np.concatenate([panel(*rc)[parts[rc][0] > 0] for rc in LOOP])
    PAL = median_palette(samples, 30)
    lumv = PAL @ np.array([0.3, 0.55, 0.15], np.float32)
    OUTLINE = PAL[np.argmin(lumv)]
    print('raiju outline', OUTLINE.astype(int).tolist())

    def frame(rc):
        crop = panel(*rc)
        body, alpha, fxc, bg = parts[rc]
        A, C = shrink(crop, body, anchors[rc], S, size, oanchor)
        Af, Cf = shrink(fxc, alpha, anchors[rc], S, size, oanchor)
        out = np.zeros((OH, OW, 4), np.uint8)
        # Glows: cream streaks, white arcs and sparks, with alpha.
        g = Af > 0.12
        out[g, :3] = snap(Cf, FX)[g]
        out[g, 3] = np.where(Af[g] > 0.7, 255, np.where(Af[g] > 0.45, 190, np.where(Af[g] > 0.25, 130, 80))).astype(np.uint8)
        op, edge = outline_clean(A >= 0.5)
        out[op, :3] = snap(C, PAL)[op]
        out[op, 3] = 255
        out[edge, :3] = OUTLINE
        out[edge, 3] = 255
        return out

    frames = {'fly': [frame(rc) for rc in LOOP]}
    note = [
        "The raiju (vfx_beasts/lightning), copied from his raiju paint-over: the eight numbered panels of",
        "his NEW FLY LOOP are the fly loop, aligned on his anchor ticks. Scale: his scale row shows frame 3",
        f"at {REF_RAI_H} px tall against a {REF_CHAR_H} px ninja; the loop panel shows it {loop3_h} px tall.",
    ]
    write_module(frames, size, oanchor, note)
    def src(rc):
        (y0, y1), (x0, x1) = ROWS[rc[0]], COLS[rc[1]]
        return {'box': [x0, y0, x1, y1], 'anchor': [x0 + anchors[rc][0], y0 + anchors[rc][1]]}
    sidecar('lightning', {'ref': os.path.basename(REF), 'scale': S, 'fly': [src(rc) for rc in LOOP], 'scaleRow': [20, 1030, 1980, 1470]})
    debug(frames, size, 'rai')


# =========================================================================================================
# CRANE (wind)
# =========================================================================================================

def crane():
    """His WIND CRANE (NEWER) panel: two frames, his paint-over of our frames 0 and 3 of the 6-frame flap.

    His two frames are our keys 0 and 3. The in-betweens keep his body from frame 0 and swing his raised
    wings (and the wind lines shed off them) back about the shoulder: 1 and 2 on the way down, 4 and 5 on
    the way back up, with a small bob toward his frame 3; the loose wisps, rings and leaves drift back.
    """
    PANEL = (337, 723, 703, 866)
    # Where our anchor lands in his two frames: found by laying our frames 0 and 3 (which he painted
    # over) onto his, at the game scale.
    KEY_ANCHORS = {0: (440.1, 798.4), 3: (618.1, 799.5)}
    WAX, WAY, CW, CH = 100, 80, 190, 140  # working canvas (his pixels) around each key's anchor
    # Our character's height against his, measured on his WALL panel: that sets the scale.
    c = ref[380:505, 340:405]
    bgc = np.median(np.concatenate([c[:3].reshape(-1, 3), c[-3:].reshape(-1, 3)]), 0)
    cr, cg, cb = c[..., 0], c[..., 1], c[..., 2]
    cm = (np.abs(c - bgc).sum(2) > 60) & ~((cg > cr + 15) & (cg >= cb - 5))
    rows = [y for y in range(cm.shape[0]) if cm[y].sum() >= 2]
    his_char_h = max(rows) - min(rows) + 1
    S = CHAR_H / his_char_h
    print('crane: his character', his_char_h, 'px tall, scale', round(S, 4))

    def key(k):
        """His frame k on the working canvas (anchor at WAX, WAY): colour, body coverage, effect coverage."""
        ax, ay = KEY_ANCHORS[k]
        ox, oy = int(np.floor(ax - WAX)), int(np.floor(ay - WAY))
        crop = ref[oy:oy + CH, ox:ox + CW].copy()
        x0, y0, x1, y1 = PANEL
        inside = np.zeros(crop.shape[:2], bool)
        ys, xs = np.mgrid[0:CH, 0:CW]
        inside = (xs + ox >= x0 + 3) & (xs + ox < x1 - 3) & (ys + oy >= y0 + 3) & (ys + oy < y1 - 3)
        # Keep each key to its own half of the panel.
        mid = 516
        inside &= (xs + ox < mid) if k == 0 else (xs + ox >= mid)
        bg = np.array([32, 32, 42], np.float32)
        diff = np.abs(crop - bg).sum(2)
        r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
        teal = (g > r + 25) & (diff > 70) & inside
        body = np.zeros(teal.shape, bool)
        for pts in components(teal):
            if len(pts) >= 150:
                yy = np.array([p[0] for p in pts])
                xx = np.array([p[1] for p in pts])
                body[yy, xx] = True
        body = body | (~dilate(~dilate(body, 2), 2) & (diff > 70) & inside)
        fx = (diff > 45) & inside & ~dilate(body, 1)
        return crop, body.astype(np.float32), fx.astype(np.float32), (ax - ox, ay - oy)

    keys = {k: key(k) for k in (0, 3)}
    samples = np.concatenate([keys[k][0][keys[k][1] > 0] for k in keys])
    PAL = median_palette(samples, 36)
    teal = PAL[(PAL[:, 1] > PAL[:, 0] + 10)]
    OUTLINE = teal[np.argmin(teal.sum(1))]
    fxs = np.concatenate([keys[k][0][keys[k][2] > 0] for k in keys])
    FXPAL = median_palette(fxs, 14)
    print('crane outline', OUTLINE.astype(int).tolist())

    # Frame 0's wings are everything above this line (working coords); the rest is the body.
    CUT0 = [(0, 74), (60, 76), (76, 77), (97, 76), (104, 73), (112, 69), (122, 66), (190, 64)]
    SHOULDER0 = (100.0, 73.0)
    yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)
    cut = np.interp(xx[0], [p[0] for p in CUT0], [p[1] for p in CUT0])[None, :].repeat(CH, 0)
    above = yy < cut

    def rot(arr, deg, pivot, dy=0.0):
        """arr swung by deg (screen degrees, negative swings raised wings back) about pivot, then moved dy.
        The swing eases in over the first few pixels from the pivot, so the wing bends at the root
        instead of shearing off the body."""
        px, py = pivot
        rx, ry = xx - px, yy - py - dy
        r = np.hypot(rx, ry)
        a = np.deg2rad(deg) * np.clip(r / 9.0, 0, 1) ** 2 * (3 - 2 * np.clip(r / 9.0, 0, 1))
        sx = px + rx * np.cos(a) + ry * np.sin(a)
        sy = py - rx * np.sin(a) + ry * np.cos(a)
        return warp(arr, xx - sx, yy - sy)

    def shift(arr, dx, dy):
        return warp(arr, np.full(arr.shape[:2], dx, np.float32), np.full(arr.shape[:2], dy, np.float32))

    size, oanchor = canvas_for([(WAX, WAY)], CW, CH, S)
    OW, OH = size

    def render(rgb, body, fx_rgb, fx, wing=None, anchor=(WAX, WAY)):
        A, C = shrink(rgb, body, anchor, S, size, oanchor)
        Af, Cf = shrink(fx_rgb, fx, anchor, S, size, oanchor)
        out = np.zeros((OH, OW, 4), np.uint8)
        g = Af > 0.3
        out[g, :3] = snap(Cf, FXPAL)[g]
        out[g, 3] = np.where(Af[g] > 0.6, 255, 170).astype(np.uint8)
        op = A >= 0.5
        if wing is not None:
            # Slivers left over where a swung wing used to be.
            for pts in components(op):
                if len(pts) < 16:
                    op[tuple(np.array(pts).T)] = False
        op, edge = outline_clean(op)
        out[op, :3] = snap(C, PAL)[op]
        out[op, 3] = 255
        out[edge, :3] = OUTLINE
        out[edge, 3] = 255
        if wing is not None:
            # The swung wing lies in front of the body: its own edge stays drawn where it crosses it,
            # away from the root (where it grows out of the back).
            Aw, _ = shrink(rgb, wing, anchor, S, size, oanchor)
            wm = (Aw >= 0.5) & op
            wedge = np.zeros_like(wm)
            for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                wedge |= wm & ~np.roll(np.roll(wm, oy, 0), ox, 1)
            gy, gx = np.mgrid[0:OH, 0:OW]
            sx_, sy_ = oanchor[0] + (SHOULDER0[0] - WAX) * S, oanchor[1] + (SHOULDER0[1] - WAY) * S
            wedge &= np.hypot(gx - sx_, gy - sy_) > 12
            out[wedge, :3] = OUTLINE
        return out

    def key_frame(k):
        crop, body, fx, (ax, ay) = keys[k]
        return render(crop, body, crop, fx, anchor=(ax, ay))

    crop0, body0, fx0, a0 = keys[0]
    crop3, _, fx3, a3 = keys[3]
    # Frame 0 on the shared grid (its anchor fraction folded in), split into the body and the raised wings.
    dx0, dy0 = WAX - a0[0], WAY - a0[1]
    rgb0 = shift(crop0, dx0, dy0)
    b0 = shift(body0, dx0, dy0)
    f0 = shift(fx0, dx0, dy0)
    # The wings: the pieces of body above the line that reach back past the shoulder (loose wisps off
    # to the right of them stay put).
    wings = np.zeros((CH, CW), bool)
    for pts in components((b0 > 0.5) & above):
        py_ = np.array([p[0] for p in pts])
        px_ = np.array([p[1] for p in pts])
        if px_.min() < 100 and len(pts) > 40:
            wings[py_, px_] = True
    wings = dilate(wings, 1) & above
    wing0 = b0 * wings
    band0 = b0 * ~wings
    wake0 = f0 * above  # the wind lines shed off the raised wings swing with them
    loose0 = f0 * ~above
    dx3, dy3 = WAX - a3[0], WAY - a3[1]
    rgb3 = shift(crop3, dx3, dy3)
    # His frame 3's loose wisps, without the wind lines under its lowered wing (that wing is not drawn here).
    loose3 = shift(fx3, dx3, dy3) * (yy >= 60) * ~((xx > 18) & (xx < 125) & (yy > 88))

    def between(deg, bob, loose, loose_rgb, drift, wake=True):
        w = rot(wing0, deg, SHOULDER0, bob)
        wr = rot(rgb0 * wing0[..., None], deg, SHOULDER0, bob)
        bd = shift(band0, 0, bob)
        br = shift(rgb0 * band0[..., None], 0, bob)
        cov = np.clip(w + bd * (1 - w), 0, 1)
        col = (wr + br * (1 - w)[..., None]) / np.maximum(cov, 1e-4)[..., None]
        # The wind lines shed off the wings stay level: they follow the wing without turning.
        cy_, cx_ = [float(v) for v in np.argwhere(wake0 > 0).mean(0)] if wake0.any() else (0.0, 0.0)
        a = np.deg2rad(deg)
        rx, ry = cx_ - SHOULDER0[0], cy_ - SHOULDER0[1]
        mx = SHOULDER0[0] + rx * np.cos(a) - ry * np.sin(a) - cx_
        my = SHOULDER0[1] + rx * np.sin(a) + ry * np.cos(a) - cy_ + bob
        wk = shift(wake0, mx - 6, my) * (1.0 if wake else 0.0)
        wkr = shift(rgb0 * wake0[..., None], mx - 6, my) * (1.0 if wake else 0.0)
        ls = shift(loose, drift, bob * 0.5) * (yy < 100)
        lsr = shift(loose_rgb * loose[..., None], drift, bob * 0.5) * (yy < 100)[..., None]
        fcov = np.clip(wk + ls, 0, 1)
        fcol = (wkr + lsr) / np.maximum(wk + ls, 1e-4)[..., None]
        return render(col, cov, fcol, fcov, wing=w)

    frames = {'fly': [
        key_frame(0),
        between(-40, -1.5, loose0, rgb0, -5),
        between(-80, -3.5, loose0, rgb0, -10, wake=False),
        key_frame(3),
        between(-68, -3.5, loose3, rgb3, -5, wake=False),
        between(-28, -1.5, loose3, rgb3, -10),
    ]}
    note = [
        "The wind crane (vfx_beasts/wind), copied from his wind sheet's BEAST (WIND CRANE, NEWER) panel:",
        "his two frames are frames 0 and 3; 1, 2, 4 and 5 swing his frame-0 wings back about the shoulder",
        f"and drift the wisps. Scale: his character is {his_char_h} px tall in that sheet, ours {CHAR_H:.0f}.",
    ]
    write_module(frames, size, oanchor, note)

    def src(k):
        ax, ay = KEY_ANCHORS[k]
        return {'box': [PANEL[0], PANEL[1], PANEL[2], PANEL[3]], 'anchor': [ax, ay]}
    sidecar('wind', {'ref': os.path.basename(REF), 'scale': S, 'keys': {'0': src(0), '3': src(3)}, 'panel': list(PANEL)})
    debug(frames, size, 'crane')


# =========================================================================================================
# DRAKE (earth)
# =========================================================================================================

def poly_mask(pts, shape, off=(0, 0)):
    """A filled polygon (his sheet's coordinates, moved by -off) as a mask of the given shape."""
    from PIL import ImageDraw
    img = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(img).polygon([(x - off[0], y - off[1]) for x, y in pts], fill=1, outline=1)
    return np.asarray(img).astype(bool)


def drake():
    """His BEAST panel on the earth sheet: a four-legged stone drake in two poses (prowl, lunge).

    His left picture (the prowl) is fly frame 0 and his right one (the lunge, dust kicking up behind the
    hind legs) is frame 5. Both are placed on one anchor, the middle of the torso (between the shoulder
    and the hip), so the loop does not jitter. The in-betweens are a morph built from his own pixels:
    a similarity transform fitted on his landmarks (eyes, snout, horns, tail root) carries the body of
    one drawing toward the other, and the legs and the tail segments turn rigidly about their joints
    toward their angles in the other drawing. Frames 1, 2 and 7 are his prowl moved part of the way to
    the lunge, frames 3, 4 and 6 his lunge moved part of the way back, so the switch between his two
    drawings happens between two nearly identical poses. His dust grows behind the hind feet around the
    lunge, then drifts back and fades.
    """
    PANEL = (502, 1544, 1758, 1975)  # the panel's border lines
    SPLIT = 1118  # between his two pictures
    # Where the torso centre (the anchor) is in his two pictures.
    TORSO = {0: (792, 1755), 5: (1458, 1735)}
    WAX, WAY, CW, CH = 350, 205, 680, 440  # working canvas (his pixels) around each torso centre
    LUMW = np.array([0.3, 0.55, 0.15], np.float32)
    # Our character's height against his, measured on his WALL panel: that sets the scale.
    c = ref[960:1240, 765:900]
    bgc = np.median(np.concatenate([c[:4].reshape(-1, 3), c[-4:].reshape(-1, 3)]), 0)
    cm = np.abs(c - bgc).sum(2) > 60
    rows = [y for y in range(cm.shape[0]) if cm[y].sum() >= 2]
    his_char_h = max(rows) - min(rows) + 1
    S = CHAR_H / his_char_h
    pn = ref[PANEL[1] + 6:PANEL[3] - 6, PANEL[0] + 6:PANEL[2] - 6]
    BG = np.median(np.concatenate([pn[:6].reshape(-1, 3), pn[:, :6].reshape(-1, 3)]), 0)
    print('drake: his character', his_char_h, 'px tall, scale', round(S, 4), 'panel bg', BG.astype(int).tolist())
    size, oanchor = canvas_for([(WAX, WAY)], CW, CH, S)
    OW, OH = size
    print('drake canvas', size, 'anchor', oanchor)
    # The head (its eyes and glints are warm like the dust, but they are the drake's).
    HEAD = {
        0: [(915, 1640), (1100, 1640), (1100, 1860), (915, 1860)],
        5: [(1580, 1600), (1745, 1600), (1745, 1800), (1580, 1800)],
    }

    def erode(m, n):
        return ~dilate(~m, n)

    def key(k):
        """His picture k on the working canvas (torso centre at WAX, WAY): colour and layers."""
        ax, ay = TORSO[k]
        ox, oy = ax - WAX, ay - WAY
        crop = np.empty((CH, CW, 3), np.float32)
        crop[:] = BG
        sx0, sy0 = max(0, ox), max(0, oy)
        sx1, sy1 = min(ref.shape[1], ox + CW), min(ref.shape[0], oy + CH)
        crop[sy0 - oy:sy1 - oy, sx0 - ox:sx1 - ox] = ref[sy0:sy1, sx0:sx1]
        ys, xs = np.mgrid[0:CH, 0:CW]
        gx, gy = xs + ox, ys + oy
        inside = (gx >= PANEL[0] + 5) & (gx < PANEL[2] - 5) & (gy >= PANEL[1] + 5) & (gy < PANEL[3] - 5)
        inside &= (gx < SPLIT) if k == 0 else (gx >= SPLIT)
        crop[~inside] = BG
        diff = np.abs(crop - BG).sum(2)
        r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
        head = poly_mask(HEAD[k], (CH, CW), (ox, oy))
        fg = (diff > 22) & inside
        # Dust and flying dirt (the lunge only): saturated orange-brown (his stone is a greyer brown).
        warm = (r - b > 0.42 * r) & (r > g + 12) & (diff > 40) & ~head & (k == 5)
        # Specks of it inside the body are his shading, not dust.
        for p in components(warm):
            if len(p) < 8:
                p = np.array(p)
                warm[p[:, 0], p[:, 1]] = False
        solid = fg & ~warm

        def biggest(m):
            out = np.zeros((CH, CW), bool)
            pts = np.array(max(components(m), key=len))
            out[pts[:, 0], pts[:, 1]] = True
            return out

        def fill_holes(m):
            # Holes inside the body: his dark seams and shadows (not background) belong to it.
            for p in components(~m):
                p = np.array(p)
                if p[:, 0].min() == 0 or p[:, 1].min() == 0 or p[:, 0].max() == CH - 1 or p[:, 1].max() == CW - 1:
                    continue
                if len(p) < 60 or diff[p[:, 0], p[:, 1]].mean() > 14:
                    m[p[:, 0], p[:, 1]] = True
            return m

        body = fill_holes(biggest(solid))
        # His dark edging on the dust streaks that touch the drake is not the drake's (it would be left
        # floating when the dust moves): the dark pixels next to dust go with the dust.
        lum = crop @ LUMW
        body = fill_holes(biggest(body & ~(dilate(warm, 3) & (lum < 62))))
        # His deep plum shadows between the legs and under the chest, about (47, 36, 50), are close to the
        # navy panel (34, 34, 44) but lighter and redder: they are the body's far side, not background.
        # (An opening keeps the 1-2 px JPEG halo along the outline out.)
        shade = (diff > 10) & inside & ~body & ~dilate(warm, 4)
        shade &= dilate(erode(shade, 2), 2)
        touch = dilate(body, 1)
        for p in components(shade):
            p = np.array(p)
            if touch[p[:, 0], p[:, 1]].any():
                body[p[:, 0], p[:, 1]] = True
        body = fill_holes(body)
        rest = fg & ~body
        return crop, body, rest, diff, (ox, oy)

    keys = {k: key(k) for k in (0, 5)}
    for k, (crop, body, rest, diff, off) in keys.items():
        print('key', k, 'body px', int(body.sum()), 'rest px', int(rest.sum()))
    # His palette: the stone and moss, plus his eye and glint yellows (too few pixels for the median cut).
    body_px = np.concatenate([keys[k][0][keys[k][1]] for k in keys])
    r_, g_, b_ = body_px[:, 0], body_px[:, 1], body_px[:, 2]
    green = (g_ > r_ + 6) & (g_ > b_ + 20)
    glow = (r_ - b_ > 0.42 * r_) & (r_ > g_ + 12) & (r_ > 120)  # the eyes and the glints over them
    horn = (np.abs(r_ - b_) < 12) & (r_ > 110)  # the cool grey of the horns and the brightest plates
    stone = ~green & ~glow & ~horn
    PAL = np.concatenate([median_palette(body_px[stone], 30), median_palette(body_px[green], 8), median_palette(body_px[horn], 5), median_palette(body_px[glow], 5)])
    # His highlights (the horn tips, the claws, the lit tops of the plates) are too rare for a median-cut
    # box: they are sampled from his pictures at game scale (the top 1 %), cool grey and ivory apart.
    lit = []
    for k in keys:
        A_, C_ = shrink(keys[k][0], keys[k][1].astype(np.float32), (WAX, WAY), S, size, oanchor)
        lit.append(C_[A_ >= 0.5])
    lit = np.concatenate(lit)
    lr, lg, lb = lit[:, 0], lit[:, 1], lit[:, 2]
    lit = lit[~((lr - lb > 0.42 * lr) & (lr > lg + 12))]
    top = lit[lit @ LUMW >= np.percentile(lit @ LUMW, 99)]
    cool = np.abs(top[:, 0] - top[:, 2]) < 16
    PAL = np.concatenate([PAL, median_palette(top[cool], 2), median_palette(top[~cool], 2)])
    # His outline: the median of his darkest brown pixels (a deep brown, not black).
    lum_px = body_px @ LUMW
    dark = body_px[(lum_px < 30) & (r_ > b_ + 6) & (r_ >= g_)]
    OUTLINE = np.round(np.median(dark, 0))
    print('drake palette', len(PAL), 'outline', OUTLINE.astype(int).tolist(), 'highlights', np.round(PAL[-4:]).astype(int).tolist())
    # The dust: his solid clods and streaks, in his own colours (sampled from his saturated dust, plus his
    # brightest clods and the dark edging of his streaks).
    crop5, body5, rest5, diff5, off5 = keys[5]
    r5, b5 = crop5[..., 0], crop5[..., 2]
    l5 = crop5 @ LUMW
    dsat = rest5 & (diff5 > 70) & (r5 - b5 > 0.42 * r5)
    dl = crop5[dsat] @ LUMW
    DUST = np.concatenate([
        median_palette(crop5[dsat], 9),
        median_palette(crop5[dsat][dl >= np.percentile(dl, 96)], 2),
        median_palette(crop5[rest5 & (diff5 > 25) & (r5 - b5 > 12) & (l5 < 62)], 2),
    ])
    # (The fading dust of the other frames: fewer colours and two alpha levels, to fit the format's 78.)
    DUST_SOFT = median_palette(crop5[dsat], 5)
    print('dust palette', np.round(DUST).astype(int).tolist())

    # --- the rig -------------------------------------------------------------------------------------------
    # Landmarks his two drawings share (his sheet's coordinates: prowl, lunge, weight). The near eyes are
    # measured (the centre of the biggest glow spot in each head). A similarity transform (scale, turn,
    # move) fitted on them carries one drawing's body onto the other's.
    def eye_of(k):
        crop, body, rest, diff, (ox, oy) = keys[k]
        r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
        hot = (r > 200) & (g > 140) & (b < 120) & poly_mask(HEAD[k], (CH, CW), (ox, oy))
        p = np.array(max(components(hot), key=len), np.float64)
        return (float(p[:, 1].mean() + ox), float(p[:, 0].mean() + oy))

    LANDMARKS = [
        (eye_of(0), eye_of(5), 5.0),  # near eye
        ((1082, 1797), (1727, 1745), 3.0),  # snout tip
        ((1060, 1845), (1705, 1779), 2.0),  # chin
        ((955, 1828), (1617, 1762), 1.0),  # throat
        ((1001, 1650), (1655, 1617), 2.0),  # far horn tip
        ((924, 1661), (1597, 1626), 2.0),  # near horn tip
        ((907, 1615), (1573, 1605), 1.0),  # the back's last plate before the neck
        ((800, 1615), (1478, 1610), 1.0),  # the middle of the back
        ((702, 1650), (1393, 1670), 1.0),  # the back over the hips
        ((652, 1680), (1348, 1697), 1.0),  # the back at the tail root
        ((850, 1815), (1533, 1765), 0.5),  # under the chest, by the near front leg
        # The joints of the pieces, so a joint is in the same place in both drawings' in-betweens.
        ((649, 1743), (1343, 1734), 0.5),  # tail root
        ((660, 1797), (1360, 1787), 0.5),  # near hind leg
        ((800, 1811), (1510, 1766), 0.5),  # near front leg
        ((928, 1827), (1578, 1763), 0.5),  # far front leg
    ]
    pa = np.array([l[0] for l in LANDMARKS], np.float64)
    qa = np.array([l[1] for l in LANDMARKS], np.float64)
    wa = np.array([l[2] for l in LANDMARKS], np.float64)
    mp = (pa * wa[:, None]).sum(0) / wa.sum()
    mq = (qa * wa[:, None]).sum(0) / wa.sum()
    zp = (pa[:, 0] - mp[0]) + 1j * (pa[:, 1] - mp[1])
    zq = (qa[:, 0] - mq[0]) + 1j * (qa[:, 1] - mq[1])
    za = (wa * np.conj(zp) * zq).sum() / (wa * np.abs(zp) ** 2).sum()
    SC, TH = float(np.abs(za)), float(np.degrees(np.angle(za)))
    offP, offL = np.array(keys[0][4], np.float64), np.array(keys[5][4], np.float64)
    CP = mp - offP  # the fit's centre in the prowl's working canvas
    CL = mq - offL  # and in the lunge's
    DV = CL - CP
    res = np.abs((mq[0] + 1j * mq[1]) + za * zp - (qa[:, 0] + 1j * qa[:, 1]))
    print('drake morph: scale', round(SC, 4), 'turn', round(TH, 2), 'move', np.round(DV, 1).tolist(), 'residuals (his px)', np.round(res, 1).tolist())

    def rot(p, deg, s=1.0):
        """Forward affine (3x3): turn by deg degrees (clockwise on screen) and scale by s about p."""
        a = np.deg2rad(deg)
        cc, ss = np.cos(a) * s, np.sin(a) * s
        return np.array([[cc, -ss, p[0] - cc * p[0] + ss * p[1]], [ss, cc, p[1] - ss * p[0] - cc * p[1]], [0, 0, 1]], np.float64)

    def move(dx, dy):
        return np.array([[1, 0, dx], [0, 1, dy], [0, 0, 1]], np.float64)

    def core(k, t):
        """The fitted similarity at morph fraction t (0 = his prowl, 1 = his lunge) for a frame drawn from key k."""
        if k == 0:
            return move(*(t * DV)) @ rot(CP, t * TH, SC ** t)
        u = 1.0 - t
        return move(*(-u * DV)) @ rot(CL, -u * TH, SC ** -u)

    # The body between his two drawings: the similarity carries the landmarks most of the way and a
    # thin-plate spline through them takes up the rest (his prowl's high hump flattens into his lunge's
    # sloped back), so every landmark moves on a straight line from one drawing to the other.
    PW = pa - offP
    QW = qa - offL

    def marks_at(t):
        h = np.hstack([PW, np.ones((len(PW), 1))])
        sim_t = (core(0, t) @ h.T).T[:, :2]
        sim_1 = (core(0, 1.0) @ h.T).T[:, :2]
        return sim_t + t * (QW - sim_1)

    def tps(src, dst):
        """Thin-plate spline through the landmarks: a function (x, y) -> (x', y') with src -> dst."""
        n = len(src)
        def U(x, y, i):
            r2 = (x - src[i, 0]) ** 2 + (y - src[i, 1]) ** 2
            return np.where(r2 > 0, 0.5 * r2 * np.log(np.maximum(r2, 1e-12)), 0.0)
        K = np.array([[U(src[j, 0], src[j, 1], i) for i in range(n)] for j in range(n)], np.float64)
        Pm = np.hstack([np.ones((n, 1)), src])
        L = np.zeros((n + 3, n + 3))
        L[:n, :n] = K
        L[:n, n:] = Pm
        L[n:, :n] = Pm.T
        rhs = np.zeros((n + 3, 2))
        rhs[:n] = dst
        par = np.linalg.solve(L, rhs)

        def f(x, y):
            ox = par[n, 0] + par[n + 1, 0] * x + par[n + 2, 0] * y
            oy = par[n, 1] + par[n + 1, 1] * x + par[n + 2, 1] * y
            for i in range(n):
                u = U(x, y, i)
                ox = ox + par[i, 0] * u
                oy = oy + par[i, 1] * u
            return ox, oy
        return f

    # His pieces that move (his sheet's coordinates). Each leg is cut from the body along its joint and
    # turns rigidly about `pivot`; `aim` is its foot, so the turn that takes one drawing's leg to the
    # other's is measured (less the body's turn). Far legs go behind the body, near legs over it. The tail
    # is a chain of segments, each turning about its joint, so his prowl's curl opens into his lunge's
    # straight tail. Every moving piece leaves its root (a disc about its joint, unturned) under it, so
    # the joint never opens.
    RIG = {
        0: {
            'legs': {
                'ff': {'far': True, 'pivot': (928, 1827), 'aim': (1000, 1873), 'disc': 16,
                       'poly': [(892, 1824), (965, 1830), (990, 1853), (1058, 1853), (1058, 1904), (892, 1904)]},
                # (His prowl's far hind leg is hidden behind the near haunch: it stays in the body, and only
                # gives the angle the lunge's far hind leg turns back to.)
                'fh': {'far': True, 'still': True, 'pivot': (740, 1798), 'aim': (735, 1850), 'disc': 14,
                       'poly': [(714, 1796), (768, 1800), (752, 1812), (749, 1856), (712, 1856)]},
                'nh': {'pivot': (660, 1797), 'aim': (668, 1886), 'disc': 20,
                       'poly': [(624, 1794), (667, 1792), (674, 1826), (690, 1842), (706, 1846), (714, 1870), (714, 1904), (618, 1904)]},
                'nf': {'pivot': (800, 1811), 'aim': (852, 1935), 'disc': 22,
                       'poly': [(750, 1802), (848, 1820), (858, 1862), (898, 1898), (898, 1955), (745, 1955)]},
            },
            'tail': {
                'poly': [(652, 1680), (646, 1802), (626, 1797), (560, 1806), (515, 1790), (515, 1650), (640, 1650)],
                'joints': [(649, 1743), (604, 1763), (556, 1770), (540, 1740)],
                'tip': (580, 1693),
                # Segments as polygons (the curl's tip lies over its own root, so nearest-segment would mix them).
                'segs': [
                    [(660, 1640), (660, 1815), (604, 1815), (604, 1640)],
                    [(604, 1722), (604, 1815), (556, 1815), (556, 1733)],
                    [(556, 1733), (556, 1815), (505, 1815), (505, 1745)],
                    [(505, 1745), (556, 1733), (604, 1722), (604, 1640), (505, 1640)],
                ],
                'disc': [22, 20, 18, 14],
            },
        },
        5: {
            'legs': {
                'ff': {'far': True, 'pivot': (1578, 1763), 'aim': (1590, 1832), 'disc': 14,
                       'poly': [(1550, 1768), (1606, 1758), (1616, 1800), (1614, 1838), (1558, 1838), (1556, 1798)]},
                'fh': {'far': True, 'pivot': (1397, 1802), 'aim': (1400, 1850), 'disc': 12,
                       'poly': [(1376, 1806), (1418, 1798), (1424, 1852), (1372, 1852)]},
                'nh': {'pivot': (1360, 1787), 'aim': (1336, 1868), 'disc': 18,
                       'poly': [(1333, 1774), (1388, 1800), (1368, 1842), (1356, 1892), (1292, 1892), (1296, 1840), (1318, 1800)]},
                'nf': {'pivot': (1510, 1766), 'aim': (1524, 1840), 'disc': 16,
                       'poly': [(1478, 1765), (1543, 1768), (1560, 1798), (1558, 1852), (1488, 1852), (1486, 1800)]},
            },
            'tail': {
                'poly': [(1348, 1692), (1338, 1776), (1312, 1796), (1290, 1830), (1235, 1870), (1195, 1890), (1150, 1890), (1150, 1845), (1240, 1745), (1300, 1686)],
                'joints': None,  # spread along the straight tail at the prowl's segment lengths (below)
                'root': (1343, 1734),
                'tip': (1187, 1865),
                'disc': [18, 14, 12, 10],
            },
        },
    }
    # The lunge's straight tail is cut at the same lengths along it as the prowl's chain.
    tp = RIG[0]['tail']
    chainP = [np.array(p, np.float64) for p in tp['joints']] + [np.array(tp['tip'], np.float64)]
    lens = [float(np.hypot(*(chainP[i + 1] - chainP[i]))) for i in range(4)]
    tl = RIG[5]['tail']
    root, tip = np.array(tl['root'], np.float64), np.array(tl['tip'], np.float64)
    U = (tip - root) / np.hypot(*(tip - root))
    cum = np.cumsum([0.0] + lens)
    scale_len = np.hypot(*(tip - root)) / cum[-1]
    chainL = [root + U * cl * scale_len for cl in cum]
    tl['joints'] = [tuple(p) for p in chainL[:4]]

    def heading(v):
        return float(np.degrees(np.arctan2(v[1], v[0])))

    # Turns from the prowl's leg (and tail segment) headings to the lunge's. The tail's headings are
    # unwrapped along the chain, so the curl opens the way it is wound.
    PHI = {}
    for n in RIG[0]['legs']:
        a0, a5 = RIG[0]['legs'][n], RIG[5]['legs'][n]
        d = heading(np.subtract(a5['aim'], a5['pivot'])) - heading(np.subtract(a0['aim'], a0['pivot']))
        PHI[n] = (d + 180.0) % 360.0 - 180.0
    hP = [heading(chainP[i + 1] - chainP[i]) for i in range(4)]
    for i in range(1, 4):
        while hP[i] < hP[i - 1] - 180:
            hP[i] += 360
        while hP[i] > hP[i - 1] + 180:
            hP[i] -= 360
    hL = heading(U)
    while hL > hP[0] + 180:
        hL -= 360
    while hL < hP[0] - 180:
        hL += 360
    TAIL_ABS = [hL - h for h in hP]
    TAIL_REL = [TAIL_ABS[0]] + [TAIL_ABS[i] - TAIL_ABS[i - 1] for i in range(1, 4)]
    # His lunge's near front leg is folded (much shorter than the prowl's straight one): each leg also
    # shortens or lengthens along its own axis between the two drawings (it folds toward the viewer).
    STRETCH = {}
    for n in RIG[0]['legs']:
        a0, a5 = RIG[0]['legs'][n], RIG[5]['legs'][n]
        STRETCH[n] = float(np.hypot(*np.subtract(a5['aim'], a5['pivot'])) / (np.hypot(*np.subtract(a0['aim'], a0['pivot'])) * SC))
    print('drake morph: legs', {n: round(v, 1) for n, v in PHI.items()}, 'stretch', {n: round(v, 3) for n, v in STRETCH.items()}, 'tail', [round(v, 1) for v in TAIL_ABS])

    yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float64)

    def to_work(k, pt):
        ox, oy = keys[k][4]
        return (pt[0] - ox, pt[1] - oy)

    # Each key split into its pieces and the rest of the body (working canvas).
    parts = {}
    for k in (0, 5):
        crop, body, rest, diff, off = keys[k]
        rg = RIG[k]
        legs = {}
        for n, pc in rg['legs'].items():
            if pc.get('still'):
                continue
            m = poly_mask(pc['poly'], (CH, CW), off) & body
            pv = to_work(k, pc['pivot'])
            legs[n] = (m, m & ((xx - pv[0]) ** 2 + (yy - pv[1]) ** 2 <= pc['disc'] ** 2), pv)
        tm = poly_mask(rg['tail']['poly'], (CH, CW), off) & body
        joints = [to_work(k, p) for p in rg['tail']['joints']]
        if k == 0:
            seg_id = np.full((CH, CW), -1, np.int32)
            for i, poly in enumerate(rg['tail']['segs']):
                seg_id[poly_mask(poly, (CH, CW), off) & (seg_id < 0)] = i
        else:
            r0 = to_work(5, root)
            proj = (xx - r0[0]) * U[0] + (yy - r0[1]) * U[1]
            seg_id = np.searchsorted(cum[1:4] * scale_len, proj, side='right').astype(np.int32)
        segs = []
        for i in range(4):
            m = tm & (seg_id == i)
            jx, jy = joints[i]
            segs.append((m, m & ((xx - jx) ** 2 + (yy - jy) ** 2 <= rg['tail']['disc'][i] ** 2), joints[i]))
        # Where each tail pixel lies along the chain (segment index + fraction), for the smooth bend.
        chain = joints + [to_work(k, rg['tail']['tip'] if k == 0 else tuple(root + U * cum[-1] * scale_len))]
        sp = np.full((CH, CW), -1.0)
        for i in range(4):
            (ax_, ay_), (bx_, by_) = chain[i], chain[i + 1]
            vx, vy = bx_ - ax_, by_ - ay_
            f = np.clip(((xx - ax_) * vx + (yy - ay_) * vy) / (vx * vx + vy * vy), 0.0, 1.0)
            sel = tm & (seg_id == i)
            sp[sel] = i + f[sel]
        base = body.copy()
        for m, _, _ in list(legs.values()) + segs:
            base &= ~m
        parts[k] = (legs, segs, base, sp)
    if DEBUG:
        cols = {'ff': (255, 128, 0), 'fh': (0, 255, 0), 'nh': (0, 255, 255), 'nf': (255, 255, 0)}
        scol = [(255, 0, 255), (160, 0, 255), (255, 0, 120), (120, 60, 255)]
        for k in (0, 5):
            legs, segs, base, _ = parts[k]
            vis = (keys[k][0] * 0.5).astype(np.uint8)
            vis[base] = keys[k][0][base].astype(np.uint8)
            for n, (m, disc, pv) in legs.items():
                vis[m] = (keys[k][0][m] * 0.5 + np.array(cols[n]) * 0.5).astype(np.uint8)
                vis[disc] = (vis[disc] * 0.6).astype(np.uint8)
            for i, (m, disc, pv) in enumerate(segs):
                vis[m] = (keys[k][0][m] * 0.5 + np.array(scol[i]) * 0.5).astype(np.uint8)
                vis[disc] = (vis[disc] * 0.6).astype(np.uint8)
            Image.fromarray(vis).save(os.path.join(DEBUG, f'drake-pieces-{k}.png'))

    def sample(arr, M):
        """arr (H x W or H x W x C, zero outside) moved by the forward affine M, bilinear."""
        Mi = np.linalg.inv(M)
        return sample_at(arr, Mi[0, 0] * xx + Mi[0, 1] * yy + Mi[0, 2], Mi[1, 0] * xx + Mi[1, 1] * yy + Mi[1, 2])

    def sample_at(arr, sx, sy):
        """arr (zero outside) read at (sx, sy) for every pixel of the working canvas, bilinear."""
        H, W = arr.shape[:2]
        x0 = np.floor(sx).astype(np.int64)
        y0 = np.floor(sy).astype(np.int64)
        fx = (sx - x0).astype(np.float32)
        fy = (sy - y0).astype(np.float32)
        if arr.ndim == 3:
            fx, fy = fx[..., None], fy[..., None]
        out = 0
        for oy, wy in ((0, 1 - fy), (1, fy)):
            for ox, wx in ((0, 1 - fx), (1, fx)):
                X, Y = x0 + ox, y0 + oy
                ok = (X >= 0) & (X < W) & (Y >= 0) & (Y < H)
                v = arr[np.clip(Y, 0, H - 1), np.clip(X, 0, W - 1)]
                v = np.where(ok[..., None] if arr.ndim == 3 else ok, v, 0)
                out = out + v * wx * wy
        return out.astype(np.float32)

    def bend(crop, sp, Ts, sub=3, blend=0.3):
        """The tail pixels (sp >= 0: segment + fraction along it) carried by the segments' transforms Ts,
        each pixel by a blend of its segment's and the neighbour's near a joint; splatted at sub x sub
        samples per pixel. Returns premultiplied colour and coverage on the working canvas."""
        ys, xs = np.nonzero(sp >= 0)
        s_ = sp[ys, xs]
        i0 = np.clip(np.floor(s_).astype(np.int64), 0, 3)
        f = s_ - i0
        w = np.zeros((len(s_), 4))
        a_lo = np.where((f < blend) & (i0 > 0), 0.5 + 0.5 * f / blend, 1.0)
        a_hi = np.where((f > 1 - blend) & (i0 < 3), 0.5 + 0.5 * (1 - f) / blend, 1.0)
        a = np.minimum(a_lo, a_hi)
        idx = np.arange(len(s_))
        w[idx, i0] = a
        lo = (a_lo < 1.0)
        hi = (a_hi < 1.0)
        w[idx[lo], i0[lo] - 1] = 1.0 - a[lo]
        w[idx[hi], i0[hi] + 1] = 1.0 - a[hi]
        col = crop[ys, xs].astype(np.float64)
        acc = np.zeros((CH * CW, 3))
        accw = np.zeros(CH * CW)
        offs = (np.arange(sub) + 0.5) / sub - 0.5
        for oy in offs:
            for ox in offs:
                px, py = xs + ox, ys + oy
                X = np.zeros(len(px))
                Y = np.zeros(len(px))
                for i, M in enumerate(Ts):
                    X += w[:, i] * (M[0, 0] * px + M[0, 1] * py + M[0, 2])
                    Y += w[:, i] * (M[1, 0] * px + M[1, 1] * py + M[1, 2])
                x0 = np.floor(X).astype(np.int64)
                y0 = np.floor(Y).astype(np.int64)
                fx, fy = X - x0, Y - y0
                for dy, wy in ((0, 1 - fy), (1, fy)):
                    for dx, wx in ((0, 1 - fx), (1, fx)):
                        Xi, Yi = x0 + dx, y0 + dy
                        ok = (Xi >= 0) & (Xi < CW) & (Yi >= 0) & (Yi < CH)
                        ww = (wx * wy)[ok]
                        j = Yi[ok] * CW + Xi[ok]
                        np.add.at(accw, j, ww)
                        for c in range(3):
                            np.add.at(acc[:, c], j, ww * col[ok, c])
        cv = np.clip(accw / (sub * sub), 0, 1).reshape(CH, CW)
        rgb = (acc / np.maximum(accw, 1e-9)[:, None]).reshape(CH, CW, 3)
        return (rgb * cv[..., None]).astype(np.float32), cv.astype(np.float32)

    # His dust (the lunge picture only), in his colours. His pile sits on the ground (its flat bottom) and
    # was cut by his frame box on the left: that edge is kept as he drew it, with only its top corner rounded.
    gx5, gy5 = xx + off5[0], yy + off5[1]
    DUST_CORNER = (1137, 1831)
    R_ = 8.0
    corner = (gx5 - DUST_CORNER[0] < R_) & (gy5 - DUST_CORNER[1] < R_) & ((gx5 - DUST_CORNER[0] - R_) ** 2 + (gy5 - DUST_CORNER[1] - R_) ** 2 > R_ * R_)
    dust_m = (rest5 & ~corner).astype(np.float32)
    dust_c = crop5 * dust_m[..., None]
    DUST_ORIGIN = (1310, 1950)  # where it bursts from: on the ground, behind the hind feet
    edge_fade = None

    def place_dust(scale, dx, alpha):
        """His dust scaled about DUST_ORIGIN (on the ground) and moved dx game px; rgba at game scale."""
        ox_, oy_ = to_work(5, DUST_ORIGIN)
        M = move(dx / S, 0.0) @ rot((ox_, oy_), 0.0, scale)
        # The dust is his lunge's: on the lunge's canvas (the same anchor as every frame).
        A, C = shrink(sample(dust_c, M) / np.maximum(sample(dust_m, M), 1e-4)[..., None], sample(dust_m, M), (WAX, WAY), S, size, oanchor)
        out = np.zeros((OH, OW, 4), np.uint8)
        if alpha >= 1.0:
            g = A >= 0.5
            out[g, :3] = snap(C, DUST)[g]
            out[g, 3] = 255
        else:
            a = A * alpha * edge_fade
            g = a > 0.15
            out[g, :3] = snap(C, DUST_SOFT)[g]
            out[g, 3] = np.where(a[g] > 0.5, 190, 105).astype(np.uint8)
        return out

    gyo, gxo = np.mgrid[0:OH, 0:OW]
    dist_edge = np.minimum(np.minimum(gxo, OW - 1 - gxo), np.minimum(gyo, OH - 1 - gyo)).astype(np.float32)
    edge_fade = np.clip((dist_edge - 1) / 8.0, 0, 1)

    def pose(k, t, bob=0.0, push=0.0, extra=None, dust=None, metrics=None):
        """Frame drawn from key k at morph fraction t, moved bob px down and push px forward (game px),
        with extra turns (degrees) on top of the morph: legs by name, the tail as 'tail' (each segment)."""
        crop = keys[k][0]
        legs, segs, base, sp = parts[k]
        extra = extra or {}
        sgn = t if k == 0 else -(1.0 - t)  # the share of the turns from this key toward the other
        src = PW if k == 0 else QW
        dst = marks_at(t) + np.array([push / S, bob / S])
        fwd = tps(src, dst)
        inv = tps(dst, src)
        sc = SC ** t if k == 0 else SC ** -(1.0 - t)

        def at(pv, ang, axis=None, f=1.0):
            """A rigid piece: turned by ang and scaled with the body about its joint pv, which goes where the
            body's warp takes it (a leg can also be shortened by f along its axis)."""
            nx, ny = fwd(np.float64(pv[0]), np.float64(pv[1]))
            M = rot(pv, ang, sc)
            if axis is not None and f != 1.0:
                a = np.asarray(axis, np.float64) / np.hypot(*axis)
                A = np.eye(3)
                A[:2, :2] += (f - 1.0) * np.outer(a, a)
                M = M @ move(pv[0], pv[1]) @ A @ move(-pv[0], -pv[1])
            return move(float(nx) - pv[0], float(ny) - pv[1]) @ M

        far, mid, near = [], [], []
        flat = base.copy()  # the body, warped; the pieces' roots (unturned) go with it
        for n, (m, disc, pv) in legs.items():
            flat |= disc
            pc = RIG[k]['legs'][n]
            f = STRETCH[n] ** t if k == 0 else STRETCH[n] ** -(1.0 - t)
            M = at(pv, sgn * PHI[n] + extra.get(n, 0.0), np.subtract(pc['aim'], pc['pivot']), f)
            (far if pc.get('far') else near).append((m, M))
        flat |= segs[0][1]
        # The tail: a chain of segments turned about their joints, blended across each joint (so it bends
        # smoothly instead of breaking into blocks).
        tail_turn = extra.get('tail', 0.0)
        Ts, r_prev = [], None
        for i, (m, disc, jv) in enumerate(segs):
            r_i = sgn * TAIL_ABS[i] + tail_turn * (1.0 + 0.6 * i)
            Ts.append(at(jv, r_i) if i == 0 else Ts[-1] @ rot(jv, r_i - r_prev))
            r_prev = r_i
        prem = np.zeros((CH, CW, 3), np.float32)
        cov = np.zeros((CH, CW), np.float32)

        def over(pr, a):
            nonlocal prem, cov
            prem = pr + prem * (1 - a[..., None])
            cov = a + cov * (1 - a)

        for m, M in far:
            mf = m.astype(np.float32)
            over(sample(crop * mf[..., None], M), sample(mf, M))
        over(*bend(crop, sp, Ts))
        mf = flat.astype(np.float32)
        if t in (0.0, 1.0) and not bob and not push:
            over(crop * mf[..., None], mf)
        else:
            sx, sy = inv(xx, yy)
            over(sample_at(crop * mf[..., None], sx, sy), sample_at(mf, sx, sy))
        for m, M in near:
            mf = m.astype(np.float32)
            over(sample(crop * mf[..., None], M), sample(mf, M))
        rgb = prem / np.maximum(cov, 1e-4)[..., None]
        A, C = shrink(rgb, cov, (WAX, WAY), S, size, oanchor)
        out = np.zeros((OH, OW, 4), np.uint8)
        if dust is not None:
            out = place_dust(*dust)
        op = A >= 0.5
        if t not in (0.0, 1.0):
            # Bits a moved piece leaves detached.
            for pts in components(op):
                if len(pts) < 20:
                    op[tuple(np.array(pts).T)] = False
        op, edge = outline_clean(op)
        out[op, :3] = snap(C, PAL)[op]
        # His glowing eyes and glints are smaller than the averaging footprint: where they cover a good
        # part of a pixel, the pixel takes their colour (so they keep glowing instead of turning muddy).
        hot = (rgb[..., 0] > 200) & (rgb[..., 1] > 140) & (rgb[..., 2] < 120) & (cov > 0.5)
        Ah, Ch = shrink(rgb, hot.astype(np.float32), (WAX, WAY), S, size, oanchor)
        hm = (Ah > 0.25) & op
        out[hm, :3] = snap(Ch, PAL)[hm]
        out[op, 3] = 255
        out[edge, :3] = OUTLINE
        out[edge, 3] = 255
        if metrics is not None:
            e = dst[0]
            metrics.append({'op': op.copy(), 'eye': ((e[0] - WAX) * S + oanchor[0], (e[1] - WAY) * S + oanchor[1])})
        return out

    # The run (a heavy bounding charge): 0 his prowl, gathered; 1-2 the body rises and stretches toward the
    # lunge, the hind legs push back, the front legs lift and the tail's curl opens; 3-4 his lunge, still
    # partly gathered, springing into 5, his lunge, with his dust bursting behind the hind feet; 6 the
    # front legs reach down for the landing and the tail starts to curl; 7 landing on his prowl, the body
    # settling, the dust drifting back and fading.
    FRAMES = [
        (0, 0.0, {}),
        (0, 0.24, dict(bob=-1.0)),
        (0, 0.47, dict(bob=-2.0)),
        (5, 0.57, dict(bob=-1.5, dust=(0.5, 2.0, 0.55))),
        (5, 0.79, dict(bob=-1.0, dust=(0.8, 1.0, 1.0))),
        (5, 1.0, dict(dust=(1.0, 0.0, 1.0))),
        (5, 0.64, dict(bob=0.0, dust=(1.0, -5.0, 0.6))),
        (0, 0.34, dict(bob=0.0, dust=(1.0, -11.0, 0.3))),
    ]
    metrics = []
    frames = {'fly': [pose(k, t, metrics=metrics, **kw) for k, t, kw in FRAMES]}
    n = len(metrics)
    for i in range(n):
        a, b = metrics[i]['op'], metrics[(i + 1) % n]['op']
        fa, fb = frames['fly'][i][..., 3] > 128, frames['fly'][(i + 1) % n][..., 3] > 128
        xs = np.nonzero(a.any(0))[0]
        print(f'  frame {i}: eye ({metrics[i]["eye"][0]:.1f}, {metrics[i]["eye"][1]:.1f})  right x {xs.max()}  '
              f'change to next: body {100 * (a ^ b).sum() / (a.sum() + b.sum()):.1f}%, with dust {100 * (fa ^ fb).sum() / (fa.sum() + fb.sum()):.1f}%')
    f0 = frames['fly'][0]
    feet = int(np.nonzero((f0[..., 3] == 255).any(1))[0].max())
    print('drake: feet line (lowest claw of frame 0) at y', feet, 'of', OH, '; anchor', oanchor)
    note = [
        "The stone drake (vfx_beasts/earth), copied from his earth sheet's BEAST panel: his left picture",
        "(the prowl) is frame 0 and his right one (the lunge, dust kicking up) is frame 5, both on one",
        "anchor (the middle of the torso). 1, 2 and 7 move his prowl part of the way to the lunge, 3, 4",
        "and 6 his lunge part of the way back (body, legs and tail segments turned rigidly about their",
        "joints), and his dust grows and drifts. Scale: his character is " + f"{his_char_h} px tall in that sheet, ours {CHAR_H:.0f}.",
    ]
    write_module(frames, size, oanchor, note)
    sidecar('earth', {'ref': os.path.basename(REF), 'scale': S, 'panel': list(PANEL),
                      'keys': {str(k): {'torso': list(TORSO[k]), 'origin': list(keys[k][4])} for k in (0, 5)},
                      'work': [WAX, WAY, CW, CH], 'feet': feet,
                      'morph': {'scale': SC, 'turn': TH, 'move': DV.tolist(), 't': [f[1] for f in FRAMES], 'key': [f[0] for f in FRAMES]}})
    if DEBUG:
        for k, (crop, body, rest, diff, off) in keys.items():
            vis = (crop * 0.35).astype(np.uint8)
            vis[body] = crop[body].astype(np.uint8)
            vis[rest] = [255, 0, 255]
            Image.fromarray(vis).save(os.path.join(DEBUG, f'drake-seg-{k}.png'))
        # His picture box-filtered to game scale beside ours, on his panel colour, x3.
        rows = []
        for i, k in enumerate((0, 5)):
            crop = keys[k][0]
            ones = np.ones(crop.shape[:2], np.float32)
            _, his = shrink(crop, ones, (WAX, WAY), S, size, oanchor)
            ours = Image.new('RGBA', size, tuple(int(v) for v in BG) + (255,))
            ours.alpha_composite(Image.fromarray(frames['fly'][k], 'RGBA'))
            row = Image.new('RGB', (OW * 2 + 4, OH), (0, 0, 0))
            row.paste(Image.fromarray(np.clip(his, 0, 255).astype(np.uint8)), (0, 0))
            row.paste(ours.convert('RGB'), (OW + 4, 0))
            rows.append(row)
        sheet = Image.new('RGB', (rows[0].width, OH * 2 + 4))
        sheet.paste(rows[0], (0, 0))
        sheet.paste(rows[1], (0, OH + 4))
        sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(os.path.join(DEBUG, 'drake-keys.png'))
        # Consecutive frames as onion skins (red: this frame only, cyan: the next only, grey: both).
        fr = frames['fly']
        strip = np.full((OH, OW * len(fr), 3), 255, np.uint8)
        for i in range(len(fr)):
            a, b = metrics[i]['op'], metrics[(i + 1) % len(fr)]['op']
            on = np.full((OH, OW, 3), 255, np.uint8)
            on[a & b] = (90, 90, 90)
            on[a & ~b] = (230, 40, 40)
            on[b & ~a] = (40, 120, 230)
            on[:, -1] = 0
            strip[:, i * OW:(i + 1) * OW] = on
        Image.fromarray(strip).resize((strip.shape[1] * 2, OH * 2), Image.NEAREST).save(os.path.join(DEBUG, 'drake-onion-pairs.png'))
    debug(frames, size, 'drake')


{'phoenix': phoenix, 'raiju': raiju, 'crane': crane, 'drake': drake}[MODE]()
