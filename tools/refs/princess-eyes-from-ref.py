"""The owner's princess's eyes and brows (docs/reference/princess-owner-reference.jpg) as the 'noble' eye shape.

His princess is drawn at our scale (tools/refs/princess_ref.py: one of his pixels is one fine pixel
of ours), so her eyes are lifted 1:1: every pixel below is one of his, in his colour (the palette's
colour where it is within a JPEG step of it, princess_ref.PALETTE_HEX; else his pixel as it is, as
her violets, which he used too few times to be in the palette; colours a JPEG step apart merged into
the one he used most here).

In his pixels (x, y), her face:

  row 17  her brows, right over the lash, in a soft rose: near x 52-54, far x 57-58
  row 18  her near lash, black, x 49-52, its inner end x 53 violet; its outer flick x 48, a dark
          plum; the far lash x 57 violet, 58 black, and her face line at 59
  row 19  the near eye: x 49 the lash coming down, 50 a pale lilac light, 51 violet, 52 dark violet,
          53 the lash's inner corner; the far eye: 57 dark violet, 58 violet, 59 her face line
  row 20  x 50 white, 51-52 violet (49 and 53 are her skin: the face's); the far eye: 57 violet,
          58 a pale lilac light, 59 her face line

Her eye is three rows tall (lash, then two rows of iris and lights), as our template's is, and her
near eye's first lash column is our template's near-eye column ex (x 49 = ex): her lash on the
template's lash row (ny), her lights and iris on its two rows under it. Her far eye's x 57-59 are the
template's three far columns: on her own face shape ('noble', tools/refs/princess-face-from-ref.py) at
ex + 8 as she has it; on our wider faces at the template's far-eye place, ex + 9. Her flick is one
column before ex, where our female lashes flick; her brows on the row over the lash (ny - 1).

The cells carry the template's letters, so the face, the eye options' code and Ocular Surge read them as
they read ours:

  L  her lash (black; its violet inner ends; her face line at the far eye)
  w  her white     h  her pale lilac lights
  d  her dark violet     i  her violet
  o D s b l   skin: no pixel of hers is painted there; the face's own skin shows

Her violets, lights and the violet ends of her lash are the colours her iris moves (NOBLE_IRIS_TINTED):
the player's eye colour moves them as far as it moves her violet; her black, white and flick stay.
Two lid states the game needs that his picture does not show are made of his own pixels:

  lowered  (reading) her lash comes down a row, over her lights and dark violet; under it the bottom
           row of her eye as he drew it, white and violet, the gaze down
  closed   (knocked out) her lash comes down a row; under it the face's skin

Her brows and flick stay with her lash in all three (the flick a row down with it).

It writes, in <out>:

  eyes@16.png   her eyes on our template's cells, open, lowered and closed, at 16x (grey: the face's skin)
  hers@16.png   his pixels there (x 46-61, rows 15-23), at 16x

and, with a third argument, the game's module (src/sprite/princessEyeArt.ts). The same picture always
gives the same bytes. Run from the repository root with python3 -I:

  python3 -I tools/refs/princess-eyes-from-ref.py docs/reference/princess-owner-reference.jpg <out> src/sprite/princessEyeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import princess_ref as P  # noqa: E402

# The near eye's first column, the far eye's and the lash row, in his pixels.
EX, FX, NY = 49, 57, 18

# Our template's letters for each eye cell and his pixel there (None: skin, nothing painted), and the
# flick (his pixel, at a column and row off the near eye's first cell and the lash row).
_LASH_N = [(49, 18), (50, 18), (51, 18), (52, 18), (53, 18)]
_LASH_F = [(57, 18), (58, 18), (59, 18)]
OPEN = {
    'near': (['LLLLL', 'LhidL', 'swiib'], [_LASH_N,
                                           [(49, 19), (50, 19), (51, 19), (52, 19), (53, 19)],
                                           [None, (50, 20), (51, 20), (52, 20), None]]),
    'far': (['LLL', 'diL', 'iho'], [_LASH_F,
                                    [(57, 19), (58, 19), (59, 19)],
                                    [(57, 20), (58, 20), None]]),
    'flick': ((-1, 0), (48, 18)),
}
LOWERED = {
    'near': (['bbbbb', 'LLLLL', 'swiib'], [[None] * 5, _LASH_N, [None, (50, 20), (51, 20), (52, 20), None]]),
    'far': (['bbb', 'LLL', 'iho'], [[None] * 3, _LASH_F, [(57, 20), (58, 20), None]]),
    'flick': ((-1, 1), (48, 18)),
}
CLOSED = {
    'near': (['bbbbb', 'LLLLL', 'sbbbb'], [[None] * 5, _LASH_N, [None] * 5]),
    'far': (['bbb', 'LLL', 'bbo'], [[None] * 3, _LASH_F, [None] * 3]),
    'flick': ((-1, 1), (48, 18)),
}
STATES = (('open', OPEN), ('lowered', LOWERED), ('closed', CLOSED))
# Her brows: (columns, rows) off each eye's first cell and the lash row, and his pixels.
BROWS = {
    'near': ((3, -1), [[(52, 17), (53, 17), (54, 17)]]),
    'far': ((0, -1), [[(57, 17), (58, 17)]]),
}
IRIS_AT = (51, 19)  # her violet: the colour the player's eye colour replaces
# A lash colour this far from grey (max - min channel) is her lash's violet end, which her iris moves;
# her black (and her plum flick) are nearer grey and stay.
VIOLET_CHROMA = 55


def his_colours():
    """His pixels in his colours: the palette's where within a JPEG step, else as they are."""
    N = P.native()
    q = P.quantize(N)
    return np.where((np.abs(q - N).max(-1) <= 8)[..., None], q, N)


