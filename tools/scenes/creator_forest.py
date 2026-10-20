"""The owner's burning forest (docs/reference/creator-scene-owner-reference.jpg) as the animated
pixel scene behind the title screen and the character creator.

His picture is a 2000x1047 mockup of the creator: a burning forest with weapons stuck in the ground,
his character in the clearing, clan cards over the right half and a stance bar at the bottom left.
The forest is pixel art scaled about 4.37 x 4.42 (an uneven grid), so this script:

  1. takes his pixels back (the median of each block's interior) on the grid measured on the scene;
  2. keeps the forest he left uncovered (his pixels x 0..248, y 6..212) and paints out his character
     with patches of his own forest taken from the same heights (fire beside fire, ground beside
     ground);
  3. takes out the embers he painted into the air (the scene adds moving ones);
  4. closes the right half with the left half mirrored (his trees then frame both edges, as his far
     right trunk does in the mockup);
  5. finds his flames and builds a loop of frames where they lick upward: each flame pixel moves
     along his own flame ramp (dark tongue tip to white-hot base) with rising noise, so a still frame
     is his picture and the motion stays in his colours;
  6. writes the mask of everything behind the trees (smoke, sky, fire) so the scene's drifting smoke
     passes behind the trunks, and the points where the embers rise from.

Writes in <out>: base.png (the still forest), fire.png (the flame frames in a column, transparent
outside the flames), back.png (the mask: opaque where smoke may drift), scene.json, and previews in
<out>/study/. The same picture always gives the same bytes. Run with python3 -I:

  python3 -I tools/scenes/creator_forest.py docs/reference/creator-scene-owner-reference.jpg <out>
"""

import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

# His pixel grid on the forest (measured on the scene, not the panels): pitch and the offset of the
# first block edge, in picture pixels.
PITCH = (4.3699, 4.4197)
PHASE = (2.75, 0.69)
# The forest he left uncovered, in his pixels: below the top frame, above the stance bar, left of
# the name banner.
SCENE = (0, 6, 248, 213)
# His character, as a polygon in scene pixels (cape, sword and a pixel of margin).
FIGURE = [(105, 64), (134, 64), (135, 84), (139, 94), (141, 117), (139, 131), (135, 135), (135, 155),
          (131, 164), (99, 164), (97, 150), (90, 148), (79, 148), (78, 140), (91, 116), (95, 94),
          (103, 86), (104, 74)]
# The finished scene: his clearing (x 110 of his forest) in the middle, his forest mirrored out at
# both sides (under the creator's side panels) to a 16:9-and-wider width.
CLEARING = 110
WIDTH = 384
GROUND = 163  # the clearing's ground line (where a character stands), in scene pixels
FIGURE_X = (min(p[0] for p in FIGURE), max(p[0] for p in FIGURE))
FRAMES = 16
FPS = 12  # the game's shared sprite clock
SEED = 20261020


def native(a):
    H, W, _ = a.shape
    nx = int((W - PHASE[0]) / PITCH[0])
    ny = int((H - PHASE[1]) / PITCH[1])
    xs = [int(np.floor(PHASE[0] + k * PITCH[0])) for k in range(nx + 1)]
    ys = [int(np.floor(PHASE[1] + k * PITCH[1])) for k in range(ny + 1)]
    out = np.zeros((ny, nx, 3))
    for j in range(ny):
        for i in range(nx):
            c = a[ys[j] + 1:ys[j + 1] - 1, xs[i] + 1:xs[i + 1] - 1].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def polygon_mask(shape, pts):
    m = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return np.asarray(m) > 0


