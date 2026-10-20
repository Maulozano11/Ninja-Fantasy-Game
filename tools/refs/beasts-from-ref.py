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


def write_module(frames, size, anchor, note, alph=ALPH):
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
                    toks.append(alph[ids[x]] + (str(n) if n > 1 else ''))
                    x += n
                rows.append(''.join(toks))
            enc[anim].append(rows)
    assert len(colors) < len(alph), len(colors)
    pal = ['#00000000'] + list(colors.keys())
    ts = ["// Generated by art2/beasts-from-ref.py from the owner's reference sheet. Do not edit by hand.", '//']
    ts += ['// ' + line for line in note]
    ts += ['//', f'// Each frame is {OW}x{OH} with the anchor at ({anchor[0]}, {anchor[1]}). Rows are run-length encoded: a symbol', '// (an index into PALETTE through ALPHABET, 0 = clear) followed by its repeat count when above one.', '']
    ts.append(f'export const SIZE: [number, number] = [{OW}, {OH}];')
    ts.append(f'export const ANCHOR: [number, number] = [{anchor[0]}, {anchor[1]}];')
    ts.append(f"export const ALPHABET = '{alph}';")
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
    with open(tmp, 'w', encoding='utf-8') as fh:
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


def erode(m, n):
    return ~dilate(~m, n)


def components4(mask):
    """4-connected regions of a mask (a hole that meets the outside only at a corner is still a hole)."""
    H, W = mask.shape
    seen = np.zeros((H, W), bool)
    out = []
    ys, xs = np.nonzero(mask)
    for y, x in zip(ys.tolist(), xs.tolist()):
        if seen[y, x]:
            continue
        q = deque([(y, x)])
        seen[y, x] = True
        pts = []
        while q:
            cy, cx = q.popleft()
            pts.append((cy, cx))
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        out.append(pts)
    return out


def soften(m, r):
    """A mask (or field) softened by three box blurs of radius r, about a Gaussian (deterministic)."""
    a = m.astype(np.float32)
    n = 2 * r + 1
    for _ in range(3):
        c = np.cumsum(np.pad(a, ((r + 1, r), (0, 0))), 0)
        a = (c[n:] - c[:-n]) / n
        c = np.cumsum(np.pad(a, ((0, 0), (r + 1, r))), 1)
        a = (c[:, n:] - c[:, :-n]) / n
    return a


GAP_PX = 40  # a hole in the drake up to this many game px is one of his narrow gaps: it is closed
GAPS = []  # the gaps closed in the frame being built (for the log)