def main():
    src, outdir = sys.argv[1], sys.argv[2]
    if os.path.abspath(src) != os.path.abspath(P.REF):
        raise SystemExit(f'expected {P.REF}')
    ts = sys.argv[3] if len(sys.argv) > 3 else None
    os.makedirs(outdir, exist_ok=True)
    nat = his_colours()

    # Every cell used, so colours a JPEG step apart become the one he used most here.
    cells = []
    for _, st in STATES:
        for side in ('near', 'far'):
            cells += [p for row in st[side][1] for p in row if p]
        cells.append(st['flick'][1])
    for _, grid in BROWS.values():
        cells += [p for row in grid for p in row]
    cells.append(IRIS_AT)
    raw = [tuple(int(v) for v in nat[y, x]) for x, y in cells]
    counts = {}
    for c in raw:
        counts[c] = counts.get(c, 0) + 1
    reps = sorted(counts, key=lambda c: (-counts[c], c))
    merged = {}  # each colour to the commonest colour (a centre) within 8 of it
    for c in reps:
        merged[c] = next((r for r in reps if merged.get(r) == r and max(abs(c[k] - r[k]) for k in range(3)) <= 8), c)
    col = lambda p: P.rgb_hex(merged[tuple(int(v) for v in nat[p[1], p[0]])])

    # Her hair's pink that her brows follow: the commonest of his colours in her hair (the hair parts'
    # pink pixels); the player's hair colour moves her brows as far as it moves it.
    pm = P.part_map()
    hair = np.isin(pm, [P.PARTS.index('hair_front'), P.PARTS.index('hair_back')]) & (P.family(P.native()) == P.FAMILIES.index('hair'))
    hc, hn = np.unique(nat[hair], axis=0, return_counts=True)
    brow_hair = P.rgb_hex(hc[int(np.argmax(hn))])

    seen = []  # (char, hex), in order of first use
    keys = 'abcefghjkmnpqrtuvxyz'

    def key(h):
        for k, v in seen:
            if v == h:
                return k
        seen.append((keys[len(seen)], h))
        return seen[-1][0]

    def enc(grid):
        return [''.join(key(col(p)) if p else '.' for p in row) for row in grid]

    states = {}
    tinted = set()
    for name, st in STATES:
        states[name] = {side: (st[side][0], enc(st[side][1])) for side in ('near', 'far')}
        (fx, fy), fp = st['flick']
        states[name]['flick'] = ((fx, fy), key(col(fp)))
        for side in ('near', 'far'):
            letters, grid = st[side]
            for r, row in enumerate(grid):
                for c, p in enumerate(row):
                    if not p:
                        continue
                    h = col(p)
                    rgb = P.rgb(h)
                    if letters[r][c] in 'dih' or (letters[r][c] == 'L' and rgb.max() - rgb.min() >= VIOLET_CHROMA):
                        tinted.add(key(h))
    brows = {side: (at, enc(grid)) for side, (at, grid) in BROWS.items()}
    iris = col(IRIS_AT)
    pal = dict(seen)
    tinted = ''.join(k for k, _ in seen if k in tinted)

    # Previews: each state's near and far eye (far at ex + 8, as on her face), brows and flick.
    k = 16
    sheet = Image.new('RGB', (3 * 14 * k, 6 * k), (255, 255, 255))
    px = sheet.load()

    def cell(ox, x, y, h):
        rgb = tuple(int(v) for v in P.rgb(h)) if h else (200, 200, 200)
        for yy in range(k):
            for xx in range(k):
                px[ox + x * k + xx, y * k + yy] = rgb

    for si, (name, _) in enumerate(STATES):
        ox = si * 14 * k
        for side, x0 in (('near', 2), ('far', 10)):
            letters, rows = states[name][side]
            for r in range(3):
                for c in range(len(rows[r])):
                    cell(ox, x0 + c, r + 2, pal.get(rows[r][c]))
            at, brow = brows[side]
            for c, ch in enumerate(brow[0]):
                cell(ox, x0 + at[0] + c, 2 + at[1], pal[ch])
        (fx, fy), fch = states[name]['flick']
        cell(ox, 2 + fx, 2 + fy, pal[fch])
    sheet.save(os.path.join(outdir, 'eyes@16.png'))
    crop = P.native()[15:24, 46:62].astype(np.uint8)
    Image.fromarray(crop).resize((16 * k, 9 * k), Image.NEAREST).save(os.path.join(outdir, 'hers@16.png'))

    if not ts:
        return
    out = [
        "// The owner's princess's eyes, his pixels and colours (tools/refs/princess-eyes-from-ref.py from",
        '// docs/reference/princess-owner-reference.jpg, drawn at our scale). Generated: rerun the script to change it.',
        '',
        "import type { PaintedEye } from './eyeArt';",
        '',
        '/** His colours, one character each. */',
        'export const NOBLE_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {kk}: '{v}'," for kk, v in seen]
    out += ['};', '']
    docs = {
        'open': 'His pixels: her black lash with its violet inner end over her pale lilac light, violet, dark violet and the lash coming down at both corners; under them her white and violet. The far eye: its violet and black lash, dark violet and violet, violet and pale lilac light, closed by her face line.',
        'lowered': 'Reading: her lash comes down a row, over her lights and dark violet; under it the bottom row of her eye, the gaze down.',
        'closed': 'Knocked out: her lash comes down a row; under it the face\'s skin.',
    }
    out += ["/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out), on the template's own eye cells and rows,",
            "and her lash's outer flick at (columns, rows) off the near eye's first cell and the lash row. */",
            "export const NOBLE_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye; flick: { at: readonly [number, number]; ch: string } }> = {"]
    for name, _ in STATES:
        out += [f'  /** {docs[name]} */', f'  {name}: {{']
        for side in ('near', 'far'):
            letters, rows = states[name][side]
            out += [f'    {side}: {{', f'      letters: [{", ".join(repr(r) for r in letters)}],', f'      rows: [{", ".join(repr(r) for r in rows)}],', '    },']
        (fx, fy), fch = states[name]['flick']
        out += [f"    flick: {{ at: [{fx}, {fy}], ch: '{fch}' }},", '  },']
    out += ['};', '',
            "/** Her brows, his pixels in a soft rose: from `at` (columns, rows) off each eye's first cell and the lash row ('.' none). */",
            "export const NOBLE_BROWS: Record<'near' | 'far', { at: readonly [number, number]; rows: string[] }> = {"]
    for side in ('near', 'far'):
        at, rows = brows[side]
        out += [f'  {side}: {{ at: [{at[0]}, {at[1]}], rows: [{", ".join(repr(r) for r in rows)}] }},']
    out += ['};', '',
            "/** Her violet, the colour her iris follows: the player's eye colour moves her iris as far. */",
            f"export const NOBLE_IRIS = '{iris}';", '',
            "/** Her colours that move with the eye colour: her violets, her lights and her lash's violet ends. */",
            f"export const NOBLE_IRIS_TINTED = '{tinted}';", '',
            "/** Her hair's pink (the commonest colour of her hair), which her brows follow: the hair colour moves them as far. */",
            f"export const NOBLE_BROW_HAIR = '{brow_hair}';", '']
    tmp = ts + '.tmp'
    with open(tmp, 'w') as f:
        f.write('\n'.join(out))
    os.replace(tmp, ts)


if __name__ == '__main__':
    main()
