"""The owner's broad man reading, on the bulky body: his repaint of our "Leer 1"
(docs/reference/bulky-read-owner-reference.jpg), as one whole frame of his pixels (src/sprite/broadReadArt.ts).

The owner, on the read we had mended twice: "sigue mal pasame esta para repintarlo"; he was sent our broad man
reading on the bulky body (read frame 0, on his rock), 10x, and painted over it: "aqui esta la referencia exacta
q quiero". He changed the arms (short sleeves, the bare arms crossing to hold the open book in both hands), the
shoulders, the book, the hair over the shoulder; the rock, the jeans, the belt and the boots stay ours, under his
pixels. Our read is one held frame on the male bodies (rig.ts READ_KEYS), so his frame is the read's 12 frames.

His picture is a JPEG of his pixels at PITCH picture pixels each, the first cell's corner at ORIGIN (fitted on
it: the pitch and corner at which the cells he left as they were, the rock, the legs, the hair, are ours); his cell (i, j) is our fine pixel (i + OFFSET[0], j + OFFSET[1]),
found by matching his cells to our frame (the rock, the legs, the belt line up to the pixel; the script checks
that the rock still does). Each cell's colour is the median of its middle; JPEG noise is taken off by snapping:
- white (every channel at least WHITE) is the background;
- where the rock is (our seat) and his cell is the rock's colour, it is the rock: seats.ts draws it, not this;
- where he kept our pixel (within KEPT of its colour), it is our pixel, exactly;
- elsewhere he painted anew: his colours are found as groups of near cells (SAME), each our colour where it is
  one of ours (OURS), else its mean.
Every colour is told apart as the character's skin, hair or eyes, or fixed, by our frame drawn with each in
another colour (tools/refs/bulky-read-base.ts): in the game his skin, hair and eyes follow the character's.
Each pixel keeps our body part there, or the nearest of ours where he painted past our figure.

  npx tsx tools/refs/bulky-read-base.ts <tmp>
  python3 -I tools/refs/bulky-read-from-ref.py <tmp>/base.json src/sprite/broadReadArt.ts [studyDir]

The same picture and base always give the same bytes.
"""

import base64
import json
import os
import sys

import numpy as np
from PIL import Image

REF = 'docs/reference/bulky-read-owner-reference.jpg'
# His picture is our 10x frame resized a little unevenly: a cell is PITCH[0] wide and PITCH[1] tall.
PITCH = (20.48, 20.87)
ORIGIN = (12.5, 12.75)
OFFSET = (79, 129)
WHITE = 245
KEPT = 30
ROCK = 40
# Where our figure is not, his rock is the rock unless far from it (his JPEG runs darker on its light patches).
ROCK_BARE = 90
SAME = 18
OURS = 8
# One character per colour: his frame has some 340 (our shading under his pixels), past ASCII into Latin letters.
CHARS = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-/:;<=>?@[]^_{|}~' + ''.join(chr(c) for c in range(0x100, 0x250))


