"""His burnt-stump sheet (from mount_regrow.py; fire and smoke keyed soft, by magenta-ness, and unmixed) (5 rows x 6 frames, the head falling off) mounted with mount9's machinery: each cell
is gathered whole (the stump and the falling head are separate pieces), anchored by its neck's cut,
and the game drops the cut head to the floor (it falls from the head's height), where it stays."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

S, SHEET, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
sys.argv = [sys.argv[0], S, OUT]
exec(open(f'{S}/hydra/mount9.py').read())

a0 = np.array(Image.open(SHEET).convert('RGB')).astype(float)
r_, g_, b_ = a0[..., 0], a0[..., 1], a0[..., 2]
ALPHA = np.clip(1 - (np.minimum(r_, b_) - g_) / 235.0, 0, 1)
ALPHA[ALPHA < 0.08] = 0
ALPHA[700:] = 0
ALPHA[:, :3] = 0
ALPHA[:, 2162:] = 0
a = ((a0 - (1 - ALPHA[..., None]) * np.array([255.0, 0, 255.0])) / np.maximum(ALPHA[..., None], 1e-3)).clip(0, 255).astype(int)
fg = ALPHA > 0
RIGHTS = [368, 727, 1085, 1444, 1802, 2160]
CW = 345
lab, n = ndimage.label(ndimage.binary_opening(fg, iterations=1))
objs = ndimage.find_objects(lab)
sz = ndimage.sum(fg, lab, range(1, n + 1))
cells = [[None] * 6 for _ in range(5)]  # [row][col] = (stump mask, head mask, y0)
for ci, x1 in enumerate(RIGHTS):
    x0 = x1 - CW
    items = [(k, o) for k, o in enumerate(objs) if sz[k] >= 15 and x0 <= (o[1].start + o[1].stop) / 2 < x1 + 10]
    stumps = sorted([(o[0].start, k) for k, o in items if o[1].stop >= x1 - 15 and sz[k] >= 400])
    others = [(k, o) for k, o in items if o[1].stop < x1 - 15]
    centers = [(objs[k][0].start + objs[k][0].stop) / 2 for _, k in stumps]
    heads = {r: [] for r in range(5)}
    for k, o in others:
        cy = (o[0].start + o[0].stop) / 2
        r = int(np.argmin([abs(cy - (c + 40)) for c in centers]))
        heads[r].append(k)
    for r, (_, k) in enumerate(stumps):
        cells[r][ci] = (k, heads[r], x0, x1)

PAD_TOP, CH = 60, 420


def cell_image(r, ci, fall_cell_px=0.0, extra_head=None):
    k, hks, x0, x1 = cells[r][ci]
    y0 = objs[k][0].start - PAD_TOP
    img = np.zeros((CH, CW + 8, 4), np.uint8)

    def put(mask_ids, dy):
        m = np.isin(lab, mask_ids)
        m = ndimage.binary_dilation(m, iterations=2) & fg
        ys, xs = np.nonzero(m[:, max(0, x0):x1 + 8])
        ys2 = ys - y0 + int(dy)
        ok = (ys2 >= 0) & (ys2 < CH)
        img[ys2[ok], xs[ok], :3] = a[ys[ok], xs[ok] + max(0, x0)]
        img[ys2[ok], xs[ok], 3] = (ALPHA[ys[ok], xs[ok] + max(0, x0)] * 255).astype(np.uint8)

    put([k + 1], 0)
    if hks:
        put([h + 1 for h in hks], fall_cell_px)
    if extra_head is not None:
        er, eci, edy = extra_head
        _, ehks, ex0, _ = cells[er][eci]
        k0, _, x0b, _ = cells[r][ci]
        # the last frame has no head: lay frame 5's head where it fell
        m = np.isin(lab, [h + 1 for h in ehks])
        m = ndimage.binary_dilation(m, iterations=2) & fg
        ys, xs = np.nonzero(m[:, ex0:ex0 + CW + 8])
        ey0 = objs[cells[er][eci][0]][0].start - PAD_TOP
        ys2 = ys - ey0 + int(edy)
        ok = (ys2 >= 0) & (ys2 < CH)
        img[ys2[ok], xs[ok], :3] = a[ys[ok], xs[ok] + ex0]
        img[ys2[ok], xs[ok], 3] = 255
    # His cells don't all put the cut end at the same distance from the right edge (the stumps came
    # out of different lengths), so anchoring by the right edge made the stump jump between frames.
    # Line every cell up on its ring (where the solid neck ends, ignoring fire and smoke) against the
    # same row's first cell: a longer stump is pushed right (its far end goes under the game neck), a
    # shorter one pulled left with its last neck column repeated.
    return Image.fromarray(align_ring(img, r), 'RGBA')


def fill_right(img):
    # his cut edge sits a few px short of the cell's right edge, by a different amount per cell:
    # continue the last solid neck column out to the right edge
    al = img[..., 3] > 200
    cols = np.nonzero(al.sum(0) > 0.5 * al.sum(0).max())[0]
    xr = cols.max() - 1
    img = img.copy()
    img[:, xr + 1:] = img[:, xr:xr + 1]
    return img


def ring_of(img):
    al = img[..., 3] > 200
    t, b = band(al, img.shape[1] - 48, img.shape[1] - 12)
    solid = al[t:b + 1].mean(0)
    x = img.shape[1] - 12
    while x > 0 and solid[x] > 0.6:
        x -= 1
    return x


RING0 = {}


def align_ring(img, r):
    img = fill_right(img)
    x = ring_of(img)
    if r not in RING0:
        return img
    d = RING0[r] - x
    if d > 0:  # push right
        out = np.zeros_like(img)
        out[:, d:] = img[:, :-d]
        return out
    if d < 0:  # pull left, repeat the last neck columns at the right
        d = -d
        out = np.zeros_like(img)
        out[:, :-d] = img[:, d:]
        out[:, -d:] = img[:, -1:]
        return out
    return img


for _r in range(5):
    RING0[_r] = ring_of(fill_right(np.array(cell_image(_r, 0))))


# fall per frame, as a share of the drop to the floor
# (his frame, share of the drop): the game adds in-betweens so the head falls with gravity
SEQ = [(0, 0), (0, 0), (0, 0), (1, 0), (1, 0), (2, 0), (2, 0), (3, 0), (3, 0), (4, 0), (4, 0), (5, 0), (5, 0), (5, 0), (5, 0)]
frames = []
PASS = []
RING = {}
for p, (f, share) in enumerate(SEQ):
    rows = []
    shift = [0.0] * 5
    for r in range(5):
        x, z, up = HEADS[r]
        rest = cell_image(r, 0)
        al = np.array(rest)[..., 3] > 128
        t, b = band(al, rest.width - 48, rest.width - 12)
        kk = TILES[r][0][2] / (b - t)
        gy = P(x, z)[1]
        drop_m = min(up - 0.7, (VH - 130 - gy) / PXM + up - 0.7)
        drop_cell = max(0.0, drop_m * PXM) / kk
        im = cell_image(r, f, 0)
        rows.append([rest, im])
        # where his stump's ring lands on screen; it must stay left of the painted neck's ring
        # (which the game neck covers), or the painted ring shows: then the whole piece slides left
        if f <= 1:
            k_, hks_, x0_, x1_ = cells[r][f]
            ring_cell = objs[k_][1].start - x0_
            al2 = np.array(im)[..., 3] > 128
            t2_, b2_ = band(al2, im.width - 48, im.width - 12)
            kf = TILES[r][0][2] / (b2_ - t2_)
            keep = CW - int(CW * 0.30)
            nx0 = P(x - HL / 2, z, up)[0]
            anchor = nx0 + keep * kk
            ring_x = anchor - (keep - ring_cell) * kf
            limit = STUMPS[r][0] - 30
            shift[r] = max(0.0, (ring_x - limit) / PXM)
            RING.setdefault(f, {})[r] = ring_x
    # scene() picks rows[i][phase % len]; phase 1 = this frame, anchored on the rest cell (index 0)
    PASS.append((rows, list(shift), f))
MAXS = [max(ps[1][r] for ps in PASS) for r in range(5)]
import json as _j; _j.dump({str(k): v for k, v in RING.items()}, open(OUT + '_rings.json', 'w'))
print('slide per head (m):', [round(float(v), 2) for v in MAXS])
# start where the cut left the stump: the cut's last ring (after its slide) against this sheet's
CUT = _j.load(open(f'{S}/hydra/col8/u_cut_rings.json'))['5']
CUT_SLIDE = [0.0, 0.8, 0.0, 0.0, 0.0]
GAP = [((CUT[str(r)] - CUT_SLIDE[r] * PXM) - RING[0][r]) / PXM for r in range(5)]
print('regrow starts right by (m):', [round(g, 2) for g in GAP])
for p, (rows, _, f) in enumerate(PASS):
    k_in = 1.0
    frames.append(scene(rows, 1, [-g * k_in for g in GAP], p / len(SEQ)).convert('RGB'))
frames[6].save(OUT + '.png')
import os, subprocess
FD = OUT + '_frames'
os.makedirs(FD, exist_ok=True)
durs = [260] * 3 + [150] * 8 + [300] * 4
for i, f in enumerate(frames):
    f.save(f'{FD}/f{i:03d}.png')
lst = ''.join(f"file 'f{i:03d}.png'\nduration {d / 1000:.3f}\n" for i, d in enumerate(durs))
open(f'{FD}/list.txt', 'w').write(lst + f"file 'f{len(frames) - 1:03d}.png'\n")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-i', f'{FD}/list.txt', '-vf',
                'scale=960:540:flags=lanczos,split[a][b];[a]palettegen=max_colors=200[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
                OUT + '.gif'], check=True)
print('ok')
