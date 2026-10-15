"""Turns the owner's reference sheets into game frames for vfx_beasts (the phoenix, the raiju, the crane).

    python3 -I beasts-from-ref.py phoenix REF-phoenix-owner.jpg REF-raiju-owner.jpg <out.ts> [debugDir]
    python3 -I beasts-from-ref.py raiju   REF-raiju-owner.jpg   REF-raiju-owner.jpg <out.ts> [debugDir]
    python3 -I beasts-from-ref.py crane   REF-wind-set-owner.jpg REF-wind-set-owner.jpg <out.ts> [debugDir]

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
    and the hip), so the loop does not jitter. The in-betweens move his own pieces: the legs and the tail
    turn about their joints, the whole body pitches and bobs a few pixels, and his dust grows behind the
    hind feet around the lunge, then drifts back and fades.
    """
    PANEL = (502, 1544, 1758, 1975)  # the panel's border lines
    SPLIT = 1118  # between his two pictures
    # Where the torso centre (the anchor) is in his two pictures.
    TORSO = {0: (792, 1755), 5: (1458, 1735)}
    WAX, WAY, CW, CH = 350, 205, 680, 440  # working canvas (his pixels) around each torso centre
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
    # The head (its eyes and glints are warm like the dust, but they are the drake's).
    HEAD = {
        0: [(915, 1640), (1100, 1640), (1100, 1860), (915, 1860)],
        5: [(1580, 1600), (1745, 1600), (1745, 1800), (1580, 1800)],
    }

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
        # Dust and flying dirt: saturated orange-brown (his stone is a greyer brown).
        warm = (r - b > 0.42 * r) & (r > g + 12) & (diff > 40) & ~head
        # Specks of it inside the body are his shading, not dust.
        for p in components(warm):
            if len(p) < 8:
                p = np.array(p)
                warm[p[:, 0], p[:, 1]] = False
        solid = fg & ~warm
        comps = sorted(components(solid), key=len, reverse=True)
        body = np.zeros((CH, CW), bool)
        pts = np.array(comps[0])
        body[pts[:, 0], pts[:, 1]] = True
        # Holes inside the body: his dark seams and shadows (not background) belong to it.
        outside = ~body
        lab = components(outside)
        for p in lab:
            p = np.array(p)
            touches = (p[:, 0].min() == 0) or (p[:, 1].min() == 0) or (p[:, 0].max() == CH - 1) or (p[:, 1].max() == CW - 1)
            if touches:
                continue
            if len(p) < 60 or diff[p[:, 0], p[:, 1]].mean() > 14:
                body[p[:, 0], p[:, 1]] = True
        # His dark edging on the dust streaks that touch the drake is not the drake's (it would be left
        # floating when the dust moves): the dark pixels next to dust go with the dust.
        lum = crop @ np.array([0.3, 0.55, 0.15], np.float32)
        body &= ~(dilate(warm, 3) & (lum < 62))
        comps = sorted(components(body), key=len, reverse=True)
        body = np.zeros((CH, CW), bool)
        pts = np.array(comps[0])
        body[pts[:, 0], pts[:, 1]] = True
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
    PAL = np.concatenate([median_palette(body_px[stone], 36), median_palette(body_px[green], 8), median_palette(body_px[horn], 5), median_palette(body_px[glow], 5)])
    # His outline: the median of his darkest brown pixels (a deep brown, not black).
    lum_px = body_px @ np.array([0.3, 0.55, 0.15], np.float32)
    dark = body_px[(lum_px < 30) & (r_ > b_ + 6) & (r_ >= g_)]
    OUTLINE = np.round(np.median(dark, 0))
    print('drake palette', len(PAL), 'outline', OUTLINE.astype(int).tolist())
    # The dust: un-mixed from the panel background as one of his dust colours with an alpha.
    crop5, body5, rest5, diff5, off5 = keys[5]
    DUST = median_palette(crop5[rest5 & (diff5 > 150)], 7)

    def unmix(crop, m):
        d = crop - BG
        best_a = np.zeros(m.shape, np.float32)
        best_c = np.zeros(m.shape + (3,), np.float32)
        best_e = np.full(m.shape, 1e9, np.float32)
        for E in DUST:
            v = E - BG
            a = np.clip((d * v).sum(2) / (v * v).sum(), 0, 1)
            err = np.abs(d - a[..., None] * v).sum(2)
            better = err < best_e
            best_e = np.where(better, err, best_e)
            best_a = np.where(better, a, best_a)
            best_c = np.where(better[..., None], E, best_c)
        return np.where(m, best_a, 0).astype(np.float32), best_c

    # His pieces that move in the in-betweens (his sheet's coordinates). Each is cut from the body along
    # `cut` (its joint) and turned about `pivot`; the turn eases in over `bend` px from the cut, so the
    # piece stays joined to the body there. Far pieces go behind the body, the others over it.
    PIECES = {
        0: {
            'ff': {'far': True, 'cut': [(892, 1824), (965, 1830)], 'pivot': (928, 1827), 'bend': 16,
                   'poly': [(892, 1824), (965, 1830), (990, 1853), (1058, 1853), (1058, 1904), (892, 1904)]},
            'tail': {'cut': [(652, 1686), (646, 1800)], 'pivot': (649, 1743), 'bend': 22,
                     'poly': [(652, 1680), (646, 1802), (626, 1797), (560, 1806), (515, 1790), (515, 1650), (640, 1650)]},
            'nh': {'cut': [(624, 1794), (692, 1800)], 'pivot': (660, 1797), 'bend': 18,
                   'poly': [(624, 1794), (692, 1800), (696, 1848), (714, 1858), (714, 1904), (618, 1904)]},
            'nf': {'cut': [(750, 1802), (848, 1820)], 'pivot': (800, 1811), 'bend': 20,
                   'poly': [(750, 1802), (848, 1820), (858, 1862), (898, 1898), (898, 1955), (745, 1955)]},
            # The far hind leg: the dark limb in the shadow between the haunch and the near front leg.
            'fh': {'far': True, 'cut': [(714, 1796), (768, 1800)], 'pivot': (740, 1798), 'bend': 12,
                   'poly': [(714, 1796), (768, 1800), (752, 1812), (749, 1856), (712, 1856)]},
        },
        5: {
            'ff': {'far': True, 'cut': [(1550, 1768), (1606, 1758)], 'pivot': (1578, 1763), 'bend': 14,
                   'poly': [(1550, 1768), (1606, 1758), (1616, 1800), (1614, 1838), (1558, 1838), (1556, 1798)]},
            'fh': {'far': True, 'cut': [(1376, 1806), (1418, 1798)], 'pivot': (1397, 1802), 'bend': 12,
                   'poly': [(1376, 1806), (1418, 1798), (1424, 1852), (1372, 1852)]},
            'tail': {'cut': [(1348, 1692), (1338, 1776)], 'pivot': (1343, 1734), 'bend': 26,
                     'poly': [(1348, 1692), (1338, 1776), (1312, 1796), (1290, 1830), (1235, 1870), (1195, 1890), (1150, 1890), (1150, 1845), (1240, 1745), (1300, 1686)]},
            'nh': {'cut': [(1333, 1774), (1388, 1800)], 'pivot': (1360, 1787), 'bend': 18,
                   'poly': [(1333, 1774), (1388, 1800), (1368, 1842), (1356, 1892), (1292, 1892), (1296, 1840), (1318, 1800)]},
            'nf': {'cut': [(1478, 1765), (1543, 1768)], 'pivot': (1510, 1766), 'bend': 16,
                   'poly': [(1478, 1765), (1543, 1768), (1560, 1798), (1558, 1852), (1488, 1852), (1486, 1800)]},
        },
    }
    # The body pitches about the shoulders (the head stays steady; the hindquarters rise and fall).
    PITCH = {0: (880, 1745), 5: (1540, 1715)}
    # His dust is clipped by his frame box on the left and at the bottom: it fades out toward those edges.
    DUST_CLIP_X, DUST_CLIP_Y, DUST_FADE = 1138, 1948, 26
    DUST_ORIGIN = (1330, 1880)  # where it bursts from (behind the hind feet)

    size, oanchor = canvas_for([(WAX, WAY)], CW, CH, S)
    OW, OH = size
    print('drake canvas', size, 'anchor', oanchor)
    yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)

    def to_work(k, pt):
        ox, oy = keys[k][4]
        return (pt[0] - ox, pt[1] - oy)

    def bend_field(k, pc, deg):
        """Inverse displacement (for warp) that turns piece pc by deg degrees, easing in from its cut."""
        (x0, y0), (x1, y1) = [to_work(k, p) for p in pc['cut']]
        px, py = to_work(k, pc['pivot'])
        tx, ty = x1 - x0, y1 - y0
        L = float(np.hypot(tx, ty))
        nx, ny = -ty / L, tx / L
        cx = float(np.mean([to_work(k, p)[0] for p in pc['poly']]))
        cy = float(np.mean([to_work(k, p)[1] for p in pc['poly']]))
        if (cx - x0) * nx + (cy - y0) * ny < 0:
            nx, ny = -nx, -ny
        R0 = pc['bend']

        def disp(qx, qy):
            t = np.clip(((qx - x0) * nx + (qy - y0) * ny) / R0, 0, 1)
            a = np.deg2rad(deg) * t * t * (3 - 2 * t)
            rx, ry = qx - px, qy - py
            return px + rx * np.cos(a) - ry * np.sin(a) - qx, py + rx * np.sin(a) + ry * np.cos(a) - qy

        qx, qy = xx, yy
        for _ in range(5):
            dx, dy = disp(qx, qy)
            qx, qy = xx - dx, yy - dy
        t = np.clip(((qx - x0) * nx + (qy - y0) * ny) / R0, 0, 1)
        return dx.astype(np.float32), dy.astype(np.float32), t.astype(np.float32)

    def rigid(k, deg, bob_px):
        """Inverse displacement for the whole body: pitched deg about PITCH[k], then moved down bob_px (game px)."""
        px, py = to_work(k, PITCH[k])
        ty = bob_px / S
        a = np.deg2rad(deg)
        rx, ry = xx - px, yy - ty - py
        sx = px + rx * np.cos(a) + ry * np.sin(a)
        sy = py - rx * np.sin(a) + ry * np.cos(a)
        return (xx - sx).astype(np.float32), (yy - sy).astype(np.float32)

    # Each key split into its pieces and the rest of the body.
    split = {}
    for k in (0, 5):
        crop, body, rest, diff, off = keys[k]
        masks = {n: poly_mask(pc['poly'], (CH, CW), off) & body for n, pc in PIECES[k].items()}
        base = body.copy()
        for m in masks.values():
            base &= ~m
        split[k] = (masks, base)
    if DEBUG:
        cols = {'ff': (255, 128, 0), 'fh': (0, 255, 0), 'tail': (255, 0, 255), 'nh': (0, 255, 255), 'nf': (255, 255, 0)}
        for k in (0, 5):
            masks, base = split[k]
            vis = (keys[k][0] * 0.5).astype(np.uint8)
            vis[base] = keys[k][0][base].astype(np.uint8)
            for n, m in masks.items():
                vis[m] = (keys[k][0][m] * 0.5 + np.array(cols[n]) * 0.5).astype(np.uint8)
            Image.fromarray(vis).save(os.path.join(DEBUG, f'drake-pieces-{k}.png'))
    # The dust (his lunge picture only), faded toward the edges his frame box cut it off at.
    da5, dc5 = unmix(crop5, rest5)
    gx5, gy5 = xx + off5[0], yy + off5[1]
    sm = lambda v: np.clip(v, 0, 1) ** 2 * (3 - 2 * np.clip(v, 0, 1))
    # (A wavy edge, so the fade does not read as a straight line.)
    jx = 9 * np.sin(gy5 / 7.0) + 6 * np.sin(gy5 / 3.1 + 1.3)
    jy = 8 * np.sin(gx5 / 8.0 + 0.7) + 5 * np.sin(gx5 / 3.7 + 2.1)
    da5 = da5 * sm((gx5 - DUST_CLIP_X - 4 - jx) / DUST_FADE) * sm((DUST_CLIP_Y - gy5 - 4 - jy) / DUST_FADE)

    def pose(k, pitch=0.0, bob=0.0, legs=None, dust=None):
        """Frame from key k: pieces turned by legs[name] degrees, body pitched and bobbed, dust placed.

        dust = (scale, dx, dy, alpha) in game px about DUST_ORIGIN, or None for no dust."""
        crop = keys[k][0]
        masks, base = split[k]
        legs = legs or {}
        far, near = [], []
        for n, pc in PIECES[k].items():
            m = masks[n].astype(np.float32)
            if legs.get(n, 0.0):
                dx, dy, t = bend_field(k, pc, legs[n])
                lay = (warp(crop * m[..., None], dx, dy), warp(m, dx, dy), warp(m, dx, dy) * t)
            else:
                lay = (crop * m[..., None], m, np.zeros_like(m))
            (far if pc.get('far') else near).append(lay)
        b = base.astype(np.float32)
        layers = far + [(crop * b[..., None], b, np.zeros_like(b))] + near
        prem = np.zeros((CH, CW, 3), np.float32)
        cov = np.zeros((CH, CW), np.float32)
        free = np.zeros((CH, CW), np.float32)  # near pieces away from their joint (they get an edge line)
        for i, (pr, a, w) in enumerate(layers):
            prem = pr + prem * (1 - a[..., None])
            cov = a + cov * (1 - a)
            free = w + free * (1 - a)
        if pitch or bob:
            dx, dy = rigid(k, pitch, bob)
            prem, cov, free = warp(prem, dx, dy), warp(cov, dx, dy), warp(free, dx, dy)
        rgb = prem / np.maximum(cov, 1e-4)[..., None]
        A, C = shrink(rgb, cov, (WAX, WAY), S, size, oanchor)
        Af, _ = shrink(rgb, free, (WAX, WAY), S, size, oanchor)
        out = np.zeros((OH, OW, 4), np.uint8)
        if dust is not None:
            s_, ddx, ddy, alpha = dust
            ox_, oy_ = to_work(5, DUST_ORIGIN)
            # Where each output pixel comes from in his dust: scaled about the origin, then moved.
            qx = ox_ + (xx - ox_ - ddx / S) / s_
            qy = oy_ + (yy - oy_ - ddy / S) / s_
            wdx, wdy = xx - qx, yy - qy
            Ad, Cd = shrink(warp(dc5, wdx, wdy), warp(da5, wdx, wdy) * alpha, (WAX, WAY), S, size, oanchor)
            g = Ad > 0.1
            out[g, :3] = snap(Cd, DUST)[g]
            out[g, 3] = np.where(Ad[g] > 0.7, 225, np.where(Ad[g] > 0.4, 160, 95)).astype(np.uint8)
        op = A >= 0.5
        if legs or pitch or bob:
            # Slivers left at a joint where a piece turned away.
            for pts in components(op):
                if len(pts) < 6:
                    op[tuple(np.array(pts).T)] = False
        op, edge = outline_clean(op)
        out[op, :3] = snap(C, PAL)[op]
        out[op, 3] = 255
        out[edge, :3] = OUTLINE
        out[edge, 3] = 255
        # A moved piece keeps its own edge where it lies over the body (away from its joint).
        fm = (Af >= 0.5) & op
        fe = np.zeros_like(fm)
        for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            fe |= fm & op & ~np.roll(np.roll(Af >= 0.25, oy, 0), ox, 1)
        out[fe, :3] = OUTLINE
        return out

    def key_frame(k):
        return pose(k, dust=(1.0, 0.0, 0.0, 1.0) if k == 5 else None)

    # The run (a bounding gallop): 0 his prowl, gathered; 1-2 the hind legs push back, the front legs
    # lift and tuck and the tail drops; 3-4 springing into 5, his lunge, with his dust bursting behind the
    # hind feet; 6 the front legs reach down for the landing; 7 landing and gathering again, the dust
    # drifting back and fading. Leg angles in degrees (+ turns a hanging limb's foot backward).
    frames = {'fly': [
        key_frame(0),
        pose(0, pitch=-2.0, bob=-1.0, legs={'nf': 8, 'ff': -8, 'nh': 10, 'fh': 6, 'tail': -6}),
        pose(0, pitch=-4.0, bob=-2.0, legs={'nf': 16, 'ff': -16, 'nh': 20, 'fh': 12, 'tail': -12}),
        pose(5, pitch=6.0, bob=-2.0, legs={'nf': -4, 'ff': 6, 'nh': -12, 'fh': -10, 'tail': 8}, dust=(0.5, 2.0, 2.0, 0.6)),
        pose(5, pitch=3.0, bob=-1.0, legs={'nf': -2, 'ff': 3, 'nh': -6, 'fh': -5, 'tail': 4}, dust=(0.78, 1.0, 1.0, 0.85)),
        key_frame(5),
        pose(5, pitch=4.0, bob=1.0, legs={'nf': -14, 'ff': -10, 'nh': -16, 'fh': -12, 'tail': 6}, dust=(1.08, -14.0, 2.0, 0.6)),
        pose(0, pitch=2.0, bob=2.0, legs={'nf': -8, 'ff': 4, 'nh': -10, 'fh': -6, 'tail': -8}, dust=(1.15, -30.0, 4.0, 0.3)),
    ]}
    f0 = frames['fly'][0]
    feet = int(np.nonzero((f0[..., 3] == 255).any(1))[0].max())
    print('drake: feet line (lowest claw of frame 0) at y', feet, 'of', OH, '; anchor', oanchor)
    note = [
        "The stone drake (vfx_beasts/earth), copied from his earth sheet's BEAST panel: his left picture",
        "(the prowl) is frame 0 and his right one (the lunge, dust kicking up) is frame 5, both on one",
        "anchor (the middle of the torso). 1-4, 6 and 7 turn his legs and tail about their joints, pitch",
        "and bob the body and move his dust. Scale: his character is " + f"{his_char_h} px tall in that sheet, ours {CHAR_H:.0f}.",
    ]
    write_module(frames, size, oanchor, note)
    sidecar('earth', {'ref': os.path.basename(REF), 'scale': S, 'panel': list(PANEL),
                      'keys': {str(k): {'torso': list(TORSO[k]), 'origin': list(keys[k][4])} for k in (0, 5)},
                      'work': [WAX, WAY, CW, CH], 'feet': feet})
    if DEBUG:
        for k, (crop, body, rest, diff, off) in keys.items():
            vis = (crop * 0.35).astype(np.uint8)
            vis[body] = crop[body].astype(np.uint8)
            vis[rest] = [255, 0, 255]
            Image.fromarray(vis).save(os.path.join(DEBUG, f'drake-seg-{k}.png'))
        # His picture box-filtered to game scale beside ours, on his panel colour, x4.
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
        # Onion skin of the two keys on the shared anchor (red: frame 0, cyan: frame 5).
        on = np.zeros((OH, OW, 3), np.uint8)
        on[frames['fly'][0][..., 3] > 0, 0] = 255
        on[frames['fly'][5][..., 3] > 0, 1:] = 200
        on[oanchor[1], :, 2] = 255
        on[:, oanchor[0], 2] = 255
        Image.fromarray(on).resize((OW * 3, OH * 3), Image.NEAREST).save(os.path.join(DEBUG, 'drake-onion.png'))
        # Consecutive frames as onion skins (red: this frame, cyan: the next).
        fr = frames['fly']
        strip = np.zeros((OH, OW * len(fr), 3), np.uint8)
        for i in range(len(fr)):
            on = np.zeros((OH, OW, 3), np.uint8)
            on[fr[i][..., 3] > 128, 0] = 255
            on[fr[(i + 1) % len(fr)][..., 3] > 128, 1:] = 200
            strip[:, i * OW:(i + 1) * OW] = on
        Image.fromarray(strip).save(os.path.join(DEBUG, 'drake-onion-pairs.png'))
    debug(frames, size, 'drake')


{'phoenix': phoenix, 'raiju': raiju, 'crane': crane, 'drake': drake}[MODE]()
