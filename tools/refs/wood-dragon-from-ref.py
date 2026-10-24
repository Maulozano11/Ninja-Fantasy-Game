"""Lifts the owner's wood dragon out of his hotbar icon (sheet 10, 'Dragon Madera') for the Wood Dragon's
battle effect (his answer 4 of the jutsu effects, round 1: "vamos a crear un nuevo vfx para este").

His picture: docs/reference/icons-owner-reference-10.jpg, his 480x268 pixel art scaled up by 4.1667
and saved as JPEG. His pixel grid and his pixels come back exactly as tools/refs/icons-from-ref-23.py
takes them (the same functions: grid(), native(), each of his pixels the median of its block's
interior), and his art window is the same box (132, 83, 230, 179), 98x96 of his pixels.

Out of the window this keeps his dragon and his leaves, and leaves out his green ground:
  - his wood: warm hues (brown, tan, orange), and his dark line (dark pixels that are not his deep
    ground green) touching it;
  - his leaves (yellow-green): the ones touching the dragon are its mane and stay on it; the loose
    ones flying round it (whole, away from the window's edge) are kept apart, one by one, as his
    leaves to scatter;
  - small pockets of his ground shut inside the dragon (12 of his pixels or fewer, between the jaw
    and a horn) stay as he drew them;
  - everything at and below his row GROUND is left out: the dragon rises out of the ground there (his
    coils run on past the frame below it). What touches the window's side above it is cut there.
His colours: the JPEG gives each of his pixels a slightly different colour, so the kept pixels are
grouped (k-means, started from the luma order, so the same picture gives the same colours) into
PAL_N colours, each the mean of its group: no colour that is not his. His dark line is the darkest
group; where the cut-out edge meets the air and is not already his line, one pixel of his line is
added outside it (as his line runs round the rest of the dragon).

Writes tools/world-sprites/vfx-wood-refdata.ts (generated: rerun this to change it) and, with a
third argument, a check sheet (his window, our cut, at 6x) to look at. Same input, same bytes.

  python3 -I tools/refs/wood-dragon-from-ref.py docs/reference/icons-owner-reference-10.jpg \
      tools/world-sprites/vfx-wood-refdata.ts [<check.png>]
"""

import colorsys
import importlib.util
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('icons23', os.path.join(HERE, 'icons-from-ref-23.py'))
icons23 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(icons23)

WINDOW = (132, 83, 230, 179)
assert any(j == 'wood_dragon_jutsu' and b == WINDOW for j, b, _, _ in icons23.SHEETS['10'])
# His row (in the window) where the ground is: the dragon rises out of it.
GROUND = 71
PAL_N = 40
POCKET = 12
ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


def hsv(p):
    h, s, v = colorsys.rgb_to_hsv(*(c / 255 for c in p))
    return h * 360, s, v


def classify(px):
    """'w' wood, 'd' dark (line), 'l' leaf, 'g' his ground."""
    h, s, v = hsv(px)
    if v < 0.22 and not (110 < h < 175 and s > 0.5):
        return 'd'
    if (h < 55 or h > 330) and s > 0.15:
        return 'w'
    if 55 <= h < 115 and s > 0.3 and v > 0.3:
        return 'l'
    return 'g'


def components(mask):
    """4-connected components of a boolean mask, in reading order of their first pixel."""
    H, W = mask.shape
    lab = -np.ones((H, W), int)
    out = []
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
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and lab[ny, nx] < 0:
                            lab[ny, nx] = k
                            stack.append((ny, nx))
                out.append(sorted(pts))
    return out, lab


def near(mask, pts, r=1):
    H, W = mask.shape
    for y, x in pts:
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx]:
                    return True
    return False


def grow_dark(keep, cls):
    """His dark pixels touching what is kept (8 ways), until none is left to add."""
    H, W = keep.shape
    changed = True
    while changed:
        changed = False
        for y in range(H):
            for x in range(W):
                if keep[y, x] or cls[y][x] != 'd':
                    continue
                if near(keep, [(y, x)]):
                    keep[y, x] = True
                    changed = True


