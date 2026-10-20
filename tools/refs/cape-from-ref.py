"""The owner's black cape (docs/reference/crystal-sword-owner-reference.jpg) as a cape template.

His picture is our ninja drawn in his own pixels (one of his pixels is one fine pixel of our sprites,
tools/refs/crystal-sword-from-ref.py). His cape hangs from the near shoulder behind the arm to the
calf, in near-black cloth with grey fold lights and his black line, its hem cut in points. This
script lifts it out of his pixels:

  back    the part behind the arm and the body: his pixels (cloth and black line), and where his arm
          and sword cover it, the cloth continued from above and beside (so our arm, a little
          elsewhere, never shows a hole)
  front   the mantle round the neck and over both shoulders, under the chin, that reads as a scarf
          but is the cape (the owner), with its gold studs
  shoulder the part over the near shoulder, in front of the arm, with his gold stud

and writes, in <out>:

  cape.json           rows and palette for each part (one character per colour of his), the anchor
                      (his near shoulder joint: where our rig's near shoulder goes)
  study/cape@8.png    the parts lifted out, at 8x
  study/his@8.png     his figure there, at 8x

The same picture always gives the same bytes. Run with python3 -I:

  python3 -I tools/refs/cape-from-ref.py docs/reference/crystal-sword-owner-reference.jpg <out> [src/sprite/items/capeArt.ts]
"""

import json
import os
import sys

import numpy as np
from PIL import Image

PITCH = 19.318
PHASE = (0.6, 0.7)
# His near shoulder joint, in his pixels: where our rig's near shoulder (fine pixel 50, 56 at rest)
# sits on his figure, the two lined up by his sword (ours = his + (10, 24)).
ANCHOR = (40, 32)
# The base of his neck: where our rig's neck (fine pixel 63, 51 at rest) sits; the mantle hangs from
# it, so it follows the head when the body leans.
NECK = (53, 27)
# Where the cape is.
BACK_BOX = (12, 37, 40, 88)  # x0, y0, x1, y1 (exclusive)
# Below the arm the cloth ends before the shadow between his sword and his coat.
LOWER_FROM = 57
LOWER_X1 = 36
# The rows where his sword's pommel sticks out past the cape's edge.
POMMEL_ROWS = [50, 51, 52, 53, 54]
SHOULDER_BOX = (26, 26, 49, 46)
# The shoulder piece ends where the mantle round his neck begins.
SCARF_X = 43
# The mantle: from under his chin, between the shoulders, down to his coat.
FRONT_BOX = (35, 28, 66, 41)
FRONT_SEED = (50, 32)