def cells(path=REF):
    """His picture's cells: (ny, nx, 3) floats, the median of each cell's middle."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(float)
    H, W, _ = a.shape
    px, py = PITCH
    nx = int((W - ORIGIN[0]) / px)
    ny = int((H - ORIGIN[1]) / py)
    out = np.zeros((ny, nx, 3))
    for j in range(ny):
        for i in range(nx):
            x0 = ORIGIN[0] + i * px
            y0 = ORIGIN[1] + j * py
            blk = a[int(y0 + py * 0.3):int(y0 + py * 0.7), int(x0 + px * 0.3):int(x0 + px * 0.7)]
            out[j, i] = np.median(blk.reshape(-1, 3), axis=0)
    return out


def base(path):
    d = json.load(open(path))
    g = d['grid']
    img = lambda s: np.frombuffer(base64.b64decode(s), np.uint8).reshape(g, g, 4)
    rgba = {k: img(v) for k, v in d['rgba'].items()}
    part = np.frombuffer(base64.b64decode(d['part']), np.uint8).reshape(g, g)
    return g, rgba, part, img(d['seat'])


def hexc(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in c)


def main():
    base_json, out_ts = sys.argv[1], sys.argv[2]
    study = sys.argv[3] if len(sys.argv) > 3 else None
    his = cells()
    ny, nx, _ = his.shape
    g, rgba, part, seat = base(base_json)
    plain = rgba['plain']
    fig = plain[..., 3] > 0
    # Each of our colours: the character's skin, hair or eyes (it changes with them), or fixed.
    kind_at = np.full((g, g), 'fixed', object)
    for k in ('skin', 'hair', 'eye'):
        kind_at[fig & (rgba[k][..., :3] != plain[..., :3]).any(axis=2)] = k
    votes = {}
    for y, x in zip(*np.nonzero(fig)):
        h = hexc(plain[y, x, :3])
        votes.setdefault(h, {}).setdefault(kind_at[y, x], 0)
        votes[h][kind_at[y, x]] += 1
    colour_kind = {h: sorted(v.items(), key=lambda t: (-t[1], t[0]))[0][0] for h, v in votes.items()}
    pal_hex = sorted(colour_kind)
    pal = np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in pal_hex], float)
    fys, fxs = np.nonzero(fig)

    out_hex = {}
    out_kind = {}
    out_part = {}
    rock_bad = 0
    new = {}
    for j in range(ny):
        for i in range(nx):
            x, y = i + OFFSET[0], j + OFFSET[1]
            c = his[j, i]
            if c.min() >= WHITE:
                continue
            ours = plain[y, x]
            d_ours = np.abs(c - ours[:3]).sum() if ours[3] else 1e9
            if seat[y, x, 3]:
                d_rock = np.abs(c - seat[y, x, :3]).sum()
                if d_rock <= (ROCK_BARE if not ours[3] else ROCK) and d_rock < d_ours:
                    continue
                if not ours[3]:
                    rock_bad += 1
            if ours[3] and np.sqrt(((c - ours[:3]) ** 2).sum()) <= KEPT:
                h = hexc(ours[:3])
                out_hex[(x, y)] = h
                out_kind[(x, y)] = kind_at[y, x]
            else:
                new[(x, y)] = c
            if ours[3]:
                out_part[(x, y)] = int(part[y, x])
            else:
                k = int(np.argmin((fxs - x) ** 2 + (fys - y) ** 2))
                out_part[(x, y)] = int(part[fys[k], fxs[k]])
    # What he painted anew: his flat colours under the JPEG's noise, each cell's group of near colours (within
    # SAME of the group's mean) taken as one colour of his, our colour where it is one of ours (within OURS), else
    # the group's mean; what it follows (skin, hair, eyes or fixed) is what the nearest of our colours follows.
    groups = []
    for c in sorted(new.values(), key=lambda c: (c.sum(), tuple(c))):
        for g_ in groups:
            if np.sqrt(((c - g_[0] / g_[1]) ** 2).sum()) <= SAME:
                g_[0] += c
                g_[1] += 1
                break
        else:
            groups.append([c.copy(), 1])
    means = np.array([g_[0] / g_[1] for g_ in groups])
    for p, c in new.items():
        mean = means[int(np.argmin(((means - c) ** 2).sum(axis=1)))]
        near = int(np.argmin(((pal - mean) ** 2).sum(axis=1)))
        out_hex[p] = pal_hex[near] if np.sqrt(((pal[near] - mean) ** 2).sum()) <= OURS else hexc(np.round(mean))
        out_kind[p] = colour_kind[pal_hex[near]]
    # The rock lines up: none of his cells over our rock where we have no figure is far from its colour.
    assert rock_bad < 20, f'{rock_bad} cells over the rock are not the rock: the picture no longer lines up'

    xs = [p[0] for p in out_hex]
    ys = [p[1] for p in out_hex]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    keys = sorted(set((out_hex[p], out_kind[p]) for p in out_hex))
    if len(keys) > len(CHARS):
        raise ValueError(f'{len(keys)} colours')
    ch = {k: CHARS[n] for n, k in enumerate(keys)}
    rows, parts = [], []
    for y in range(y0, y1 + 1):
        rows.append(''.join(ch[(out_hex[(x, y)], out_kind[(x, y)])] if (x, y) in out_hex else '.' for x in range(x0, x1 + 1)))
        parts.append(''.join(chr(97 + out_part[(x, y)]) if (x, y) in out_hex else '.' for x in range(x0, x1 + 1)))

    lines = [
        "// The owner's broad man reading on the bulky body, his whole frame (docs/reference/bulky-read-owner-reference.jpg,",
        '// tools/refs/bulky-read-from-ref.py): broadRead.ts shows it in place of our pieces.',
        '// Generated: rerun the script to change it.',
        '',
        "export type BroadReadKind = 'skin' | 'hair' | 'eye' | 'fixed';",
        '',
        '/** His frame: `at` the fine pixel of its first row\'s first cell; `parts` the body part of each pixel (PARTS index + 97). */',
        'export const BROAD_READ: { at: [number, number]; rows: string[]; parts: string[]; colors: Record<string, string>; kinds: Record<string, BroadReadKind> } = {',
        f'  at: [{x0}, {y0}],',
        '  rows: [',
        *[f"    '{r}'," for r in rows],
        '  ],',
        '  parts: [',
        *[f"    '{r}'," for r in parts],
        '  ],',
        '  colors: {',
        *[f"    {json.dumps(ch[k])}: '{k[0]}'," for k in keys],
        '  },',
        '  kinds: {',
        *[f"    {json.dumps(ch[k])}: '{k[1]}'," for k in keys],
        '  },',
        '};',
        '',
    ]
    with open(out_ts, 'w', newline='\n', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    if study:
        os.makedirs(study, exist_ok=True)
        ours = np.zeros((g, g, 4), np.uint8)
        for (x, y), h in out_hex.items():
            ours[y, x, :3] = [int(h[k:k + 2], 16) for k in (1, 3, 5)]
            ours[y, x, 3] = 255
        Image.fromarray(ours).save(os.path.join(study, 'his-frame.png'))
        np.save(os.path.join(study, 'his-cells.npy'), his)
    print(f'{len(out_hex)} pixels, {len(keys)} colours, rock cells off: {rock_bad}')


if __name__ == '__main__':
    main()