def drake():
    """His BEAST panel on the earth sheet: a four-legged stone drake in two poses (prowl, lunge).

    His left picture (the prowl) is fly frame 0 and his right one (the lunge, dust kicking up behind the
    hind legs) is frame 5. Both stand on his one ground line: the prowl's claws and the lunge's dust pile
    rest on it, so the lunge is a leap (his lunge sits higher than his prowl) and the dust stays on the
    ground. Their eyes keep one x. The in-betweens move his own pieces: the legs and the tail turn about
    their joints, the tail bends along its centre line toward his other tail (his prowl's curl opens into
    the lunge's spear before the leap and the spear curls back up as the drake lands), the whole body
    pitches and rises or falls along a smooth arc from his prowl to his lunge and back, and his dust
    grows behind the hind feet around the lunge, then breaks up and settles.
    """
    PANEL = (502, 1544, 1758, 1975)  # the panel's border lines
    SPLIT = 1118  # between his two pictures
    GROUND = 1948  # his ground under both pictures (the prowl's lowest claw, the lunge's flat dust bottom)
    EYE = {0: (1014, 1781), 5: (1670, 1728)}  # his near eyes (the middle of the yellow glow)
    # Where each picture sits on our anchor (his sheet's coordinates). Frame 0: the middle of his prowl's
    # torso, between the shoulder and the hip. Frame 5: on the same ground line, and with the eye at the
    # same x, so the lunge rises 53 of his px (22 game px) over the prowl as he drew it.
    TORSO = {0: (792, 1755)}
    TORSO[5] = (TORSO[0][0] + EYE[5][0] - EYE[0][0], TORSO[0][1] + GROUND - GROUND)
    WAX, WAY, CW, CH = 420, 215, 760, 450  # working canvas (his pixels) around each placement point
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
    # Flying dirt in his lunge that touches the drake: the clod on the tip of his tallest back spike and the
    # streak that ends on the spikes above the hip (their cream highlights are not saturated like his dust).
    CLOD_FOOT = 1606  # the top of his tallest back spike, under the clod
    LOOSE = [[(1565, 1593), (1587, 1593), (1587, 1609), (1565, 1609)],
             [(1395, 1628), (1440, 1628), (1440, 1638), (1427, 1640), (1395, 1646)]]
    HEAD = {
        0: [(915, 1640), (1100, 1640), (1100, 1860), (915, 1860)],
        5: [(1580, 1600), (1745, 1600), (1745, 1800), (1580, 1800)],
    }
    # His horns (the upright one and the big near one swept back along the neck): their pixels snap only to
    # his horn greys, which are cooler than the stone.
    HORNS = {
        0: [[(994, 1646), (1008, 1646), (1022, 1670), (1044, 1692), (1048, 1716), (1030, 1718), (1010, 1712), (994, 1690)],
            [(918, 1655), (935, 1660), (960, 1700), (1000, 1735), (1005, 1760), (985, 1765), (950, 1735), (925, 1710), (915, 1680)]],
        5: [[(1650, 1612), (1660, 1612), (1672, 1640), (1694, 1660), (1698, 1684), (1676, 1686), (1660, 1668), (1648, 1640)],
            [(1593, 1618), (1604, 1620), (1620, 1650), (1655, 1685), (1660, 1705), (1640, 1708), (1610, 1680), (1596, 1650)]],
    }
    # His far eye: a small lemon-yellow oval on the far side of the brow.
    FAREYE = {0: [(1038, 1734), (1064, 1734), (1064, 1768), (1038, 1768)],
              5: [(1686, 1678), (1714, 1678), (1714, 1712), (1686, 1712)]}

    def key(k):
        """His picture k on the working canvas (placement point at WAX, WAY): colour and layers."""
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
        if k == 5:
            # They fly with the dust, highlights and dark rims included (left on the spikes, they would blink
            # as dark stubs when the dust moves).
            for i, pts in enumerate(LOOSE):
                lp = poly_mask(pts, (CH, CW), (ox, oy))
                if i == 0:
                    # The clod: only its own bright and warm pixels fly. The dark ring the JPEG left around it
                    # is not his (it bloated the clod over the spike tip), and the spike keeps its outline.
                    warm |= fg & lp & (diff > 80)
                    fg &= ~(lp & ~warm & (gy < CLOD_FOOT))
                else:
                    warm |= fg & lp
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
        lum = crop @ np.array([0.3, 0.55, 0.15], np.float32)
        near_dust = dilate(warm, 4) & (lum < 70)
        body = fill_holes(biggest(body & ~near_dust))
        # His dark under-body shadow (the belly, under the chin and the neck, the far legs) is barely lighter
        # than the panel but warmer (red - blue about -2 against the panel's -10): where it joins the body it
        # is the body's, so the battlefield does not show through the drake.
        before = body.copy()
        shade = inside & ~warm & ~near_dust & ((r - b) >= (BG[0] - BG[2]) + 5) & (diff > 8) & (lum < 80)
        # (Areas only: the thin ring of JPEG ringing around his outline is not shadow.)
        shade &= dilate(erode(shade, 2), 2)
        body = fill_holes(biggest(body | shade))
        rest = fg & ~body
        return crop, body, rest, diff, (ox, oy), shade & body & ~before

    keys = {k: key(k) for k in (0, 5)}

    def to_work0(k, pt):
        return (pt[0] - keys[k][4][0], pt[1] - keys[k][4][1])
    for k, (crop, body, rest, diff, off, shade) in keys.items():
        print('key', k, 'body px', int(body.sum()), 'rest px', int(rest.sum()), 'shadow px', int(shade.sum()))

    # His head landmarks (his sheet's coordinates): the eye, the snout tip (the head's rightmost point) and the
    # tip of his upright horn (its topmost point).
    def landmarks(k):
        crop, body, rest, diff, off, shade = keys[k]
        ys, xs = np.nonzero(poly_mask(HEAD[k], (CH, CW), off) & body)
        sel = xs >= xs.max() - 1
        snout = (float(xs[sel].mean() + off[0]), float(ys[sel].mean() + off[1]))
        ys, xs = np.nonzero(poly_mask(HORNS[k][0], (CH, CW), off) & body)
        sel = ys <= ys.min() + 1
        horn = (float(xs[sel].mean() + off[0]), float(ys[sel].mean() + off[1]))
        return {'snout': snout, 'horn': horn}

    LAND = {k: landmarks(k) for k in keys}
    # His prowl head is drawn larger than his lunge head (and turned a touch). ZREL is the similarity (a complex
    # number: its size and its angle) that lays his lunge head onto his prowl head about the eye, fitted on the
    # snout and horn tips. The in-betweens grow or shrink the head along powers of it, so at each switch between
    # his two drawings (2->3 and 7->0) both sides show the same head, and the head changes size over the loop
    # instead of at the switches.
    vec = {k: [complex(LAND[k][n][0] - EYE[k][0], LAND[k][n][1] - EYE[k][1]) for n in ('snout', 'horn')] for k in keys}
    ZREL = sum(a.conjugate() * b for a, b in zip(vec[5], vec[0])) / sum(abs(a) ** 2 for a in vec[5])
    print('drake landmarks', {k: {n: tuple(round(v) for v in p) for n, p in LAND[k].items()} for k in LAND},
          'prowl head / lunge head', round(abs(ZREL), 4), 'turned', round(float(np.degrees(np.angle(ZREL))), 2), 'deg',
          'fit residual (his px)', [round(abs(ZREL * a - b), 1) for a, b in zip(vec[5], vec[0])])
    # His palette: the stone and moss, plus his eye and glint yellows (too few pixels for the median cut).
    body_px = np.concatenate([keys[k][0][keys[k][1]] for k in keys])
    r_, g_, b_ = body_px[:, 0], body_px[:, 1], body_px[:, 2]
    lum_px = body_px @ np.array([0.3, 0.55, 0.15], np.float32)
    green = (g_ > r_ + 6) & (g_ > b_ + 20)
    glow = (r_ - b_ > 0.42 * r_) & (r_ > g_ + 12) & (r_ > 120)  # the eyes and the glints over them
    horn = (np.abs(r_ - b_) < 12) & (r_ > 110)  # the cool grey of the horns and the brightest plates
    stone = ~green & ~glow & ~horn
    # His near-white horn highlight (the top edge of the big horn) and the orange-amber surround of his
    # eyes are too few pixels for the median cut: they are added as they are.
    hl = horn & (lum_px >= np.percentile(lum_px[horn], 96))
    HORN_HI = np.round(np.median(body_px[hl], 0))
    amb = (r_ > 150) & (r_ - g_ > 40) & (g_ > 80) & (b_ < 100)
    EYE_AMBER = np.round(np.median(body_px[amb], 0))
    # His far eye: a small lemon-yellow oval. It takes the colour of his oval's bright core (the brightest 15% of
    # its pixels); the rest is the JPEG halo where the yellow meets the grey brow, an olive he did not paint.
    EYEW = {k: poly_mask(FAREYE[k], (CH, CW), keys[k][4]) for k in keys}

    def limes(c):
        return (c[..., 0] > 140) & (c[..., 1] > 140) & (c[..., 2] < 110) & (c[..., 1] >= c[..., 0] - 15)

    lime_px = np.concatenate([keys[k][0][keys[k][1] & EYEW[k] & limes(keys[k][0])] for k in keys])
    lime_l = lime_px @ np.array([0.3, 0.55, 0.15], np.float32)
    EYE_LEMON = np.round(np.median(lime_px[lime_l >= np.percentile(lime_l, 90)], 0))
    # His near eye sits in a dark burnt-orange socket rim (left of and under the yellow glow): its pixels, within
    # 24 px of his near eye, are carried as an aux layer, and a pixel next to the glow that they cover takes it.
    SOCKW = {}
    for k in keys:
        crop, body = keys[k][0], keys[k][1]
        r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
        ex, ey = to_work0(k, EYE[k])
        yy_, xx_ = np.mgrid[0:CH, 0:CW]
        near_eye = (xx_ - ex) ** 2 + (yy_ - ey) ** 2 <= 24 ** 2
        hot_ = (r > 200) & (g > 140) & (b < 120)
        amb_ = (r > 150) & (r - g > 40) & (g > 80) & (b < 100)
        lum_ = crop @ np.array([0.3, 0.55, 0.15], np.float32)
        SOCKW[k] = near_eye & body & ~hot_ & ~amb_ & (r - b > 55) & (r - g > 20) & (r < 160) & (lum_ < 125)
    EYE_SOCKET = np.round(np.median(np.concatenate([keys[k][0][SOCKW[k]] for k in keys]), 0))
    # His horn greys: sampled inside his horns only (greyer than the stone), from his darkest seam grey to
    # his near-white highlight.
    HORNW = {}
    for k in keys:
        hm_ = np.zeros((CH, CW), bool)
        for pts in HORNS[k]:
            hm_ |= poly_mask(pts, (CH, CW), keys[k][4])
        HORNW[k] = hm_ & keys[k][1]
    horn_px = np.concatenate([keys[k][0][HORNW[k] & (keys[k][3] > 22)] for k in keys])
    PAL_STONE, PAL_MOSS = median_palette(body_px[stone], 30), median_palette(body_px[green], 8)
    # The horn group: his horns' own greys (a median cut of his horn pixels, so their warmth is his: greyer than
    # the stone, but not blue) and the dark grey of his horn seams. His near-white highlight joins it only where
    # his horn is that light. (His palest stone plates may take these greys too.)
    hl_ = horn_px @ np.array([0.3, 0.55, 0.15], np.float32)
    PAL_HORN = np.concatenate([median_palette(horn_px[hl_ >= 60], 7), np.round(np.median(horn_px[hl_ < 60], 0))[None]])
    PAL_REST = np.concatenate([PAL_HORN, median_palette(body_px[glow], 5), HORN_HI[None], EYE_AMBER[None]])
    PAL = np.concatenate([PAL_STONE, PAL_MOSS, PAL_REST])
    PAL_NO_MOSS = np.concatenate([PAL_STONE, PAL_REST])
    # His outline: the median of the dark pixels on his silhouette (a cool deep brown, not black).
    ring = np.concatenate([keys[k][0][keys[k][1] & ~erode(keys[k][1], 2) & ~keys[k][5]] for k in keys])
    ring = ring[ring @ np.array([0.3, 0.55, 0.15], np.float32) < 30]
    OUTLINE = np.round(np.median(ring, 0))
    # His under-body shadow colour (it fills the narrow gaps closed inside the drake).
    SHADOW = np.round(np.median(np.concatenate([keys[k][0][keys[k][5]] for k in keys]), 0))
    print('drake palette', len(PAL), 'outline', OUTLINE.astype(int).tolist(), 'shadow', SHADOW.astype(int).tolist(),
          'horn highlight', HORN_HI.astype(int).tolist(), 'eye amber', EYE_AMBER.astype(int).tolist(),
          'far eye', EYE_LEMON.astype(int).tolist(), f'({len(lime_px)} px)', 'horn greys', PAL_HORN.astype(int).tolist(),
          'eye socket', EYE_SOCKET.astype(int).tolist(), {k: int(SOCKW[k].sum()) for k in SOCKW})

    # His pieces that move in the in-betweens (his sheet's coordinates). Each is cut from the body along
    # `cut` (its joint) and turned about `pivot`; the turn eases in over `bend` px from the cut, so the
    # piece stays joined to the body there. Far pieces go behind the body, the others over it.
    # His prowl's big round near-thigh plate: it stays on the body, whole (the shin and the far hind leg turn
    # behind it).
    THIGH0 = [(655, 1700), (745, 1700), (745, 1790), (736, 1812), (724, 1832), (702, 1843), (682, 1840), (670, 1828),
              (664, 1810), (662, 1780)]
    PIECES = {
        0: {
            'ff': {'far': True, 'cut': [(892, 1824), (965, 1830)], 'pivot': (928, 1827), 'bend': 16,
                   'poly': [(892, 1824), (965, 1830), (990, 1853), (1058, 1853), (1058, 1904), (892, 1904)]},
            'tail': {'cut': [(652, 1686), (646, 1800)], 'pivot': (649, 1743), 'bend': 22,
                     'poly': [(652, 1680), (646, 1802), (626, 1797), (560, 1806), (515, 1790), (515, 1650), (640, 1650)]},
            # The near hind leg below the knee. His big round thigh plate stays on the body, whole, and the
            # shin and foot turn behind it (he drew the thigh over the top of the shin).
            'nh': {'far': True, 'cut': [(624, 1794), (664, 1800)], 'pivot': (650, 1806), 'bend': 18,
                   'poly': [(624, 1794), (692, 1800), (696, 1848), (714, 1858), (714, 1904), (618, 1904)],
                   'minus': THIGH0},
            'nf': {'cut': [(750, 1802), (848, 1820)], 'pivot': (800, 1811), 'bend': 20,
                   'poly': [(750, 1802), (848, 1820), (858, 1862), (898, 1898), (898, 1955), (745, 1955)]},
            # The far hind leg: the dark limb in the shadow between the haunch and the near front leg.
            'fh': {'far': True, 'cut': [(714, 1796), (768, 1800)], 'pivot': (740, 1798), 'bend': 12,
                   'poly': [(714, 1796), (768, 1800), (752, 1812), (749, 1856), (712, 1856)], 'minus': THIGH0},
            # The head, cut at the neck: scaled and turned about the eye toward his other drawing's head (ZREL),
            # easing in over `bend` px from the neck.
            'head': {'cut': [(906, 1640), (936, 1828)], 'pivot': EYE[0], 'bend': 40,
                     'poly': [(906, 1600), (1112, 1600), (1112, 1853), (990, 1853), (965, 1830), (936, 1828)]},
        },
        5: {
            # (The near and far front paws part along the gap between them, so the far paw's claw and its
            # outline go with it and nothing of it is left behind when it turns.)
            'ff': {'far': True, 'cut': [(1550, 1768), (1606, 1758)], 'pivot': (1578, 1763), 'bend': 14,
                   'poly': [(1550, 1768), (1606, 1758), (1616, 1800), (1614, 1838), (1552, 1838), (1549, 1812), (1552, 1796)]},
            'fh': {'far': True, 'cut': [(1376, 1806), (1418, 1798)], 'pivot': (1397, 1802), 'bend': 12,
                   'poly': [(1376, 1806), (1418, 1798), (1424, 1852), (1372, 1852)]},
            # The tail and the near hind leg part along the dark gap he left between them (the panel shows
            # there), so the tail keeps its whole underside outline and nothing of either is left behind as
            # a sliver when they move apart.
            'tail': {'cut': [(1348, 1692), (1338, 1776)], 'pivot': (1343, 1734), 'bend': 26,
                     'poly': [(1348, 1692), (1338, 1776), (1336, 1790), (1318, 1812), (1300, 1832), (1235, 1870), (1195, 1890), (1150, 1890), (1150, 1845), (1240, 1745), (1300, 1686)]},
            'nh': {'cut': [(1333, 1774), (1388, 1800)], 'pivot': (1360, 1787), 'bend': 18,
                   'poly': [(1333, 1774), (1388, 1800), (1368, 1842), (1356, 1892), (1292, 1892), (1290, 1845), (1300, 1832), (1318, 1812), (1336, 1790), (1338, 1776)]},
            # Its foot, below the ankle: it bends back about the ankle while the leg reaches forward (so the leg keeps
            # his bent shape instead of hanging as one straight pillar).
            'nhf': {'parent': 'nh', 'cut': [(1314, 1844), (1362, 1828)], 'pivot': (1338, 1836), 'bend': 10,
                    'poly': [(1314, 1844), (1362, 1828), (1368, 1842), (1356, 1892), (1292, 1892), (1290, 1845)]},
            'nf': {'cut': [(1478, 1765), (1543, 1768)], 'pivot': (1510, 1766), 'bend': 16,
                   'poly': [(1478, 1765), (1543, 1768), (1551, 1796), (1548, 1812), (1546, 1852), (1488, 1852), (1486, 1800)]},
            'head': {'cut': [(1594, 1600), (1612, 1772)], 'pivot': EYE[5], 'bend': 40,
                     'poly': [(1594, 1590), (1748, 1590), (1748, 1805), (1640, 1805), (1616, 1795), (1612, 1772)]},
        },
    }
    # The body pitches about the shoulders (the head stays steady; the hindquarters rise and fall).
    PITCH = {0: (880, 1745), 5: (1540, 1715)}
    DUST_ORIGIN = (1330, GROUND)  # where it bursts from: the ground behind the hind feet
    JOINT = 10  # (his px) how far from the body a turned piece's joint reaches
    SOFT = 4  # (his px) how far a turned piece's motion blends into the body across its sides, per box pass

    size, oanchor = canvas_for([(WAX, WAY)], CW, CH, S)
    OW, OH = size
    print('drake canvas', size, 'anchor', oanchor)
    yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)

    def to_work(k, pt):
        ox, oy = keys[k][4]
        return (pt[0] - ox, pt[1] - oy)

    def cut_dist(k, pc):
        """Signed distance (his px) from a piece's cut line, positive toward the piece."""
        (x0, y0), (x1, y1) = [to_work(k, p) for p in pc['cut']]
        tx, ty = x1 - x0, y1 - y0
        L = float(np.hypot(tx, ty))
        nx, ny = -ty / L, tx / L
        cx = float(np.mean([to_work(k, p)[0] for p in pc['poly']]))
        cy = float(np.mean([to_work(k, p)[1] for p in pc['poly']]))
        if (cx - x0) * nx + (cy - y0) * ny < 0:
            nx, ny = -nx, -ny
        return x0, y0, nx, ny

    def bend_field(k, pc, deg, sc=1.0):
        """Inverse displacement (for warp) that turns piece pc by deg degrees and scales it by sc about its
        pivot, easing in from its cut."""
        x0, y0, nx, ny = cut_dist(k, pc)
        px, py = to_work(k, pc['pivot'])
        R0 = pc['bend']

        def disp(qx, qy):
            t = np.clip(((qx - x0) * nx + (qy - y0) * ny) / R0, 0, 1)
            e = t * t * (3 - 2 * t)
            a = np.deg2rad(deg) * e
            m = 1.0 + (sc - 1.0) * e
            rx, ry = qx - px, qy - py
            return px + m * (rx * np.cos(a) - ry * np.sin(a)) - qx, py + m * (rx * np.sin(a) + ry * np.cos(a)) - qy

        qx, qy = xx, yy
        for _ in range(5):
            dx, dy = disp(qx, qy)
            qx, qy = xx - dx, yy - dy
        t = np.clip(((qx - x0) * nx + (qy - y0) * ny) / R0, 0, 1)
        return dx.astype(np.float32), dy.astype(np.float32), t.astype(np.float32)

    def rigid(k, deg, bob_px, scale=1.0, tx_px=0.0):
        """Inverse displacement for the whole body: scaled by `scale` about his eye, pitched deg about PITCH[k],
        then moved right tx_px and down bob_px (game px)."""
        px, py = to_work(k, PITCH[k])
        ex, ey = to_work(k, EYE[k])
        ty = bob_px / S
        tx = tx_px / S
        a = np.deg2rad(deg)
        rx, ry = xx - tx - px, yy - ty - py
        sx = px + rx * np.cos(a) + ry * np.sin(a)
        sy = py - rx * np.sin(a) + ry * np.cos(a)
        if scale != 1.0:
            sx = ex + (sx - ex) / scale
            sy = ey + (sy - ey) / scale
        return (xx - sx).astype(np.float32), (yy - sy).astype(np.float32)

    # His two tails bend along their own centre lines (his sheet's coordinates, root to tip; checked on his crops):
    # the prowl's thick tail curls up into a hook, the lunge's spear runs straight down to the dust. In the in-betweens
    # a tail bends toward his other drawing's tail ('curl' in the legs: 0 is his own tail, 1 bends it just as his other
    # tail bends, from a fifth of the way out to the tip), so the curl opens into a spear before the leap and the spear
    # curls back up as the drake lands. The tail keeps its own pixels, plates, length and thickness: every pixel keeps
    # its place along the centre line and its distance from it (a bend, not a stretch). Its base turn ('tail') is the
    # piece's turn about the hip, as for the legs.
    TAIL_AXIS = {
        0: [(650, 1766), (620, 1768), (590, 1770), (565, 1770), (547, 1762), (538, 1748), (537, 1732), (541, 1718),
            (550, 1707), (562, 1699), (575, 1693), (585, 1690)],
        5: [(1338, 1748), (1310, 1772), (1284, 1797), (1260, 1815), (1235, 1833), (1210, 1849), (1186, 1862)],
    }
    AXIS_EXT, TIP_EXT = 60, 12  # (his px) the centre line runs on straight before the root and past the tip
    # How far his tail reaches on the inner side of its curl (the side the prowl's hook curls toward), along its
    # length (0 root, 1 tip): the plates on the top of his prowl's tail belong to it, not to the hook just beside them,
    # and the tall plates by the hip belong to the root. On the outer side it reaches TAIL_OUTER px.
    TAIL_INNER = {0: [(0.0, 130.0), (0.15, 130.0), (0.3, 50.0), (0.40, 50.0), (0.52, 16.0), (1.0, 16.0)],
                  5: [(0.0, 70.0), (1.0, 70.0)]}
    TAIL_OUTER = 60.0

    def axis_of(k):
        """His tail's centre line at 1 px steps (work coordinates, smoothed so its corners do not kink the bend), the
        heading of each step, and the line's length, with straight runs added before the root (AXIS_EXT px) and past
        the tip (TIP_EXT px: far enough for the tip's last pixels, not so far that it takes in the plates by the hip)."""
        pts = np.array([to_work(k, p) for p in TAIL_AXIS[k]], np.float64)
        cum = np.concatenate([[0.0], np.cumsum(np.hypot(*np.diff(pts, axis=0).T))])
        sv = np.arange(0.0, cum[-1], 1.0)
        P = np.stack([np.interp(sv, cum, pts[:, 0]), np.interp(sv, cum, pts[:, 1])], 1)
        for _ in range(3):
            q = np.pad(P, ((6, 6), (0, 0)), mode='edge')
            c = np.cumsum(np.pad(q, ((1, 0), (0, 0))), 0)
            P = (c[13:] - c[:-13]) / 13.0
        d = np.diff(P, axis=0)
        L = float(np.hypot(*d.T).sum())
        head = P[0] - np.arange(AXIS_EXT, 0, -1)[:, None] * (d[0] / np.hypot(*d[0]))
        tail_ = P[-1] + np.arange(1, TIP_EXT + 1)[:, None] * (d[-1] / np.hypot(*d[-1]))
        return np.concatenate([head, P, tail_]), L

    AXES = {k: axis_of(k) for k in (0, 5)}

    def tail_axis(k, w):
        """His tail k's centre line (with its straight runs) and the same line bent toward his other tail by w."""
        P, L = AXES[k]
        n = len(P) - AXIS_EXT - TIP_EXT
        d = np.diff(P, axis=0)
        phi = np.unwrap(np.arctan2(d[:, 1], d[:, 0]))
        if not w:
            return P, P, phi, phi
        Po, _ = AXES[5 - k]
        do = np.diff(Po, axis=0)
        phio = np.unwrap(np.arctan2(do[:, 1], do[:, 0]))
        no = len(Po) - AXIS_EXT - TIP_EXT
        # Each tail's turn along its length (from its root), on one scale from root (0) to tip (1).
        sig = np.clip((np.arange(len(phi)) - AXIS_EXT) / (n - 1), 0.0, 1.0)
        tau = phi - phi[AXIS_EXT]
        tau_o = np.interp(sig * (no - 1), np.arange(no), phio[AXIS_EXT:AXIS_EXT + no] - phio[AXIS_EXT])
        u = np.clip((sig - 0.15) / 0.3, 0.0, 1.0)
        phin = phi + w * u * u * (3 - 2 * u) * (tau_o - tau)
        ang = phin - phi
        rot = np.stack([d[:, 0] * np.cos(ang) - d[:, 1] * np.sin(ang), d[:, 0] * np.sin(ang) + d[:, 1] * np.cos(ang)], 1)
        Pn = np.concatenate([P[:1], P[0] + np.cumsum(rot, 0)])
        return P, Pn, phi, phin

    def nearest_vertex(k, P, phi, qx, qy):
        """Index of the nearest point of his tail k's centre line P for every query point (first one on ties), among
        the points whose reach on the inner side (TAIL_INNER) takes the query point in."""
        n = len(P) - AXIS_EXT - TIP_EXT
        sig = np.clip((np.arange(len(P)) - AXIS_EXT) / (n - 1), 0.0, 1.0)
        tab = np.array(TAIL_INNER[k])
        lim = np.interp(sig, tab[:, 0], tab[:, 1])[None]
        ph = np.concatenate([phi, phi[-1:]])
        Px, Py, sn, cs = P[:, 0][None], P[:, 1][None], np.sin(ph)[None], np.cos(ph)[None]
        out = np.empty(len(qx), np.int64)
        for i in range(0, len(qx), 4096):
            rx, ry = qx[i:i + 4096, None] - Px, qy[i:i + 4096, None] - Py
            dd = rx * rx + ry * ry
            b = -rx * sn + ry * cs
            dd = np.where((b > lim) | (b < -TAIL_OUTER), dd + 1e9, dd)
            out[i:i + 4096] = np.argmin(dd, 1)
        return out

    def curl_layer(k, w, img, m):
        """His tail k (image `img`, mask `m`, work coordinates) bent by w: each of his tail pixels (4 x 4 samples per
        pixel) keeps its place along the centre line and its signed distance from it, and is laid down on the bent
        line (bilinear splat). Returns the premultiplied image and the coverage."""
        P, Pn, phi, phin = tail_axis(k, w)
        ys, xs = np.nonzero(m)
        sub = (np.arange(4) + 0.5) / 4 - 0.5
        oy, ox = [a.ravel() for a in np.meshgrid(sub, sub, indexing='ij')]
        qx = (xs[:, None] + ox[None]).ravel().astype(np.float64)
        qy = (ys[:, None] + oy[None]).ravel().astype(np.float64)
        src = np.repeat(np.arange(len(xs)), 16)
        idx = np.minimum(nearest_vertex(k, P, phi, qx, qy), len(phi) - 1)
        rx, ry = qx - P[idx, 0], qy - P[idx, 1]
        c, s_ = np.cos(phi[idx]), np.sin(phi[idx])
        a, b = rx * c + ry * s_, -rx * s_ + ry * c
        cn, sn = np.cos(phin[idx]), np.sin(phin[idx])
        dx_ = Pn[idx, 0] + a * cn - b * sn
        dy_ = Pn[idx, 1] + a * sn + b * cn
        H, W = m.shape
        ch = img.shape[2]
        acc = np.zeros((H * W, ch), np.float64)
        wsum = np.zeros(H * W, np.float64)
        # (Source pixel colour: the subsample's own pixel; image coordinates are pixel centres.)
        colv = img[ys[src], xs[src]].astype(np.float64)
        x0 = np.floor(dx_).astype(np.int64)
        y0 = np.floor(dy_).astype(np.int64)
        fx, fy = dx_ - x0, dy_ - y0
        for ddx, ddy, wt in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
            xi, yi = x0 + ddx, y0 + ddy
            ok = (xi >= 0) & (xi < W) & (yi >= 0) & (yi < H)
            flat = yi[ok] * W + xi[ok]
            np.add.at(wsum, flat, wt[ok] / 16.0)
            np.add.at(acc, flat, colv[ok] * (wt[ok] / 16.0)[:, None])
        cov = np.clip(wsum, 0.0, 1.0).reshape(H, W)
        colr = (acc / np.maximum(wsum, 1e-9)[:, None]).reshape(H, W, ch)
        return (colr * cov[..., None]).astype(np.float32), cov.astype(np.float32)

    def tail_tip(k, legs):
        """Where his tail k's tip lands (work coordinates) with the legs' 'curl' and the tail's base turn."""
        P, Pn, phi, phin = tail_axis(k, legs.get('curl', 0.0))
        q = Pn[len(Pn) - TIP_EXT - 1]
        pc = PIECES[k]['tail']
        px, py = to_work(k, pc['pivot'])
        a = np.deg2rad(legs.get('tail', 0.0))
        rx, ry = q[0] - px, q[1] - py
        return px + rx * np.cos(a) - ry * np.sin(a), py + rx * np.sin(a) + ry * np.cos(a)

    # Each key split into its pieces and the rest of the body.
    split = {}
    for k in (0, 5):
        crop, body, rest, diff, off, shade = keys[k]
        masks = {n: poly_mask(pc['poly'], (CH, CW), off) & body for n, pc in PIECES[k].items()}
        for n, pc in PIECES[k].items():
            if 'minus' in pc:
                masks[n] &= ~poly_mask(pc['minus'], (CH, CW), off)
        # (The head keeps out of the legs' pieces; a piece's child is cut out of it.)
        for n in masks:
            if n != 'head':
                masks['head'] &= ~masks[n]
        for n, pc in PIECES[k].items():
            if 'parent' in pc:
                masks[pc['parent']] &= ~masks[n]
        for n, pc in PIECES[k].items():
            # Crumbs the outline caught that are not joined to the piece stay on the body.
            for p in components(masks[n]):
                if len(p) < 60:
                    masks[n][tuple(np.array(p).T)] = False
        base = body.copy()
        for m in masks.values():
            base &= ~m
        # The joints are where a turned piece meets the body proper: a stray body pixel or two left between two
        # pieces (between his lunge's front paws) is not a joint, or the paws near it would be bent into specks.
        core = base.copy()
        for p in components(base):
            if len(p) < 20:
                core[tuple(np.array(p).T)] = False
        split[k] = (masks, base, core)
    if DEBUG:
        cols = {'ff': (255, 128, 0), 'fh': (0, 255, 0), 'tail': (255, 0, 255), 'nh': (0, 255, 255), 'nf': (255, 255, 0), 'head': (255, 64, 64), 'nhf': (0, 128, 255)}
        for k in (0, 5):
            masks, base, _ = split[k]
            vis = (keys[k][0] * 0.5).astype(np.uint8)
            vis[base] = keys[k][0][base].astype(np.uint8)
            for n, m in masks.items():
                vis[m] = (keys[k][0][m] * 0.5 + np.array(cols[n]) * 0.5).astype(np.uint8)
            Image.fromarray(vis).save(os.path.join(DEBUG, f'drake-pieces-{k}.png'))

    # His dust (his lunge picture only), in his own colours and opaque, as he painted it: the pile is a solid
    # mound of cream boulders on dark soil standing on his ground (its flat bottom, where his panel cut it, is
    # closed in rounded puffs below: FOOT_PUFFS); the streaks and specks flying off it are kept too, and only
    # where they are thinner than a game pixel do they keep a partial alpha.
    crop5, body5, rest5, diff5, off5, _ = keys[5]
    gx5, gy5 = xx + off5[0], yy + off5[1]
    dust = rest5.copy()
    lum5 = crop5 @ np.array([0.3, 0.55, 0.15], np.float32)
    # The pile's left side is a straight line (x 1137) where his picture's box cut it. It ends instead along
    # his boulders there: each cream boulder the line cuts is rounded off, the darker soil between them stays
    # a few px further in, and the pile's foot spreads out to the line on the ground. (This first cut sets his
    # pile and palette; the side is finished in rounded puffs further down: SIDE_PUFFS.)
    CUT_X = 1137
    PILE_R = 7  # (his px) splash fingers thinner than twice this are spray, not pile
    col = (lum5 > 150) & dust
    xc = int(round(CUT_X + 2 - off5[0]))
    rows_l = [int(y) for y in range(CH) if col[y, xc]]
    spans = []
    for y in rows_l:
        if spans and y <= spans[-1][1] + 2:
            spans[-1][1] = y
        else:
            spans.append([y, y])
    spans = [(a + off5[1], b + off5[1]) for a, b in spans if b - a >= 6]
    gyv = gy5[:, 0]
    depth = np.minimum((GROUND - gyv) * 0.55, 15.0)
    for ya, yb in spans:
        cy_, h = (ya + yb) / 2.0, (yb - ya) / 2.0 + 1.0
        R = min(h, 11.0)
        u = np.abs(gyv - cy_) / h
        dd = np.where(u <= 1, R * (1 - np.sqrt(np.clip(1 - u * u, 0, 1))), R + (np.abs(gyv - cy_) - h) * 1.1)
        depth = np.minimum(depth, dd)
    dust &= ~(gx5 < (CUT_X + depth)[:, None])
    dust &= gy5 <= GROUND + 1  # (his flat bottom is the ground; below it is the soft edge of the JPEG)
    print('dust: boulders cut by his frame line at y', spans)
    # Specks of a few px that are no brighter than the panel's JPEG ringing are noise, not his dirt.
    for p in components(dust):
        p = np.array(p)
        if len(p) < 10 and diff5[p[:, 0], p[:, 1]].max() < 90:
            dust[p[:, 0], p[:, 1]] = False
    # His clod on the tip of his tallest back spike is not part of the burst: it rides the spike from the leap
    # (frames 3-5, so it comes in with the switch to his lunge drawing), then is kicked off up and back and fades.
    clod = dust & poly_mask(LOOSE[0], (CH, CW), off5)
    dust &= ~clod
    # (It is drawn from its core, 1 of his px in from its edge: his edge pixels are half panel, and kept whole
    # they made the clod about a pixel too wide on each side at game scale.)
    clod_core = erode(clod, 1)
    # The pile is his mound: the biggest piece of the dust once an opening has taken off its thin splash
    # fingers. Everything else (the fingers, the streaks and the loose specks) is his spray.
    mound = dilate(erode(dust, PILE_R), PILE_R) & dust
    comps = sorted(components(mound), key=len, reverse=True)
    pile = np.zeros((CH, CW), bool)
    pts = np.array(comps[0])
    pile[pts[:, 0], pts[:, 1]] = True
    pile = dilate(pile, 2) & dust
    # (The mound's foot along the ground is pile however thin it gets: his dark soil tapering off to the right.)
    pile |= dust & (gy5 >= GROUND - 14)
    spray = dust & ~pile
    # His spray is thin, bright orange strokes with no dark edge. The dark rim around each stroke is where the
    # JPEG blended it into his dark panel; kept as solid soil browns, it made every streak read as a muddy
    # outline. So each of his spray pixels counts for how much of it is his stroke and how much his panel
    # (by its brightness, from the panel's to his stroke cores'), and only his bright stroke pixels give the
    # colour (strongly orange: red over blue by more than 50, and light).
    r5c, b5c = crop5[..., 0], crop5[..., 2]
    spray_a = spray * np.clip((lum5 - 40.0) / (140.0 - 40.0), 0.0, 1.0) * (r5c - b5c >= 20)
    sbright = spray & (r5c - b5c > 50) & (lum5 >= 110)
    # The darker parts of his strokes, still clearly orange, say where a stroke is (the bright ones give its colour):
    # gating the spray by the bright parts alone left the middle of his wider streaks see-through.
    sstroke = spray & (r5c - b5c > 40) & (lum5 >= 85)
    # His pale pebble specks: small bits of stone flung up with the dust, light and unsaturated (not orange). They
    # take his stone colours.
    pebble = np.zeros((CH, CW), bool)
    for p in components(spray):
        p = np.array(p)
        if len(p) > 80:
            continue
        cpx = crop5[p[:, 0], p[:, 1]]
        lp = cpx @ np.array([0.3, 0.55, 0.15], np.float32)
        top = cpx[lp >= np.percentile(lp, 70)].mean(0)
        if lp.max() >= 140 and top[0] - top[2] < 50:
            sel = lp >= 90
            pebble[p[sel, 0], p[sel, 1]] = True
    sbright &= ~pebble
    sstroke &= ~pebble
    print('dust: pile px', int(pile.sum()), 'spray px', int(spray.sum()), 'bright spray px', int(sbright.sum()),
          'stroke px', int(sstroke.sum()), 'pebble px', int(pebble.sum()), 'clod px', int(clod.sum()))
    core = dilate(erode(pile, 3), 3)
    # Colour from his solid dust pixels (the edge pixels he shares with the dark panel would darken it).
    wcol = np.clip((diff5 - 30.0) / 50.0, 0.05, 1.0) * pile
    sat = pile & (diff5 > 70)
    DUST = median_palette(crop5[sat], 10)
    # Partly clear dust takes every other dust colour (the palette has to fit the alphabet).
    DUST_A = DUST[::2]
    # His streak oranges: the light half of his dust colours (his streak cores' mid orange and the lighter
    # tone along their middle); never the dark soil browns, which are his pile's. Partly clear spray takes the
    # partly clear dust colour nearest to his streaks' mean.
    lw = np.array([0.3, 0.55, 0.15], np.float32)
    SPRAY = DUST[DUST @ lw >= 100]
    spray_mean = crop5[sbright].mean(0)
    SPRAY_A = DUST_A[np.argmin(((DUST_A - spray_mean) ** 2).sum(1))]
    print('dust palette', DUST.astype(int).tolist(), 'spray colours', SPRAY.astype(int).tolist(),
          'his spray mean', np.round(spray_mean).astype(int).tolist(), 'partly clear spray', SPRAY_A.astype(int).tolist())
    # His pile's bottom. His panel cut the pile off flat along the ground (y 1948), so every frame with dust showed
    # a straight line under it. It ends instead in a row of rounded puffs, as the fire 3/4 wall's ends were
    # closed: each puff is his own pile (two of them are his cream boulders that sat on the cut, rounded off
    # underneath), the soil between them stays a few px further up, and the puffs get smaller and stay further off
    # the ground toward both ends, so the pile's corners round off too. A puff's bottom is ragged (a slow wobble of
    # about half a game px) and thins out over its last FOOT_FADE px into partly clear dust (his partly clear dust
    # colours). It applies to his pile in every frame, so the burst (frames 3-4) and the settling dust (6-7, where
    # the pile wears down from the top onto these puffs) end the same way. (Done after his palette is sampled, so
    # his dust keeps every colour it had.)
    FOOT_PUFFS = [  # (his x of its middle, its half width, how far up its sides curve, its lowest point's height off the ground)
        (1158, 10, 11, 7), (1181, 13, 14, 0), (1207, 11, 12, 5), (1232, 13, 14, 0), (1260, 12, 13, 3),
        (1285, 11, 12, 7), (1311, 14, 15, 1), (1339, 12, 13, 4), (1365, 13, 14, 1), (1392, 12, 13, 5),
        (1417, 11, 12, 2), (1439, 9, 10, 5), (1458, 8, 8, 6), (1475, 6, 7, 6)]
    FOOT_FADE = 5.0
    gxv = gx5[0]
    lift = np.full(CW, 1e3, np.float32)
    for cx_, hw_, R_, b_ in FOOT_PUFFS:
        d_ = np.abs(gxv - cx_)
        u = d_ / hw_
        lift = np.minimum(lift, np.where(u <= 1, b_ + R_ * (1 - np.sqrt(np.clip(1 - u * u, 0, 1))), b_ + R_ + (d_ - hw_) * 1.1))
    lift += 1.2 * np.sin(gxv * 0.31 + 1.1)  # (the ragged wobble)
    foot = np.clip((GROUND + 1 - lift[None, :] - gy5 + 1) / FOOT_FADE, 0.0, 1.0).astype(np.float32)
    # His pile's left side, closed the same way. The first cut (above) only rounded his box line where it cut a
    # cream boulder; between those the side stayed one straight line 15 px in, which the burst (frames 3-4, his
    # pile scaled about the ground) showed as a vertical wipe. Now the whole side is a column of rounded puffs: his
    # top and bottom boulders out on the line, the boulder between them a puff 15 px in, a small soil puff under
    # it and one above the foot, the side curling in between them. Each puff thins out over its last FOOT_FADE px
    # like the bottom's. (It only takes away from the first cut, so his palette and pile split stay as they were,
    # and the burst grows into frame 5's side as his pile grows.)
    SIDE_PUFFS = [  # (his y of its middle, its half height, how far in its ends curve, its leftmost point in from his line)
        (1843, 12, 13, -1.5), (1872, 9, 12, 15), (1892, 6, 8, 17), (1909, 10, 11, -1.5), (1929, 6, 10, 9)]
    gyv = gy5[:, 0]
    reach = np.full(CH, 1e3, np.float32)
    for cy_, hh_, R_, b_ in SIDE_PUFFS:
        d_ = np.abs(gyv - cy_)
        u = d_ / hh_
        reach = np.minimum(reach, np.where(u <= 1, b_ + R_ * (1 - np.sqrt(np.clip(1 - u * u, 0, 1))), b_ + R_ + (d_ - hh_) * 1.5))
    reach += 1.0 * np.sin(gyv * 0.29 + 0.4)  # (the ragged wobble)
    side = np.clip((gx5 - CUT_X - reach[:, None] + 1) / FOOT_FADE, 0.0, 1.0).astype(np.float32)
    pile_cut = pile.copy()  # (his pile as his panel cut it: the settling below keeps its boulders and soil tones)
    pile_th = foot * side  # (how thick his pile is: thinning out at the puffs' edges)
    pile &= pile_th > 0
    core &= pile
    wcol = wcol * pile
    print('dust: pile px after its bottom is closed', int(pile.sum()))
    pile_f, core_f, spray_f, clod_f = (m.astype(np.float32) for m in (pile, core, sbright, clod_core))
    stroke_f, pebble_f = sstroke.astype(np.float32), pebble.astype(np.float32)
    PEBBLE = median_palette(crop5[pebble], 3)  # his pebbles' own pale greys
    spray_a = (spray_a * ~pebble).astype(np.float32)
    # The settling dust (frames 6-7) breaks up rather than fading as one sheet: his cream boulders are clusters that
    # spread apart and fade one by one (the small ones first), the darkest soil goes first and the pile wears down
    # from the top. Each boulder cluster takes the shaded rim around it (2 px into the pile).
    # (The clusters, their order and the soil's tones are his whole pile's, as his panel cut it; the closed bottom
    # then applies to them like to the rest.)
    boulders = [np.array(p) for p in components(pile_cut & (lum5 > 150)) if len(p) >= 25]
    blab = -np.ones((CH, CW), np.int32)
    for i, p in enumerate(boulders):
        blab[p[:, 0], p[:, 1]] = i
    for _ in range(2):
        grow = blab.copy()
        for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nb = np.roll(np.roll(blab, oy, 0), ox, 1)
            take = (grow < 0) & (nb >= 0) & pile_cut
            grow[take] = nb[take]
        blab = grow
    soil_lum = np.sort(lum5[pile_cut & (blab < 0)])
    blab[~pile] = -1
    soil = pile & (blab < 0)
    p_height = np.where(pile_cut, GROUND - gy5, 0.0)
    pile_top = float(p_height.max())
    b_cent = [(float(p[:, 1].mean()), float(p[:, 0].mean())) for p in boulders]
    b_rank = np.argsort(np.argsort([len(p) for p in boulders], kind='stable'), kind='stable')
    b_fade = 0.3 + 0.6 * b_rank / max(1, len(boulders) - 1)  # (when each boulder has faded: the smallest first)
    print('dust: boulder clusters', len(boulders), 'soil px', int(soil.sum()), 'pile height', round(pile_top))

    def settled(st):
        """His pile at settling stage st (0 his pile, 1 gone): per-pixel opacity and colour (work coordinates)."""
        keep = soil & (lum5 >= soil_lum[min(len(soil_lum) - 1, int(0.9 * st * len(soil_lum)))])
        keep &= p_height <= pile_top * (1.0 - 0.55 * st)
        op_ = keep * (1.0 - 0.4 * st) * pile_th
        col_ = crop5.copy()
        wc_ = wcol * keep
        gox_ = to_work(5, DUST_ORIGIN)[0]
        for i, p in enumerate(boulders):
            a_ = float(np.clip((b_fade[i] - st) / 0.25, 0.0, 1.0))
            if a_ <= 0:
                continue
            ddx_ = int(round((b_cent[i][0] - gox_) * 0.12 * st))
            ys_, xs_ = np.nonzero(blab == i)
            ty_, tx_ = ys_, np.clip(xs_ + ddx_, 0, CW - 1)
            # (A boulder spreading off the pile keeps its own left side: it is already fading as a cluster. It thins
            # out only along the bottom.)
            op_[ty_, tx_] = np.maximum(op_[ty_, tx_], a_ * foot[ys_, xs_])
            col_[ty_, tx_] = crop5[ys_, xs_]
            wc_[ty_, tx_] = np.maximum(wc_[ty_, tx_], wcol[ys_, xs_] * a_)
        return op_.astype(np.float32), col_, wc_.astype(np.float32)
    # His aux layers, carried through every warp with the colour: horn (ch 3), far eye (ch 4), near eye socket (ch 5).
    crop6 = {}
    for k in (0, 5):
        crop = keys[k][0]
        fe = (EYEW[k] & limes(crop) & keys[k][1]).astype(np.float32)
        crop6[k] = np.concatenate([crop, HORNW[k].astype(np.float32)[..., None], fe[..., None],
                                   SOCKW[k].astype(np.float32)[..., None]], -1)
    # His lowest claw in his prowl (the feet line), in working-canvas rows; both keys share the canvas rows.
    FEET_ROW = int(np.nonzero(keys[0][1].sum(1) >= 2)[0].max())

    def eye_at(k, pitch=0.0, bob=0.0, tx=0.0):
        """Where his near eye lands on our canvas for a frame from key k pitched, bobbed and moved (exact)."""
        ex, ey = to_work(k, EYE[k])
        px, py = to_work(k, PITCH[k])
        a = np.deg2rad(pitch)
        dx_, dy_ = ex - px, ey - py
        wx = px + dx_ * np.cos(a) - dy_ * np.sin(a) + tx / S
        wy = py + dx_ * np.sin(a) + dy_ * np.cos(a) + bob / S
        return oanchor[0] + (wx - WAX) * S, oanchor[1] + (wy - WAY) * S

    EYE0 = eye_at(0)

    def head_tf(hz, pitch, scale):
        """The head piece's own scale and turn (degrees) for a frame whose head is ZREL ** hz of his drawing's
        (hz < 0 shrinks his prowl head toward his lunge head, hz > 0 grows his lunge head toward his prowl head),
        on a body scaled by `scale` and pitched by `pitch`: the head keeps that size and that angle on screen."""
        if not hz:
            return 1.0, 0.0
        return abs(ZREL) ** hz / scale, hz * float(np.degrees(np.angle(ZREL))) - pitch

    def land_at(k, pt, pitch, bob, tx, scale, hz):
        """Where a point of his head (his sheet's coordinates) lands on our canvas in a frame (exact)."""
        hsc, hdeg = head_tf(hz, pitch, scale)
        ex, ey = EYE[k]
        a = np.deg2rad(hdeg)
        rx, ry = pt[0] - ex, pt[1] - ey
        qx = ex + scale * hsc * (rx * np.cos(a) - ry * np.sin(a))
        qy = ey + scale * hsc * (rx * np.sin(a) + ry * np.cos(a))
        wx, wy = to_work(k, (qx, qy))
        px, py = to_work(k, PITCH[k])
        a = np.deg2rad(pitch)
        dx_, dy_ = wx - px, wy - py
        wx = px + dx_ * np.cos(a) - dy_ * np.sin(a) + tx / S
        wy = py + dx_ * np.sin(a) + dy_ * np.cos(a) + bob / S
        return oanchor[0] + (wx - WAX) * S, oanchor[1] + (wy - WAY) * S

    # His far eye as he painted it at game scale: a small upright oval, his bright lemon where it glows and his dim
    # olive-yellow where it is shaded, in a dark olive rim, read from his picture box-filtered onto our grid (cells
    # where it is clearly yellow; the rim is the yellowish cells next to them). It is stamped whole at the far eye's
    # place in every frame (its height follows the head's size), never resampled, so it cannot break into a '+'.
    FW = np.array([0.3, 0.55, 0.15], np.float32)
    FE = {}
    fe_cells = {'core': [], 'rim': []}
    for k in (0, 5):
        crop, body = keys[k][0], keys[k][1]
        _, his = shrink(crop, np.ones((CH, CW), np.float32), (WAX, WAY), S, size, oanchor)
        reg, _ = shrink(crop, EYEW[k].astype(np.float32), (WAX, WAY), S, size, oanchor)
        reg = dilate(reg > 0.3, 1)
        Yl = (his[..., 0] + his[..., 1]) / 2 - his[..., 2]
        Lh = his @ FW
        fcore = reg & (Yl >= 60) & (Lh >= 135)
        frim = reg & ~fcore & dilate(fcore, 1) & (Yl >= 45) & (Lh >= 85)
        fpx = np.argwhere(EYEW[k] & limes(crop) & body)
        fec = (float(fpx[:, 1].mean()) + keys[k][4][0], float(fpx[:, 0].mean()) + keys[k][4][1])
        ys_, xs_ = np.nonzero(fcore | frim)
        bx = (int(xs_.min()), int(ys_.min()), int(xs_.max()) + 1, int(ys_.max()) + 1)
        FE[k] = {'fec': fec, 'c': land_at(k, fec, 0.0, 0.0, 0.0, 1.0, 0.0), 'box': bx,
                 'core': fcore[bx[1]:bx[3], bx[0]:bx[2]], 'rim': frim[bx[1]:bx[3], bx[0]:bx[2]],
                 'his': his[bx[1]:bx[3], bx[0]:bx[2]]}
        fe_cells['core'].append(his[fcore])
        fe_cells['rim'].append(his[frim])
    fe_core_px = np.concatenate(fe_cells['core'])
    fe_l = fe_core_px @ FW
    FE_BRIGHT = np.round(np.median(fe_core_px[fe_l >= 185], 0))
    FE_MID = np.round(np.median(fe_core_px[fe_l < 185], 0))
    FE_RIM = np.round(np.median(np.concatenate(fe_cells['rim']), 0))
    for k in (0, 5):
        g_ = FE[k]
        g_['idx'] = np.where(g_['core'], np.where(g_['his'] @ FW >= 185, 3, 2), np.where(g_['rim'], 1, 0)).astype(np.int8)
    PAL_PLAIN = np.concatenate([PAL_STONE, PAL_HORN])
    print('drake far eye: bright', FE_BRIGHT.astype(int).tolist(), 'shaded', FE_MID.astype(int).tolist(), 'rim',
          FE_RIM.astype(int).tolist(), {k: (FE[k]['box'], [int((FE[k]['idx'] == v).sum()) for v in (3, 2, 1)]) for k in FE})

    def far_eye(k, pitch, bob, tx, scale, hz):
        """His far eye stamp for a frame: (index grid, its top-left x, y on our canvas)."""
        g_ = FE[k]
        vf = abs(ZREL) ** hz if hz else 1.0
        cx2, cy2 = land_at(k, g_['fec'], pitch, bob, tx, scale, hz)
        Hh = g_['idx'].shape[0]
        H2 = max(1, int(round(Hh * vf)))
        rows = np.minimum(((np.arange(H2) + 0.5) * Hh / H2).astype(int), Hh - 1)
        x0, y0 = g_['box'][0], g_['box'][1]
        ox_ = int(round(cx2 + (x0 - g_['c'][0])))
        oy_ = int(round(cy2 + (y0 - g_['c'][1] + 0.5 * Hh) - 0.5 * H2))
        return g_['idx'][rows], ox_, oy_

    def pose(k, pitch=0.0, eye=0.0, legs=None, dust_at=None, scale=1.0, hz=0.0, feet=False, clod_at=None):
        """Frame from key k: pieces turned by legs[name] degrees and the head grown or shrunk toward his other
        head (head_tf); the whole body scaled by `scale` about the eye, pitched, and carried so that the eye sits
        at frame 0's x and `eye` game px below frame 0's eye (or, with `feet`, so that the lowest claw stands on
        the feet line).

        dust_at = (x scale, y scale, dx in game px, alpha) about DUST_ORIGIN (on the ground), or None.
        clod_at = (dx, dy in game px, alpha): his clod on the spike tip, moved off it, or None.
        Returns the frame and its (bob, tx) in game px."""
        crop = crop6[k]
        masks, base, _ = split[k]
        legs = dict(legs or {})
        hsc, hdeg = head_tf(hz, pitch, scale)
        if hz:
            legs['head'] = hdeg
        far, near = [], []
        fields = {}
        own = {}
        for n, pc in PIECES[k].items():
            m = masks[n].astype(np.float32)
            sc = hsc if n == 'head' else 1.0
            par = pc.get('parent')
            if n == 'tail' and legs.get('curl', 0.0):
                # The tail bent toward his other tail along its centre line, then turned about the hip.
                pr, cv = curl_layer(k, legs['curl'], crop, masks[n])
                dx, dy, t = bend_field(k, pc, legs.get(n, 0.0), 1.0)
                own[n] = (dx, dy, t)
                fields[n] = (dx, dy)
                lay = (warp(pr, dx, dy), warp(cv, dx, dy), warp(cv, dx, dy) * t)
            elif legs.get(n, 0.0) or sc != 1.0 or (par and legs.get(par, 0.0)):
                dx, dy, t = bend_field(k, pc, legs.get(n, 0.0), sc)
                if par and par in own:
                    # A child piece turns with its parent: its own turn first, then the parent's (and it is as
                    # free of the body as its parent, so no edge line is drawn where it joins it).
                    pdx, pdy, pt = own[par]
                    dx, dy, t = pdx + warp(dx, pdx, pdy), pdy + warp(dy, pdx, pdy), np.maximum(warp(t, pdx, pdy), pt)
                own[n] = (dx, dy, t)
                fields[n] = (dx, dy)
                lay = (warp(crop * m[..., None], dx, dy), warp(m, dx, dy), warp(m, dx, dy) * t)
            else:
                lay = (crop * m[..., None], m, np.zeros_like(m))
            (far if pc.get('far') else near).append(lay)
        b = base.astype(np.float32)
        layers = far + [(crop * b[..., None], b, np.zeros_like(b))] + near
        if fields:
            # The joints. A turned piece must not open a see-through gap, or a flat patch, where it leaves the
            # body along its sides. Under everything goes the whole body bent by one smooth field: each piece's
            # own turn, blended into the body's stillness over about SOFT px across the piece's edges. So
            # whatever a turned piece uncovers shows his own pixels there, stretched a little, as a joint does.
            # It is kept to the joints: where a turned piece lay next to the body (within JOINT px of it).
            # Elsewhere it would leave a half-turned ghost of the piece's edges where the piece moved away.
            bk = keys[k][1].astype(np.float32)
            gb = np.maximum(soften(bk, SOFT), 1e-3)
            DX = np.zeros((CH, CW), np.float32)
            DY = np.zeros((CH, CW), np.float32)
            joint = np.zeros((CH, CW), bool)
            near_base = dilate(split[k][2], JOINT)
            for n, (dx, dy) in fields.items():
                w = np.clip(soften(masks[n], SOFT) / gb, 0.0, 1.0)
                DX += w * dx
                DY += w * dy
                joint |= masks[n] & near_base
            ja = (bk * joint).astype(np.float32)
            layers = [(warp(crop * ja[..., None], DX, DY), warp(ja, DX, DY), np.zeros((CH, CW), np.float32))] + layers
        prem = np.zeros((CH, CW, crop.shape[2]), np.float32)
        cov = np.zeros((CH, CW), np.float32)
        free = np.zeros((CH, CW), np.float32)  # near pieces away from their joint (they get an edge line)
        for pr, a, w in layers:
            prem = pr + prem * (1 - a[..., None])
            cov = a + cov * (1 - a)
            free = w + free * (1 - a)
        moved = bool(legs) or pitch != 0.0 or scale != 1.0 or feet or eye != 0.0
        bob, tx = 0.0, 0.0
        if moved:
            # Carried so the eye keeps frame 0's x; held up by the feet or by the eye's arc.
            tx = EYE0[0] - eye_at(k, pitch)[0]
            if feet:
                c0 = warp(cov, *rigid(k, pitch, 0.0, scale, tx))
                low = int(np.nonzero((c0 > 0.5).sum(1) >= 2)[0].max())
                bob = (FEET_ROW - low) * S
            else:
                bob = EYE0[1] + eye - eye_at(k, pitch)[1]
            RG = rigid(k, pitch, bob, scale, tx)
            prem, cov, free = warp(prem, *RG), warp(cov, *RG), warp(free, *RG)
        rgb6 = prem / np.maximum(cov, 1e-4)[..., None]
        rgb = rgb6[..., :3]
        A, C = shrink(rgb, cov, (WAX, WAY), S, size, oanchor)
        Af, _ = shrink(rgb, free, (WAX, WAY), S, size, oanchor)
        _, AUX = shrink(rgb6[..., 3:6], cov, (WAX, WAY), S, size, oanchor)
        out = np.zeros((OH, OW, 4), np.uint8)

        def levels_of(a_px):
            return np.where(a_px > 0.8, 255, np.where(a_px > 0.47, 160, np.where(a_px > 0.2, 95, 0)))

        if dust_at is not None:
            sx_, sy_, ddx, alpha = dust_at[:4]
            st_ = dust_at[4] if len(dust_at) > 4 else 0.0
            # (The dust lives on the ground: it does not follow the body's pitch and bob. Every key's working
            # canvas has its placement point at (WAX, WAY), so key 5's dust lands on any frame as it is.)
            gox, goy = to_work(5, DUST_ORIGIN)
            qx = gox + (xx - gox - ddx / S) / sx_
            qy = goy + (yy - goy) / sy_
            fx_, fy_ = xx - qx, yy - qy
            c5 = warp(crop5, fx_, fy_)
            if st_ > 0:
                # Settling: his pile breaking up (see settled()); each pixel's opacity is its own.
                op_s, col_s, wc_s = settled(st_)
                Ad, _ = shrink(crop5, warp(op_s, fx_, fy_), (WAX, WAY), S, size, oanchor)
                _, Cd = shrink(warp(col_s, fx_, fy_), warp(wc_s, fx_, fy_), (WAX, WAY), S, size, oanchor)
                lv = levels_of(Ad)
                solid_px = lv == 255
                g = lv > 0
            else:
                # His pile: solid in his colours; only where it is thinner than a game pixel is it partly clear.
                Ad, _ = shrink(crop5, warp(pile_f, fx_, fy_), (WAX, WAY), S, size, oanchor)
                _, Cd = shrink(c5, warp(wcol.astype(np.float32), fx_, fy_), (WAX, WAY), S, size, oanchor)
                Ac, _ = shrink(crop5, warp(core_f, fx_, fy_), (WAX, WAY), S, size, oanchor)
                # (how thick his pile is over the pixel: less toward the thinning bottom of its puffs)
                Afo, _ = shrink(crop5, warp(pile_f * pile_th, fx_, fy_), (WAX, WAY), S, size, oanchor)
                thick = np.clip(Afo / np.maximum(Ad, 1e-6), 0.0, 1.0)
                solid_px = Ad >= 0.5
                thin_px = (Ad >= 0.22) & ~solid_px & (Ac < 0.1)
                lv = levels_of(np.where(solid_px, 1.0, 0.6) * thick * alpha)
                g = (solid_px | thin_px) & (lv > 0)
            out[g, :3] = np.where((lv < 255)[..., None], snap(Cd, DUST_A), snap(Cd, DUST))[g]
            out[g, 3] = lv[g].astype(np.uint8)
            # His spray: a game pixel his strokes cover at least half of is solid streak orange; one they cover a
            # quarter of (or a sixth, along the middle line of a thin streak, so it stays one unbroken line) is the
            # same orange, partly clear; less, and it is clear. The colour is his bright stroke's where it has one.
            As, _ = shrink(c5, warp(spray_a, fx_, fy_), (WAX, WAY), S, size, oanchor)
            Asb, Cs = shrink(c5, warp(spray_f, fx_, fy_), (WAX, WAY), S, size, oanchor)
            Ast, Cst = shrink(c5, warp(stroke_f, fx_, fy_), (WAX, WAY), S, size, oanchor)
            ridge = np.zeros(As.shape, bool)
            for oy, ox in ((0, 1), (1, 0), (1, 1), (1, -1)):
                a1 = np.roll(np.roll(As, oy, 0), ox, 1)
                a2 = np.roll(np.roll(As, -oy, 0), -ox, 1)
                ridge |= (As >= a1) & (As >= a2)
            s_solid = As >= 0.5
            s_thin = ((As >= 0.25) | ((As >= 0.16) & ridge)) & ~s_solid
            lv = levels_of(np.where(s_solid, 1.0, 0.63) * alpha)
            g = (s_solid | s_thin) & (lv > 0) & (Ast > 0.02) & ~(solid_px & (out[..., 3] == 255))
            g &= lv >= out[..., 3]
            scol = np.where((Asb > 0.02)[..., None], snap(Cs, SPRAY), snap(Cst, SPRAY))
            out[g, :3] = np.where((lv < 255)[..., None], SPRAY_A, scol)[g]
            out[g, 3] = lv[g].astype(np.uint8)
            # A one-pixel break along a streak (a clear pixel between two of its pixels) is closed, partly clear.
            sp = g.copy()
            brk = np.zeros_like(sp)
            for oy, ox in ((0, 1), (1, 0), (1, 1), (1, -1)):
                brk |= np.roll(np.roll(sp, oy, 0), ox, 1) & np.roll(np.roll(sp, -oy, 0), -ox, 1)
            lvb = levels_of(np.full(As.shape, 0.63 * alpha, np.float32))
            brk &= (out[..., 3] == 0) & (lvb > 0)
            out[brk, :3] = SPRAY_A
            out[brk, 3] = lvb[brk].astype(np.uint8)
            # His pale pebble specks, in his stone colours.
            Ap, Cp = shrink(c5, warp(pebble_f, fx_, fy_), (WAX, WAY), S, size, oanchor)
            p_solid = Ap >= 0.45
            lv = levels_of(np.where(p_solid, 1.0, 0.63) * alpha)
            g = (p_solid | (Ap >= 0.2)) & (lv > 0) & (out[..., 3] == 0)
            out[g, :3] = snap(Cp, PEBBLE)[g]
            out[g, 3] = lv[g].astype(np.uint8)
        op = A >= 0.5
        if moved:
            # Slivers left at a joint where a piece turned away.
            for pts in components(op):
                if len(pts) < 6:
                    op[tuple(np.array(pts).T)] = False
        # Gaps closed inside the drake: a see-through hole the body surrounds is his dark under-body shadow,
        # not the battlefield. That is every small one (his narrowest gaps between plates, where his panel
        # peeks through) and every one a turned leg or tail uncovered (it was body in his picture).
        if moved:
            kb = keys[k][1].astype(np.float32)
            kb = warp(kb, *RG)
            Ab, _ = shrink(rgb, kb, (WAX, WAY), S, size, oanchor)
        else:
            Ab = A
        gap = np.zeros_like(op)
        for pts in components4(~op):
            p = np.array(pts)
            if p[:, 0].min() == 0 or p[:, 1].min() == 0 or p[:, 0].max() == OH - 1 or p[:, 1].max() == OW - 1:
                continue
            if len(p) <= GAP_PX or (Ab[p[:, 0], p[:, 1]] >= 0.5).mean() >= 0.5:
                gap[p[:, 0], p[:, 1]] = True
                GAPS.append(len(p))
        op |= gap
        op, edge = outline_clean(op)
        out[op, :3] = snap(C, PAL)[op]
        # His horns snap only to his horn greys (cooler than the stone; his seams stay dark, and his near-white
        # highlight comes only where his own horn is that light).
        hn = op & (AUX[..., 0] >= 0.5)
        hi = (C @ np.array([0.3, 0.55, 0.15], np.float32)) >= 150
        out[hn, :3] = np.where(hi[..., None], snap(C, np.concatenate([PAL_HORN, HORN_HI[None]])), snap(C, PAL_HORN))[hn]
        # His glowing eyes and glints are smaller than the averaging footprint: where they cover a good
        # part of a pixel, the pixel takes their colour (so they keep glowing instead of turning muddy),
        # and where only his orange-amber surround of the eye does, it takes his amber. (His far eye is not
        # one of them: it is his lemon oval, below.)
        fe_full = rgb6[..., 4] > 0.5
        hot = (rgb[..., 0] > 200) & (rgb[..., 1] > 140) & (rgb[..., 2] < 120) & (cov > 0.5) & ~fe_full
        amber = (rgb[..., 0] > 150) & (rgb[..., 0] - rgb[..., 1] > 40) & (rgb[..., 1] > 80) & (rgb[..., 2] < 100) & (cov > 0.5) & ~fe_full
        Ah, Ch = shrink(rgb, hot.astype(np.float32), (WAX, WAY), S, size, oanchor)
        Aa, _ = shrink(rgb, (hot | amber).astype(np.float32), (WAX, WAY), S, size, oanchor)
        hm = (Ah > 0.25) & op
        am = (Aa > 0.25) & ~hm & op & dilate(hm, 1)
        # His dark burnt-orange socket rim: a pixel next to the glow (or its amber) that his rim covers a quarter of.
        sm = (AUX[..., 2] >= 0.25) & op & ~hm & ~am & dilate(hm | am, 1)
        # Next to a glowing eye nothing is moss: the mixed yellow-grey there snapped to the moss greens and
        # gave the eyes a green rim he did not draw.
        rim = dilate(hm, 1) & op & ~hm & ~am & ~sm & ~hn
        out[rim, :3] = snap(C, PAL_NO_MOSS)[rim]
        out[hm, :3] = snap(Ch, PAL)[hm]
        out[am, :3] = EYE_AMBER
        out[sm, :3] = EYE_SOCKET
        out[op, 3] = 255
        out[gap & ~edge, :3] = SHADOW
        out[edge, :3] = OUTLINE
        out[edge, 3] = 255
        # A moved piece keeps its own edge where it lies over the body (away from its joint).
        fm = (Af >= 0.5) & op
        fe = np.zeros_like(fm)
        for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            fe |= fm & op & ~np.roll(np.roll(Af >= 0.25, oy, 0), ox, 1)
        out[fe, :3] = OUTLINE
        # His far eye, stamped whole inside the head (never on its outline). Around it the stone takes only his
        # stone and horn greys (no moss, no glow, no amber).
        st, sx0, sy0 = far_eye(k, pitch, bob, tx, scale, hz)
        stamp = np.zeros((OH, OW), np.int8)
        stamp[sy0:sy0 + st.shape[0], sx0:sx0 + st.shape[1]] = st
        inside = op & ~edge & ~fe
        guard = dilate(stamp > 0, 1) & inside & (stamp == 0) & ~hm & ~am & ~sm
        out[guard, :3] = snap(C, PAL_PLAIN)[guard]
        for v, colr in ((1, FE_RIM), (2, FE_MID), (3, FE_BRIGHT)):
            out[(stamp == v) & inside, :3] = colr
        if moved:
            # Bare outline: a thread of his outline with no stone next to it (a seam drawn out of a joint as a leg or
            # the tail turned away) is not his; it is dropped.
            isout = op & (out[..., :3] == OUTLINE).all(-1)
            interior = op & ~isout
            near_int = interior.copy()
            for oy in (-1, 0, 1):
                for ox in (-1, 0, 1):
                    near_int |= np.roll(np.roll(interior, oy, 0), ox, 1)
            bare = isout & ~near_int
            out[bare] = 0
            op &= ~bare
        if clod_at is not None:
            # His clod rides the spike tip with the body (it is key 5's), then flies off it.
            cdx, cdy, calpha = clod_at
            cf, cc = clod_f, crop5
            if moved:
                cf, cc = warp(cf, *RG), warp(cc, *RG)
            if cdx or cdy:
                cf, cc = warp(cf, cdx / S, cdy / S), warp(cc, cdx / S, cdy / S)
            Acl, Ccl = shrink(cc, cf, (WAX, WAY), S, size, oanchor)
            g = Acl >= 0.5
            lv = levels_of(np.full((OH, OW), calpha, np.float32))
            g &= lv > 0
            out[g, :3] = (snap(Ccl, DUST_A) if calpha < 0.8 else snap(Ccl, DUST))[g]
            out[g, 3] = lv[g].astype(np.uint8)
        # Pinholes and slits left between his pieces (a streak and the arm it touches, the clod and the spike tip):
        # a clear pixel with three or four drawn 4-neighbours, or a clear hole of under 8 px that the frame's pixels
        # close in, takes its darkest drawn neighbour (an outline or a streak, as he drew it); again, until none is left.
        lwt = np.array([0.3, 0.55, 0.15], np.float32)
        for _ in range(8):
            drawn = out[..., 3] > 0
            nbn = np.zeros((OH, OW), np.int32)
            for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nbn += np.roll(np.roll(drawn, oy, 0), ox, 1)
            hole = ~drawn & (nbn >= 3)
            for pts in components4(~drawn):
                p = np.array(pts)
                if len(p) < 8 and p[:, 0].min() > 0 and p[:, 1].min() > 0 and p[:, 0].max() < OH - 1 and p[:, 1].max() < OW - 1:
                    hole[p[:, 0], p[:, 1]] = True
            if not hole.any():
                break
            for _ in range(4):
                if not hole.any():
                    break
                lum_o = np.where(out[..., 3] > 0, out[..., :3].astype(np.float32) @ lwt, 1e9)
                best = np.full((OH, OW), 1e9, np.float32)
                src = np.zeros((OH, OW, 4), np.uint8)
                for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    l2 = np.roll(np.roll(lum_o, oy, 0), ox, 1)
                    o2 = np.roll(np.roll(out, oy, 0), ox, 1)
                    better = l2 < best
                    best = np.where(better, l2, best)
                    src[better] = o2[better]
                now = hole & (best < 1e9)
                out[now] = src[now]
                hole &= ~now
        return out, bob, tx

    def key_frame(k):
        return pose(k, dust_at=(1.0, 1.0, 0.0, 1.0), clod_at=(0.0, 0.0, 1.0)) if k == 5 else pose(k)

    # The run, a bounding charge. 0: his prowl, gathered on the ground. 1-2: the hind legs push (the claws stay on
    # the feet line), the front of the body rears up, the near front leg swings back and the tail drops. 3-4: his
    # lunge, sprung off the ground, the legs pushing back, his dust bursting behind the hind feet; 5: his lunge at
    # the top of the leap. 6: the body comes down nose first, the legs reaching forward, the dust drifting back.
    # 7: about to land, nose down and tail up, the dust settling (it spreads out low) and fading. Then his prowl.
    # The tail ('curl', see tail_axis) bends toward his other drawing's tail all the way round the loop: his prowl's
    # curl opens in frames 1-2 into a spear like the lunge's, frames 3-4 show the lunge's spear still bent a little
    # toward the curl, and frames 6-7 curl it back up into his prowl's hook, so the tail tip moves 2.0 px at the 2->3
    # switch and 3.9 px at 7->0 (it jumped 71-77 px there when the curl was swapped for the spear in one frame).
    # Frame 7's near hind leg reaches forward with its foot bent back at the ankle ('nhf'), as he drew it, instead of
    # hanging as one straight pillar.
    # His prowl is drawn larger than his lunge: the in-betweens scale the body about the eye, and grow or shrink the
    # head along ZREL (hz, see head_tf), so the size changes over the loop and both sides of each switch between
    # his drawings (2->3 and 7->0) show the same head: the same eye, snout tip and horn tip. The body angles,
    # scales and leg turns of frames 2, 3 and 7 were searched (coordinate descent, frames 1, 4 and 6 halfway) for
    # the smallest silhouette change at every step with the eye rising steadily to the top of the leap: no step
    # changes more than about 29% of the body's silhouette (the switches were 41-43%).
    FLY = [
        None,
        dict(k=0, pitch=-4.5, feet=True, scale=0.995, hz=-0.25,
             legs={'nf': 12.5, 'ff': -3, 'nh': 9.5, 'fh': 0, 'tail': -10, 'curl': 0.5}),
        dict(k=0, pitch=-9.0, feet=True, scale=0.99, hz=-0.5,
             legs={'nf': 25, 'ff': -6, 'nh': 19, 'fh': 0, 'tail': -15, 'curl': 0.9}),
        dict(k=5, pitch=1.0, eye=-17.4, scale=1.13, hz=0.5,
             legs={'nf': 22, 'ff': 23, 'nh': -18, 'fh': 17, 'tail': -15, 'curl': 0.4}, dust_at=(0.7, 0.7, 2.0, 1.0),
             clod_at=(0.0, 0.0, 1.0)),
        dict(k=5, pitch=0.5, eye=-19.9, scale=1.065, hz=0.25,
             legs={'nf': 11, 'ff': 11.5, 'nh': -9, 'fh': 8.5, 'tail': -7, 'curl': 0.18}, dust_at=(0.88, 0.88, 1.0, 1.0),
             clod_at=(0.0, 0.0, 1.0)),
        None,
        dict(k=5, pitch=3.5, eye=-13.8, scale=1.07, hz=0.5,
             legs={'nf': -0.5, 'ff': -14, 'nh': -12, 'nhf': 12, 'fh': 7.5, 'tail': 8, 'curl': 0.65}, dust_at=(1.04, 0.9, -5.0, 0.75, 0.4),
             clod_at=(-3.5, -3.5, 0.63)),
        dict(k=5, pitch=7.0, eye=-1.0, scale=1.14, hz=1.0,
             legs={'nf': -1, 'ff': -28, 'nh': -25, 'nhf': 25, 'fh': 15, 'tail': 31, 'curl': 1.15}, dust_at=(1.08, 0.7, -10.0, 0.4, 0.75)),
    ]
    GAPS.clear()
    frames = {'fly': []}
    moves = []
    for i, f in enumerate(FLY):
        if f is None:
            fr, bob, tx = key_frame(i)
        else:
            fr, bob, tx = pose(f['k'], f['pitch'], f.get('eye', 0.0), f['legs'], f.get('dust_at'), f.get('scale', 1.0),
                               f.get('hz', 0.0), f.get('feet', False), f.get('clod_at'))
        frames['fly'].append(fr)
        moves.append((bob, tx))
        print(f'  frame {i}: bob {bob:+.1f} tx {tx:+.1f} (game px); closed gaps (px)', GAPS[:])
        GAPS.clear()
    f0 = frames['fly'][0]
    feet = int(np.nonzero((f0[..., 3] == 255).any(1))[0].max())
    print('drake: feet line (lowest claw of frame 0) at y', feet, 'of', OH, '; anchor', oanchor)
    eyes = []
    for i, f in enumerate(frames['fly']):
        src = FLY[i] or {'k': i}
        ex, ey = eye_at(src['k'], src.get('pitch', 0.0), moves[i][0], moves[i][1])
        eyes.append((ex, ey))
        a = f[..., 3]
        ys_, xs_ = np.nonzero(a > 0)
        solid_rows = np.nonzero((a == 255).any(1))[0]
        print(f'  frame {i}: eye ({ex:.1f}, {ey:.1f}); lowest solid y {solid_rows.max()}, lowest any y {ys_.max()};'
              f' clear margin L{xs_.min()} T{ys_.min()} R{OW - 1 - xs_.max()} B{OH - 1 - ys_.max()}')
    print('  eye steps', ', '.join(f'{i}->{(i + 1) % 8} {eyes[(i + 1) % 8][1] - eyes[i][1]:+.1f}' for i in range(8)))
    # His head landmarks in every frame (exact), and how far each moves from one frame to the next.
    lands = []
    for i in range(len(FLY)):
        src = FLY[i] or {'k': i}
        k = src['k']
        args = (src.get('pitch', 0.0), moves[i][0], moves[i][1], src.get('scale', 1.0), src.get('hz', 0.0))
        lands.append({n: land_at(k, EYE[k] if n == 'eye' else LAND[k][n], *args) for n in ('eye', 'snout', 'horn')})
        # (The tail tip: the end of his tail's centre line, bent and turned for this frame, then carried with the body.)
        tw = tail_tip(k, src.get('legs', {}))
        lands[-1]['tail'] = land_at(k, (tw[0] + keys[k][4][0], tw[1] + keys[k][4][1]), *args[:4], 0.0)
    for i, L_ in enumerate(lands):
        j = (i + 1) % len(lands)
        print(f'  frame {i}: ' + ', '.join(f'{n} ({p[0]:.1f}, {p[1]:.1f})' for n, p in L_.items()) + f'; to frame {j}: ' +
              ', '.join(f'{n} {np.hypot(lands[j][n][0] - p[0], lands[j][n][1] - p[1]):.1f}' for n, p in L_.items()))
    note = [
        "The stone drake (vfx_beasts/earth), copied from his earth sheet's BEAST panel: his left picture",
        "(the prowl) is frame 0 and his right one (the lunge, dust kicking up) is frame 5, both standing on",
        "his one ground line with the eye at one x. 1-4, 6 and 7 turn his legs and tail about their joints,",
        "pitch the body and carry it along the leap between his two pictures, and move his dust.",
        "Scale: his character is " + f"{his_char_h} px tall in that sheet, ours {CHAR_H:.0f}.",
    ]
    used = np.unique(np.concatenate([f.reshape(-1, 4) for f in frames['fly']]), axis=0)
    used = used[used[:, 3] > 0]
    print('drake colours', len(used), 'by alpha', {int(a): int((used[:, 3] == a).sum()) for a in np.unique(used[:, 3])})
    # (His drake needs more colours than the shared alphabet holds: the drake's own alphabet goes on with Latin-1
    # letters, one UTF-16 unit each, which the decoder in vfx-beasts.ts reads like the others.)
    write_module(frames, size, oanchor, note, ALPH + '~' + ''.join(chr(c) for c in range(0xC0, 0x100) if c not in (0xD7, 0xF7)))
    sidecar('earth', {'ref': os.path.basename(REF), 'scale': S, 'panel': list(PANEL), 'ground': GROUND,
                      'keys': {str(k): {'torso': list(TORSO[k]), 'origin': list(keys[k][4]), 'eye': list(EYE[k])} for k in (0, 5)},
                      'work': [WAX, WAY, CW, CH], 'oanchor': list(oanchor), 'size': list(size), 'feet': feet,
                      'tail_tips': [[round(float(L_['tail'][0]), 1), round(float(L_['tail'][1]), 1)] for L_ in lands]})
    if DEBUG:
        for k, (crop, body, rest, diff, off, shade) in keys.items():
            vis = (crop * 0.35).astype(np.uint8)
            vis[body] = crop[body].astype(np.uint8)
            vis[shade] = (vis[shade] * 0.5 + np.array([0, 160, 255]) * 0.5).astype(np.uint8)
            vis[rest] = [255, 0, 255]
            if k == 5:
                vis[spray] = [255, 255, 0]
                vis[sbright] = [255, 140, 0]
                vis[clod] = [0, 255, 255]
                vis[rest & ~dust & ~clod] = [255, 0, 0]
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
        # Onion skin of the two keys (red: frame 0, cyan: frame 5).
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