def kmeans(px, k, iters=30):
    lum = px @ np.array([0.299, 0.587, 0.114])
    order = np.argsort(lum, kind='stable')
    c = np.array([px[order[int((i + 0.5) / k * len(order))]] for i in range(k)], float)
    for _ in range(iters):
        a = ((px[:, None, :] - c[None]) ** 2).sum(-1).argmin(1)
        for j in range(k):
            if (a == j).any():
                c[j] = px[a == j].mean(0)
    a = ((px[:, None, :] - c[None]) ** 2).sum(-1).argmin(1)
    return np.round(c).astype(int), a


def main():
    if len(sys.argv) not in (3, 4):
        sys.exit(__doc__)
    src, dst = sys.argv[1], sys.argv[2]
    a = np.asarray(Image.open(src).convert('RGB')).astype(float)
    g = icons23.grid(a)
    nat, _, _, _ = icons23.native(a, g)
    x0, y0, x1, y1 = WINDOW
    win = np.clip(np.round(nat[y0:y1, x0:x1]), 0, 255).astype(int)
    H, W = GROUND, win.shape[1]
    cls = [[classify(win[y, x]) for x in range(W)] for y in range(H)]
    wood = np.array([[cls[y][x] == 'w' for x in range(W)] for y in range(H)])
    # The dragon: every piece of wood big enough to be part of it (a stray warm pixel is not).
    comps, _ = components(wood)
    keep = np.zeros((H, W), bool)
    for c in comps:
        if len(c) >= 6:
            for y, x in c:
                keep[y, x] = True
    grow_dark(keep, cls)
    # His leaves: on the dragon (the mane), or loose round it.
    leafm = np.array([[cls[y][x] == 'l' for x in range(W)] for y in range(H)])
    leaves, _ = components(leafm)
    loose = []
    for c in leaves:
        if near(keep, c):
            for y, x in c:
                keep[y, x] = True
        else:
            ys = [p[0] for p in c]
            xs = [p[1] for p in c]
            whole = min(ys) > 0 and min(xs) > 0 and max(xs) < W - 1 and max(ys) < H - 1
            if whole and 3 <= len(c) <= 40:
                loose.append(c)
    grow_dark(keep, cls)
    # Pockets of his ground shut inside the dragon stay as he drew them.
    air, _ = components(~keep)
    for c in air:
        edge = any(y == 0 or x == 0 or x == W - 1 for y, x in c) or any(y == H - 1 for y, x in c)
        if not edge and len(c) <= POCKET:
            for y, x in c:
                keep[y, x] = True
    # His colours, de-noised: the kept pixels and the loose leaves (with their dark line) grouped.
    lmask = np.zeros((H, W), bool)
    for c in loose:
        for y, x in c:
            lmask[y, x] = True
    grow_dark(lmask, cls)
    lmask &= ~keep
    pts = [(y, x) for y in range(H) for x in range(W) if keep[y, x] or lmask[y, x]]
    px = np.array([win[y, x] for y, x in pts], float)
    pal, asg = kmeans(px, PAL_N)
    lum = pal @ np.array([0.299, 0.587, 0.114])
    order = list(np.argsort(lum, kind='stable'))
    remap = {int(j): i for i, j in enumerate(order)}
    pal = pal[order]
    idx = -np.ones((H, W), int)
    for (y, x), j in zip(pts, asg):
        idx[y, x] = remap[int(j)]
    # His line: the darkest colour. One pixel of it outside an edge that is not his line already.
    LINE = 0
    body = idx.copy()
    body[lmask] = -1
    out = body.copy()
    pad = 1
    big = -np.ones((H + 2 * pad, W + 2 * pad), int)
    big[pad:pad + H, pad:pad + W] = out
    res = big.copy()
    for y in range(big.shape[0]):
        for x in range(big.shape[1]):
            if big[y, x] >= 0:
                continue
            # Never below his ground row, nor out past the window's side: it is cut there.
            if y - pad >= H - 1 or x - pad < 0 or x - pad >= W:
                continue
            nb = [big[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + dy < big.shape[0] and 0 <= x + dx < big.shape[1]]
            if any(n > LINE + 2 for n in nb):
                res[y, x] = LINE
    body = res
    # Loose leaves, each its own small piece (with his line round it as he drew it).
    leaf_pieces = []
    lab = np.zeros((H, W), bool)
    for c in loose:
        cm = np.zeros((H, W), bool)
        for y, x in c:
            cm[y, x] = True
        grow_dark(cm, cls)
        cm &= lmask
        ys, xs = np.nonzero(cm)
        if not len(ys):
            continue
        by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rows = []
        for y in range(by0, by1):
            rows.append(''.join(ALPHABET[idx[y, x]] if cm[y, x] else '.' for x in range(bx0, bx1)))
        leaf_pieces.append({'x': int(bx0), 'y': int(by0), 'rows': rows})
        lab |= cm
    rows = [''.join(ALPHABET[v] if v >= 0 else '.' for v in r) for r in body]
    hexes = ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in pal]
    kinds = []
    for c in pal:
        k = classify(c)
        kinds.append({'w': 'wood', 'd': 'line', 'l': 'leaf', 'g': 'ground'}[k])
    kinds[LINE] = 'line'
    data = {
        'source': os.path.basename(src),
        'window': list(WINDOW),
        'ground': GROUND,
        'pad': pad,
        'pal': hexes,
        'kinds': kinds,
        'dragon': rows,
        'leaves': leaf_pieces,
    }
    text = ('// Generated by tools/refs/wood-dragon-from-ref.py from the owner\'s hotbar icon of the Wood Dragon\n'
            '// (docs/reference/icons-owner-reference-10.jpg, his window %s of his 480x268 pixels): rerun the\n'
            '// script to change it. His dragon (rows of palette letters, \'.\' clear; his rows 0 to %d of the\n'
            '// window, shifted %d px right and down for the line added round it), his loose leaves (each at its\n'
            '// place in the window), his colours (darkest first; kind: his line, wood, leaf, or his ground in a\n'
            '// pocket shut inside the dragon).\n\n'
            'export interface WoodRef {\n  source: string;\n  window: number[];\n  ground: number;\n  pad: number;\n  pal: string[];\n'
            '  kinds: (\'line\' | \'wood\' | \'leaf\' | \'ground\')[];\n  dragon: string[];\n  leaves: { x: number; y: number; rows: string[] }[];\n}\n\n'
            'export const WOOD_REF: WoodRef = %s;\n') % (str(WINDOW), GROUND - 1, pad, json.dumps(data, indent=1))
    tmp = dst + '.tmp-%d' % os.getpid()
    with open(tmp, 'w') as f:
        f.write(text)
    os.replace(tmp, dst)
    if len(sys.argv) == 4:
        S = 6
        sheet = Image.new('RGB', ((W + 2) * 3 * S, (win.shape[0]) * S), (24, 28, 24))
        sheet.paste(Image.fromarray(win.astype(np.uint8)).resize((W * S, win.shape[0] * S), Image.NEAREST), (0, 0))
        cut = Image.new('RGBA', (W + 2, H + 2), (0, 0, 0, 0))
        for y in range(H + 2):
            for x in range(W + 2):
                if body[y, x] >= 0:
                    cut.putpixel((x, y), tuple(int(v) for v in pal[body[y, x]]) + (255,))
        bg = Image.new('RGBA', cut.size, (60, 60, 70, 255))
        bg.alpha_composite(cut)
        sheet.paste(bg.convert('RGB').resize(((W + 2) * S, (H + 2) * S), Image.NEAREST), ((W + 2) * S, 0))
        lv = Image.new('RGBA', (W, H), (60, 60, 70, 255))
        for p in leaf_pieces:
            for j, r in enumerate(p['rows']):
                for i, ch in enumerate(r):
                    if ch != '.':
                        lv.putpixel((p['x'] + i, p['y'] + j), tuple(int(v) for v in pal[ALPHABET.index(ch)]) + (255,))
        sheet.paste(lv.convert('RGB').resize((W * S, H * S), Image.NEAREST), (2 * (W + 2) * S, 0))
        sheet.save(sys.argv[3])
    print('wood dragon: %d colours, %d px of dragon, %d loose leaves -> %s' % (len(hexes), int((body >= 0).sum()), len(leaf_pieces), dst))


if __name__ == '__main__':
    main()