def native(a):
    H, W, _ = a.shape
    nx = int((W - PHASE[0]) / PITCH)
    ny = int((H - PHASE[1]) / PITCH)
    xs = [int(np.floor(PHASE[0] + k * PITCH)) for k in range(nx + 1)]
    ys = [int(np.floor(PHASE[1] + k * PITCH)) for k in range(ny + 1)]
    out = np.zeros((ny, nx, 3))
    for j in range(ny):
        for i in range(nx):
            c = a[ys[j] + 3:ys[j + 1] - 3, xs[i] + 3:xs[i + 1] - 3].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def luma(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def save(arr, path, k=8):
    img = Image.fromarray(arr.astype(np.uint8), 'RGBA' if arr.shape[2] == 4 else 'RGB')
    img = img.resize((img.width * k, img.height * k), Image.NEAREST)
    tmp = path + '.tmp.png'
    img.save(tmp)
    os.replace(tmp, path)


def write_ts(meta, path):
    """The parts as the game's module (src/sprite/items/capeArt.ts): pivots on the near shoulder."""
    import re

    def key(k):
        return k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"

    ax, ay = meta['anchor']
    out = [
        "// The owner's black cape, his pixels (tools/refs/cape-from-ref.py from",
        '// docs/reference/crystal-sword-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        'export interface PaintedPart {',
        '  rows: string[];',
        '  /** The cell on its joint: the near shoulder, or the base of the neck for the mantle. */',
        '  pivot: [number, number];',
        '  colors: Record<string, string>;',
        '}',
        '',
    ]
    for part, name, doc in (
        ('back', 'OWNER_CAPE_BACK', 'Behind the near arm and the body, to the calf.'),
        ('front', 'OWNER_CAPE_FRONT', 'The mantle round the neck and over both shoulders, under the chin, with its gold studs; it hangs from the base of the neck.'),
        ('shoulder', 'OWNER_CAPE_SHOULDER', 'Over the near shoulder, with his gold stud.'),
    ):
        p = meta[part]
        ox, oy = p['origin']
        jx, jy = meta['neck'] if part == 'front' else (ax, ay)
        out += [f'/** {doc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{jx - ox}, {jy - oy}],', '  rows: [']
        out += [f"    '{r}'," for r in p['rows']]
        out += ['  ],', '  colors: {']
        out += [f"    {key(k)}: '{v}'," for k, v in p['palette'].items()]
        out += ['  },', '};', '']
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    a = native(np.asarray(Image.open(ref).convert('RGB')).astype(np.int32))
    H, W, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    L = luma(a)
    ys, xs = np.mgrid[0:H, 0:W]

    def inbox(box):
        x0, y0, x1, y1 = box
        return (xs >= x0) & (xs < x1) & (ys >= y0) & (ys < y1)

    # His cloth: black to dark grey, neither blue (the coat) nor warm (skin, gold).
    neutral = (np.abs(b - r) < 22) & (np.abs(g - r) < 22) & (L < 110)
    skin = (r > g + 25) & (r > b + 35)
    # His gold: yellower than skin (more green over blue, less red over green).
    gold = skin & (L > 120) & (g > b + 45) & (r - g < 50)
    # His coat: deep saturated blue (his sword's dark relief is greyer: more green for its blue).
    navy = (b > r + 25) & (L < 100) & (g < 0.62 * b)
    # The background: the white reached from the picture's edge (his sword's white glints are not).
    bg = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or bg[y, x] or L[y, x] <= 235:
            continue
        bg[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]

    # The back: row by row, from his cape's outer edge in toward the body, everything up to his coat
    # (the cloth, his line, and his arm and sword in front of it). Where the pommel of his sword
    # sticks out past the cape, the edge is the cape's own, between the rows above and below.
    back = np.zeros((H, W), bool)
    x0b, y0b, x1b, y1b = BACK_BOX
    left = {}
    for y in range(y0b, y1b):
        row = [x for x in range(x0b, x1b) if not bg[y, x]]
        if row and row[0] < 34:
            left[y] = row[0]
    for y in POMMEL_ROWS:
        left[y] = round(left[POMMEL_ROWS[0] - 1] + (left[POMMEL_ROWS[-1] + 1] - left[POMMEL_ROWS[0] - 1]) * (y - POMMEL_ROWS[0] + 1) / (len(POMMEL_ROWS) + 1))
    for y, lx in left.items():
        while lx < x1b and bg[y, lx]:
            lx += 1
        for x in range(lx, x1b if y < LOWER_FROM else LOWER_X1):
            if bg[y, x] or navy[y, x]:
                break
            back[y, x] = True
    # Under his arm and sword (and past the pommel) the cloth goes on: those pixels take the colour of
    # the cloth below them, so his folds run on up behind the arm, or beside them.
    col = a.copy()
    cloth = back & neutral
    for y in range(y1b - 1, y0b - 1, -1):
        for x in range(x0b, x1b):
            if not back[y, x] or cloth[y, x]:
                continue
            for qy, qx in ((y + 1, x), (y, x - 1), (y, x + 1), (y - 1, x)):
                if cloth[qy, qx]:
                    col[y, x] = col[qy, qx]
                    break
            else:
                col[y, x] = (8, 8, 11)
            cloth[y, x] = True

    # The shoulder piece: his cloth over the near shoulder up to the scarf, and the gold stud on it.

    # The front: the mantle round the neck and over both shoulders, under his chin, that reads as a
    # scarf but is the cape (the owner, 2026-10-20), with its gold studs: his cloth and line reached
    # from under the chin without leaving its box (the coat below is blue, the face above warm).
    front = np.zeros((H, W), bool)
    fbox = inbox(FRONT_BOX)
    stack = [(FRONT_SEED[1], FRONT_SEED[0])]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or front[y, x] or not (fbox[y, x] and (neutral[y, x] or gold[y, x]) and not bg[y, x]):
            continue
        front[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]

    # The near shoulder: all of his cape over it - the mantle, the piece over the shoulder and the top
    # of the cloth falling behind the arm - goes in front of our arm, so our sleeve never shows
    # through where his cape covers his (the owner, 2026-10-20: "el hombro derecho"). Only his own
    # cloth: not his arm, nor the cloth carried on behind it.
    # The collar rising behind his jaw (left of the chin) is his cape too.
    his_cloth = (back & neutral) | front | ((neutral | gold) & ~bg & ((xs < SCARF_X) | ((xs < 50) & (ys < 29))))
    # Below the armpit only the strip outside the arm: the cloth between his arm and his coat stays
    # behind our arm.
    shoulder = inbox(SHOULDER_BOX) & his_cloth & (neutral | gold) & ~bg & ~((xs >= 47) & (ys < 27)) & ~((ys >= 40) & (xs >= 34))

    def pack(mask, keep_line=True):
        CHARS = 'abcdefhijklmnpqrstuvwxyzABCDEFHIJKLMNOPQRSTUVWXYZ0123456789'
        grid = np.full((H, W), '.', dtype='<U1')
        palette = {}
        seen = []
        for y in range(H):
            for x in range(W):
                if not mask[y, x]:
                    continue
                c = col[y, x]
                for ch, ref_c in seen:
                    if np.abs(ref_c - c).max() <= 3:
                        grid[y, x] = ch
                        break
                else:
                    ch = CHARS[len(seen)]
                    seen.append((ch, c))
                    palette[ch] = '#%02x%02x%02x' % tuple(int(v) for v in c)
                    grid[y, x] = ch
        yy, xx = np.nonzero(grid != '.')
        x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
        rows = [''.join(grid[y, x0:x1]) for y in range(y0, y1)]
        return {'rows': rows, 'origin': [int(x0), int(y0)], 'palette': palette}

    meta = {
        'source': 'docs/reference/crystal-sword-owner-reference.jpg',
        'anchor': list(ANCHOR),
        'neck': list(NECK),
        'back': pack(back),
        'shoulder': pack(shoulder),
        'front': pack(front),
    }
    tmp = os.path.join(out, 'cape.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.replace(tmp, os.path.join(out, 'cape.json'))

    if len(sys.argv) > 3:
        write_ts(meta, sys.argv[3])

    rgba = np.zeros((H, W, 4), np.uint8)
    for part in ('back', 'front', 'shoulder'):
        p = meta[part]
        ox, oy = p['origin']
        for j, row in enumerate(p['rows']):
            for i, ch in enumerate(row):
                if ch != '.':
                    h = p['palette'][ch]
                    rgba[oy + j, ox + i] = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255]
    save(rgba[20:92, 8:64], os.path.join(out, 'study', 'cape@8.png'))
    save(a[20:92, 8:64], os.path.join(out, 'study', 'his@8.png'))
    print('back', len(meta['back']['rows']), 'rows,', len(meta['back']['palette']), 'colours; shoulder', len(meta['shoulder']['rows']), 'rows')


if __name__ == '__main__':
    main()
