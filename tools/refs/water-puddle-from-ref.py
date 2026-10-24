"""Copies the owner's paint-over of the water puddle sample into game frames, his pixels exactly.

    WORLD_OUT=<stg> npx tsx tools/world-sprites/puddle-sample.ts
    python3 -I tools/refs/water-puddle-from-ref.py docs/reference/water-puddle-owner-reference.jpg \
        <stg>/charco_muestra <stg>/charco_agua [compare.png]

His picture is our sheet muestra-agua.png (tools/world-sprites/puddle-sample-sheets.py: every frame
at 4x, cells of 128 x 128 sprite px cut from the 256 frame at CROP) painted over and brought down to
about 0.62. So the grid is ours: the cells are found on his page (his panel colour against his page
colour), our sheet's cell positions are fitted to them by least squares (one scale and offset per
axis), and each sprite pixel is read at its centre (about 2.48 of his pixels, lightly blurred
against the JPEG). For each pixel:

  * his panel colour            -> clear;
  * where he kept our ninja     -> our pixel, exactly (his colour within a small distance of the
                                   ninja frame the sample was made from, puddle-sample.ts fig/, in
                                   the frames where the ninja stands as itself);
  * everything else is his      -> his colour, snapped to one palette for his water (median cut of
                                   his own pixels away from the ninja), and over our ninja to that
                                   or the ninja's own colours; the soft edge he painted into the panel is kept
                                   semi-transparent (un-blended from his panel colour, alpha in
                                   quarters), so it sits on any ground as it sat on his panel.

Writes every frame at 1x in the 256 x 256 sprite frame (feet where the sample's are), with the
sample's manifest (the same sequence ids, labels and pace), and own/<frame>: a mask of the
pixels that are the ninja (tools/world-sprites/puddle-mercury.py turns the rest to metal), and
layer/<frame>: his water alone (the ninja's pixels taken out), the art the battle draws over any ninja
(src/components/battle/puddleArt.ts reads it from src/assets/world/vfx_puddle/ once he approves it). With a compare path it also writes his
crop beside our copy, at the same scale, labelled "Tu dibujo" / "Copia". Deterministic.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

REF, SAMPLE, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
COMPARE = sys.argv[4] if len(sys.argv) > 4 else None

# Our sheet (puddle-sample-sheets.py): cells of 512 px (128 sprite px at 4x), 18 px apart, the first
# at (18, 192), one line of cells per row, rows 612 px apart; the crop is CROP in the 256 frame.
CELL, PITCH_X, PITCH_Y, X0, Y0 = 512, 530, 612, 18, 192
ROWS = ['agua-transformarse-hombre', 'agua-charco-quieto', 'agua-salir-hombre', 'agua-transformarse-lyra', 'agua-salir-lyra']
MAN = json.load(open(os.path.join(SAMPLE, 'manifest.json')))
FEET = MAN['feet']
CROP = (FEET[0] - 64, FEET[1] - 108)
K = 128
NEAR_PANEL, SOFT_EDGE, KEEP_OURS = 16.0, 48.0, 38.0

IM = Image.open(REF).convert('RGB')
A = np.asarray(IM).astype(np.float64)
B = np.asarray(IM.filter(ImageFilter.GaussianBlur(0.6))).astype(np.float64)
H, W = A.shape[:2]


def runs(a, th, minlen=50):
    out, s = [], None
    for i, v in enumerate(a):
        if v > th and s is None:
            s = i
        if v <= th and s is not None:
            if i - s > minlen:
                out.append((s, i - 1))
            s = None
    if s is not None and len(a) - s > minlen:
        out.append((s, len(a) - 1))
    return out


def fit():
    """Least-squares scale and offset per axis, from our cells' edges to his panels' edges."""
    panel = np.array([32.0, 33.0, 43.0])
    m = np.abs(A - panel).sum(2) < 12
    cols, rows = runs(m.mean(0), 0.25), runs(m.mean(1), 0.2)
    assert len(cols) == 6 and len(rows) == 5, (cols, rows)
    ours_x = [X0 + c * PITCH_X for c in range(6)] + [X0 + c * PITCH_X + CELL for c in range(6)]
    his_x = [a for a, _ in cols] + [b + 1 for _, b in cols]
    ours_y = [Y0 + r * PITCH_Y for r in range(5)] + [Y0 + r * PITCH_Y + CELL for r in range(5)]
    his_y = [a for a, _ in rows] + [b + 1 for _, b in rows]
    sx, ox = np.polyfit(ours_x, his_x, 1)
    sy, oy = np.polyfit(ours_y, his_y, 1)
    return sx, ox, sy, oy


SX, OX, SY, OY = fit()


def bilinear(img, x, y):
    x0, y0 = int(np.floor(x)), int(np.floor(y))
    tx, ty = x - x0, y - y0
    x0, y0 = max(0, min(W - 2, x0)), max(0, min(H - 2, y0))
    a, b, c, d = img[y0, x0], img[y0, x0 + 1], img[y0 + 1, x0], img[y0 + 1, x0 + 1]
    return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty


def his_cell(r, c):
    """His cell read at our sprite pixel centres (K x K x 3), and his panel colour there."""
    out = np.zeros((K, K, 3))
    for j in range(K):
        for i in range(K):
            X = OX + SX * (X0 + c * PITCH_X + (i + 0.5) * 4)
            Y = OY + SY * (Y0 + r * PITCH_Y + (j + 0.5) * 4)
            out[j, i] = bilinear(B, X, Y)
    ring = np.concatenate([out[0], out[-1], out[:, 0], out[:, -1]])
    return out, np.median(ring, axis=0)


def his_crop(r, c):
    """His picture of one cell, as he painted it (for the comparison)."""
    x0, y0 = OX + SX * (X0 + c * PITCH_X), OY + SY * (Y0 + r * PITCH_Y)
    return IM.crop((round(x0), round(y0), round(x0 + SX * CELL), round(y0 + SY * CELL)))


def median_cut(px, k):
    boxes = [px]
    while len(boxes) < k:
        i = max(range(len(boxes)), key=lambda n: len(boxes[n]) * (np.ptp(boxes[n], axis=0).max() if len(boxes[n]) > 1 else 0))
        b = boxes[i]
        if len(b) < 2:
            break
        ch = int(np.argmax(np.ptp(b, axis=0)))
        b = b[np.argsort(b[:, ch], kind='stable')]
        boxes[i:i + 1] = [b[: len(b) // 2], b[len(b) // 2:]]
    return np.array([np.median(b, axis=0) for b in boxes]).round()


def main():
    seqs = {s['id']: s for s in MAN['sequences']}
    cells = []  # (seq id, frame index, his colours, his panel, fig rgba or None)
    for r, sid in enumerate(ROWS):
        for i, f in enumerate(seqs[sid]['files']):
            his, panel = his_cell(r, i)
            fp = os.path.join(SAMPLE, 'fig', f)
            fig = None
            if os.path.exists(fp):
                fig = np.asarray(Image.open(fp).convert('RGBA'))[CROP[1]:CROP[1] + K, CROP[0]:CROP[0] + K].astype(np.float64)
            cells.append((sid, i, his, panel, fig))
    # He kept our ninja only where it stands as itself (the first frame of a melt, the last two of
    # a rise: the sample's undeformed idle frame); a squashed figure he painted all as water.
    idle = {}
    for sid, i, his, panel, fig in cells:
        if sid.startswith('agua-transformarse') and i == 0:
            idle[sid.rsplit('-', 1)[1]] = fig
    cells = [(sid, i, his, panel, fig if fig is not None and np.array_equal(fig, idle[sid.rsplit('-', 1)[1]]) else None) for sid, i, his, panel, fig in cells]

    # Classify every pixel, then build one palette from his own (opaque, not ours) pixels.
    plans = []
    pool = []
    for sid, i, his, panel, fig in cells:
        d = np.sqrt(((his - panel) ** 2).sum(2))
        ours = np.zeros((K, K), bool)
        if fig is not None:
            ours = (fig[..., 3] > 0) & (np.sqrt(((his - fig[..., :3]) ** 2).sum(2)) < KEEP_OURS) & (d >= NEAR_PANEL)
        alpha = np.clip((d - NEAR_PANEL) / (SOFT_EDGE - NEAR_PANEL), 0, 1)
        alpha = np.ceil(alpha * 4) / 4
        alpha[d < NEAR_PANEL] = 0
        col = np.where(alpha[..., None] > 0, panel + (his - panel) / np.maximum(alpha, 0.25)[..., None], 0)
        col = np.clip(col, 0, 255)
        mine = (alpha > 0) & ~ours
        if fig is not None:
            mine &= fig[..., 3] == 0
        pool.append(col[mine & (alpha >= 1)])
        plans.append((sid, i, col, alpha, ours, fig, his, panel))
    pal = median_cut(np.concatenate(pool), 48)

    os.makedirs(OUT, exist_ok=True)
    frames = {}
    for sid, i, col, alpha, ours, fig, his, panel in plans:
        rgba = np.zeros((K, K, 4), np.uint8)
        # Over our ninja, what he changed takes the ninja's own colours or his water's.
        p = pal if fig is None else np.concatenate([pal, np.unique(fig[fig[..., 3] > 0][:, :3], axis=0)])
        idx = np.argmin(((col[..., None, :] - p[None, None]) ** 2).sum(3), axis=2)
        snapped = p[idx]
        rgba[..., :3] = snapped
        rgba[..., 3] = (alpha * 255).round()
        own = np.zeros((K, K), bool)
        if fig is not None:
            rgba[ours] = fig[ours].astype(np.uint8)
            own = ours | ((idx >= len(pal)) & (alpha > 0))
        # A lone faint pixel is JPEG noise round his edges, not paint.
        a = rgba[..., 3]
        nb = np.zeros((K, K), int)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx or dy:
                    nb += np.roll(np.roll(a > 0, dy, 0), dx, 1)
        rgba[(a > 0) & (a < 128) & (nb == 0)] = 0
        full = np.zeros((256, 256, 4), np.uint8)
        full[CROP[1]:CROP[1] + K, CROP[0]:CROP[0] + K] = rgba
        name = seqs[sid]['files'][i]
        Image.fromarray(full, 'RGBA').save(os.path.join(OUT, name))
        # Which pixels are the ninja (ours, or his in the ninja's colours), for the mercury.
        om = np.zeros((256, 256), np.uint8)
        om[CROP[1]:CROP[1] + K, CROP[0]:CROP[0] + K] = (own & (rgba[..., 3] > 0)) * 255
        os.makedirs(os.path.join(OUT, 'own'), exist_ok=True)
        Image.fromarray(om, 'L').save(os.path.join(OUT, 'own', name))
        # His water alone, for the game to draw over any ninja (src/components/battle/puddleArt.ts).
        layer = full.copy()
        layer[om > 0] = 0
        os.makedirs(os.path.join(OUT, 'layer'), exist_ok=True)
        Image.fromarray(layer, 'RGBA').save(os.path.join(OUT, 'layer', name))
        frames[(sid, i)] = rgba
    man = {**MAN, 'source': os.path.basename(REF), 'sequences': [s for s in MAN['sequences'] if s['id'] in ROWS]}
    with open(os.path.join(OUT, 'manifest.json'), 'w') as fh:
        json.dump(man, fh, indent=1)
        fh.write('\n')
    print(f'grid: {SX:.5f} x + {OX:.2f}, {SY:.5f} y + {OY:.2f}; palette {len(pal)}; {len(frames)} frames -> {OUT}')
    if COMPARE:
        compare(frames, seqs)


def compare(frames, seqs):
    """His crop beside our copy, each frame at 3x the sprite scale, labelled in Spanish."""
    S, GAP, LAB = 3, 14, 26
    cw = K * S
    f_t, f_r, f_l = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 34), ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24), ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 19)
    Wd = GAP + 6 * (cw + GAP) + 150
    Hd = 90 + len(ROWS) * (44 + 2 * (LAB + cw + GAP))
    img = Image.new('RGB', (Wd, Hd), (21, 21, 29))
    d = ImageDraw.Draw(img)
    d.text((GAP, 18), 'Charco de agua: tu dibujo y nuestra copia (misma escala, x3)', font=f_t, fill=(220, 224, 232))
    y = 90
    for r, sid in enumerate(ROWS):
        d.text((GAP, y + 6), seqs[sid]['label'], font=f_r, fill=(220, 224, 232))
        y += 44
        for line, who in enumerate(('Tu dibujo', 'Copia')):
            yy = y + line * (LAB + cw + GAP)
            d.text((Wd - 140, yy + LAB + cw // 2 - 12), who, font=f_r, fill=(150, 200, 230) if line else (230, 190, 140))
            for i in range(len(seqs[sid]['files'])):
                x = GAP + i * (cw + GAP)
                d.text((x, yy + 2), f'{who} {i + 1}', font=f_l, fill=(150, 156, 170))
                if line == 0:
                    cell = his_crop(r, i).resize((cw, cw), Image.LANCZOS)
                else:
                    cell = Image.new('RGBA', (K, K), (32, 33, 43, 255))
                    cell.alpha_composite(Image.fromarray(frames[(sid, i)], 'RGBA'))
                    cell = cell.resize((cw, cw), Image.NEAREST)
                img.paste(cell.convert('RGB'), (x, yy + LAB))
        y += 2 * (LAB + cw + GAP)
    img.save(COMPARE, optimize=True)


main()