def inpaint(img, hole, allow, r=3, dy_max=5):
    """
    Fills the hole with patches of the picture from the same heights (exemplar fill, onion order).
    A source patch must lie wholly in `allow` (so no sword or trunk is copied into the fire), and a
    patch that continues the copy its filled neighbours came from is preferred, so whole tongues of
    flame come across together instead of a quilt of single patches.
    """
    img = img.copy()
    H, W, _ = img.shape
    hole = hole.copy()
    known = ~hole
    ok = allow & known
    cand = [(y, x) for y in range(r, H - r) for x in range(r, W - r) if ok[y - r:y + r + 1, x - r:x + r + 1].all()]
    cy = np.array([c[0] for c in cand])
    cx = np.array([c[1] for c in cand])
    patches = np.stack([img[y - r:y + r + 1, x - r:x + r + 1].reshape(-1, 3) for y, x in cand]).astype(np.float32)
    off = np.full((H, W, 2), 9999, np.int32)  # where each filled pixel was copied from (dy, dx)
    used = np.zeros(len(cand), np.float32)  # how often each source patch was taken
    while hole.any():
        ys, xs = np.nonzero(hole)
        best, at = -1, None
        for y, x in zip(ys, xs):
            n = known[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1].sum()
            if n > best or (n == best and (y, x) < at):
                best, at = n, (y, x)
        ty = min(max(at[0], r), H - r - 1)
        tx = min(max(at[1], r), W - r - 1)
        tk = known[ty - r:ty + r + 1, tx - r:tx + r + 1].reshape(-1)
        tp = img[ty - r:ty + r + 1, tx - r:tx + r + 1].reshape(-1, 3).astype(np.float32)
        sel = np.nonzero(np.abs(cy - ty) <= dy_max)[0]
        d = ((patches[sel][:, tk] - tp[tk]) ** 2).sum((1, 2)) / max(1, tk.sum())
        near = off[ty - r:ty + r + 1, tx - r:tx + r + 1].reshape(-1, 2)
        near = near[near[:, 0] != 9999]
        if len(near):
            o = np.stack([cy[sel] - ty, cx[sel] - tx], 1)
            gap = np.abs(o[:, None, :] - near[None, :, :]).sum(2).min(1)
            d = d + 60.0 * np.minimum(gap, 6)
        # A source taken before costs more each time, so no stretch of fire repeats like a fence.
        d = d + 400.0 * used[sel]
        j = sel[np.argmin(d)]
        used[np.abs(cy - cy[j]) + np.abs(cx - cx[j]) <= r] += 1
        sy, sx = cy[j], cx[j]
        fill = ~known[ty - r:ty + r + 1, tx - r:tx + r + 1]
        img[ty - r:ty + r + 1, tx - r:tx + r + 1][fill] = img[sy - r:sy + r + 1, sx - r:sx + r + 1][fill]
        off[ty - r:ty + r + 1, tx - r:tx + r + 1][fill] = (sy - ty, sx - tx)
        known[ty - r:ty + r + 1, tx - r:tx + r + 1] = True
        hole[ty - r:ty + r + 1, tx - r:tx + r + 1] = False
    return img


def luma(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def classes(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    L = luma(a)
    mx, mn = a.max(2), a.min(2)
    sat = (mx - mn) / np.maximum(mx, 1)
    fire = (L > 120) & (r > 180) & (r > g) & (g > b)
    lit = ~fire & (L > 70) & (sat > 0.45) & (r > g)
    smoke = ~fire & ~lit & (L > 45) & (sat < 0.45)
    return fire, lit, smoke, L


def components(m):
    """Labels of the 8-connected parts of a mask, and their sizes."""
    H, W = m.shape
    lab = np.zeros((H, W), np.int32)
    sizes = [0]
    n = 0
    for y in range(H):
        for x in range(W):
            if m[y, x] and not lab[y, x]:
                n += 1
                stack = [(y, x)]
                lab[y, x] = n
                s = 0
                while stack:
                    py, px = stack.pop()
                    s += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            qy, qx = py + dy, px + dx
                            if 0 <= qy < H and 0 <= qx < W and m[qy, qx] and not lab[qy, qx]:
                                lab[qy, qx] = n
                                stack.append((qy, qx))
                sizes.append(s)
    return lab, np.array(sizes)


def save(arr, path, mode=None):
    img = Image.fromarray(arr.astype(np.uint8), mode) if mode else Image.fromarray(arr.astype(np.uint8))
    tmp = path + '.tmp.png'
    img.save(tmp, optimize=True)
    os.replace(tmp, path)


SEAM = 10  # columns where a carried-on stretch overlaps his edge, to find the seam in


def seam_path(cost):
    """The top-to-bottom path through cost (H x n) with the least total, one column step per row."""
    H, n = cost.shape
    acc = cost.copy()
    back = np.zeros((H, n), np.int32)
    for y in range(1, H):
        for x in range(n):
            lo, hi = max(0, x - 1), min(n, x + 2)
            j = lo + int(np.argmin(acc[y - 1, lo:hi]))
            back[y, x] = j
            acc[y, x] += acc[y - 1, j]
    path = np.zeros(H, np.int32)
    path[-1] = int(np.argmin(acc[-1]))
    for y in range(H - 1, 0, -1):
        path[y - 1] = back[y, path[y]]
    return path, float(acc[-1].min())


def extend(sc, left, right):
    """
    His forest with `left` columns added before it and `right` after: each a stretch of his own
    columns, picked (away from the painted-out figure) where it meets his edge with the least seam.
    """
    H, W, _ = sc.shape
    f = sc.astype(np.float32)
    avoid = (FIGURE_X[0] - SEAM, FIGURE_X[1] + SEAM)

    def best(n, side):
        top = None
        for c in range(0, W - n - SEAM + 1):
            if not (c + n + SEAM <= avoid[0] or c >= avoid[1]):
                continue
            if side == 'right':
                # Overlap: his last SEAM columns against the stretch's first SEAM columns.
                ov = ((f[:, W - SEAM:] - f[:, c:c + SEAM]) ** 2).sum(2)
            else:
                ov = ((f[:, :SEAM] - f[:, c + n:c + n + SEAM]) ** 2).sum(2)
            path, cost = seam_path(ov)
            if top is None or cost < top[0]:
                top = (cost, c, path)
        return top

    out = np.zeros((H, left + W + right, 3), np.int32)
    out[:, left:left + W] = sc
    if right:
        cost, c, path = best(right, 'right')
        for y in range(H):
            k = path[y]  # his columns up to W - SEAM + k stay; the stretch takes over after
            out[y, left + W - SEAM + k:left + W + right] = sc[y, c + k:c + SEAM + right]
    if left:
        cost, c, path = best(left, 'left')
        for y in range(H):
            k = path[y]  # the stretch runs up to his column k
            out[y, 0:left + k] = sc[y, c:c + left + k]
    return out


def study(arr, out, name, k=4):
    path = os.path.join(out, 'study', name + '.png')
    save(arr, path)
    img = Image.open(path)
    img.resize((img.width * k, img.height * k), Image.NEAREST).save(os.path.join(out, 'study', name + '@%d.png' % k))


def ramp_of(px, k=14, iters=30):
    """His flame colours: k-means on the flame pixels, darkest (tongue tip) to brightest (base)."""
    px = px.astype(np.float32)
    order = np.argsort(luma(px))
    c = px[order[np.linspace(0, len(px) - 1, k).astype(int)]].copy()
    for _ in range(iters):
        lab = ((px[:, None, :] - c[None]) ** 2).sum(2).argmin(1)
        for i in range(k):
            if (lab == i).any():
                c[i] = px[lab == i].mean(0)
    c = c[np.argsort(luma(c))]
    return np.round(c).astype(np.int32)


def tile_noise(rng, gx, gy):
    return rng.random((gy, gx)).astype(np.float32)


def sample(lat, x, y):
    """Value noise from a lattice that wraps both ways, smooth between its points."""
    gy, gx = lat.shape
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    fx, fy = x - x0, y - y0
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    a = lat[y0 % gy, x0 % gx]
    b = lat[y0 % gy, (x0 + 1) % gx]
    c = lat[(y0 + 1) % gy, x0 % gx]
    d = lat[(y0 + 1) % gy, (x0 + 1) % gx]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def flame_frames(full, flame, region):
    """
    The loop: his flames stretch and waver upward. Each pixel of the flames (and of the smoke right
    above them) takes the colour of a flame pixel a little below or beside it, by an offset that
    rises with the noise: a tongue grows when it borrows from below and drops back when the offset
    falls, and the swell travels up through the fire. Only his flame pixels are borrowed (a stake or
    a sword in front of the fire stays where it is), so every frame is drawn in his own colours and
    shapes. The noise scrolls up by whole lattice periods over the loop, so the last frame runs into
    the first.
    """
    H, W, _ = full.shape
    rng = np.random.default_rng(SEED)
    ys, xs = np.nonzero(region)
    lift = tile_noise(rng, 48, 4)   # the swell: about 4 px wide, 9 px tall
    sway = tile_noise(rng, 24, 4)
    frames = []
    for f in range(FRAMES):
        t = f / FRAMES
        n = sample(lift, xs / 4.0, ys / 9.0 + 4 * t)
        dy = np.floor(n * 5.0 - 1.0).astype(int)  # -1 (drops back) .. 3 (licks up)
        w = sample(sway, xs / 7.0, ys / 12.0 + 4 * t)
        dx = np.floor(w * 3.0 - 1.0).clip(-1, 1).astype(int)
        sy = np.clip(ys + dy, 0, H - 1)
        sx = np.clip(xs + dx, 0, W - 1)
        take = flame[sy, sx]
        # A flame pixel whose offset lands off the fire (in the smoke above): the tongue drops back.
        drop = ~take & flame[ys, xs] & (dy < 0)
        fr = full.copy()
        fr[ys[take], xs[take]] = full[sy[take], sx[take]]
        fr[ys[drop], xs[drop]] = full[sy[drop], sx[drop]]
        frames.append(fr)
    return frames

def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    a = np.asarray(Image.open(ref).convert('RGB')).astype(np.int32)
    nat = native(a)
    x0, y0, x1, y1 = SCENE
    sc = nat[y0:y1, x0:x1].copy()
    H, W, _ = sc.shape

    # 2. His character out.
    fig = polygon_mask(sc.shape, FIGURE)
    mx, mn = sc.max(2), sc.min(2)
    sat = (mx - mn) / np.maximum(mx, 1)
    L = luma(sc)
    warm = (sat > 0.3) & (sc[..., 0] > sc[..., 1]) & (L > 40)
    metal = (sat < 0.3) & (L > 55)
    cool = (sc[..., 2] > 0.75 * sc[..., 0]) & (L > 30)  # steel, chain and blade blues
    rows = np.arange(H)[:, None]
    # What may be copied, by height: in the smoke above the flames his smoke and fire (no trunks);
    # in the flames only fire (no swords or stakes); on the path his earth (no steel or chain).
    allow = np.where(rows < 92, L > 38, np.where(rows < 132, warm & (L > 62), np.where(rows < 146, warm & ~cool, ~metal & ~cool)))
    sc = inpaint(sc, fig, allow)
    study(sc, out, 'step2')

    # 3. His painted embers out of the air (the scene's embers move).
    fire, lit, smoke, L = classes(sc)
    hot = fire | lit
    lab, size = components(hot)
    ring = np.zeros_like(hot, np.float32)
    k = np.ones((5, 5), np.float32)
    pad = np.pad(hot.astype(np.float32), 2)
    for dy in range(5):
        for dx in range(5):
            ring += pad[dy:dy + H, dx:dx + W]
    ember = hot & (size[lab] <= 3) & (ring <= 4)
    clean = sc.copy()
    for y, x in zip(*np.nonzero(ember)):
        y0_, y1_, x0_, x1_ = max(0, y - 2), min(H, y + 3), max(0, x - 2), min(W, x + 3)
        nb = sc[y0_:y1_, x0_:x1_][~ember[y0_:y1_, x0_:x1_]]
        clean[y, x] = np.median(nb, axis=0)
    sc = clean
    study(sc, out, 'step3')

    # 4. His forest carried on at both sides, the clearing in the middle: each side is a stretch of
    # his own forest (not mirrored) joined to his edge along the seam where the two match best.
    left = WIDTH // 2 - CLEARING
    right = WIDTH - left - W
    full = extend(sc, left, right)
    H, W = full.shape[:2]
    study(full, out, 'step4')

    # 5. The flames, and a loop of frames where they lick upward along his own flame ramp.
    fire, lit, smoke, L = classes(full)
    pad = np.pad(fire.astype(np.float32), 3)
    near = np.zeros((H, W), np.float32)
    for dy in range(7):
        for dx in range(7):
            near += pad[dy:dy + H, dx:dx + W]
    rows = np.arange(H)[:, None]
    flame = (fire | (lit & (near >= 12))) & (rows < 146)
    ramp = ramp_of(full[flame])
    # Up to three pixels of smoke right above a flame may catch when the flame licks higher.
    above = np.zeros((H, W), np.int32)
    for d in (1, 2, 3):
        up = np.zeros((H, W), bool)
        up[:-d] = flame[d:]
        cand = up & ~flame & (L > 38) & (above == 0)
        above[cand] = d
    tips = above > 0
    frames = flame_frames(full, flame, flame | tips)
    study(frames[0], out, 'frame0')

    # 6. Behind the trees: where the drifting smoke may show.
    sat = (full.max(2) - full.min(2)) / np.maximum(full.max(2), 1)
    back = (L > 40) & (rows < 150) & ~((sat < 0.3) & (L > 70) & (rows > 90))
    # Where embers and smoke rise from: the top pixel of each flame column, a few per stretch.
    rng = np.random.default_rng(SEED)
    src = []
    for x in range(W):
        ys = np.nonzero(flame[:, x])[0]
        if len(ys):
            src.append((x, int(ys.min()), int(fire[:, x].sum())))
    src = [p for p in src if p[2] >= 2]
    pick = sorted(rng.choice(len(src), size=min(90, len(src)), replace=False))
    sources = [[src[i][0], src[i][1]] for i in pick]

    save(full, os.path.join(out, 'base.png'))
    sheet = np.zeros((H * FRAMES, W, 4), np.uint8)
    region = flame | tips
    for f, fr in enumerate(frames):
        sheet[f * H:(f + 1) * H][..., :3] = np.where(region[..., None], fr, 0)
        sheet[f * H:(f + 1) * H][..., 3] = np.where(region, 255, 0)
    save(sheet, os.path.join(out, 'fire.png'), 'RGBA')
    m = np.zeros((H, W, 4), np.uint8)
    m[..., 3] = np.where(back, 255, 0)
    save(m, os.path.join(out, 'back.png'), 'RGBA')
    meta = {
        'name': 'creator_forest',
        'source': 'docs/reference/creator-scene-owner-reference.jpg (the owner\'s creator mockup, his forest)',
        'size': [W, H],
        'ground': GROUND,
        'clearing': WIDTH // 2,
        'fire': {'file': 'fire.png', 'frames': FRAMES, 'fps': FPS},
        'back': 'back.png',
        'emberSources': sources,
        # His smoke: the light billows (a puff's middle) and the haze (its rim).
        'smoke': {'light': [int(c) for c in np.percentile(full[smoke & (rows < 90)], 95, axis=0)],
                  'rgb': [int(c) for c in np.median(full[smoke & (rows < 90)], axis=0)]},
        'embers': [list(map(int, c)) for c in ramp[-6:]],
    }
    tmp = os.path.join(out, 'scene.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.replace(tmp, os.path.join(out, 'scene.json'))
    # A strip of the loop to look at.
    strip = np.concatenate([frames[i][40:150, 120:264] for i in range(0, FRAMES, 2)], 1)
    study(strip, out, 'loop')

if __name__ == '__main__':
    main()
