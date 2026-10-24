"""The owner's Lyra's eyes and brows, from his picture of her at our game's scale, as the 'keen' eye shape.

docs/reference/lyra-game-scale-owner-reference.jpg (1932x1932) is his Lyra drawn at OUR sprite scale:
one of his pixels (19.32 picture pixels, phase 0, the same grid as his Aiden) is one fine pixel of ours.
So her eyes are lifted 1:1: every pixel below is one of his, in his colour (the median of the block's
inside; colours a JPEG step apart, such as his blacks, are merged into the one he used most here).

In his pixels (x, y), her face:

  row 17  her brows, right over the lash: near x 52-55 (dark red-browns), far x 58
  row 18  her near lash, black, x 51-54; the far eye's lash x 57 (brown) and 58 (black), his face line at 59
  row 19  under the near lash: x 51 the lash's brown corner, 52 white, 53 the iris's green, 54 its dark
          green; the far eye: 57 white, 58 dark green, 59 his face line
  row 20  skin

Her eye is two rows tall (lash, then one row of white and iris), as his Aiden's is. On our face
template (five near-eye columns from the template's near-eye column ex, three far from fx, three rows
from the lash row ny) her near eye starts at ex: x 51-55 are the five near columns, so her mouth (x 55-56,
row 23) falls where the template's mouth is (ex+4..5). Her far eye's x 57-59 are the three far columns:
on our wider face it keeps the template's far-eye place (her far eye sits two columns closer in her
smaller head). Rows 18-20 are the template's three rows; her brows are on the row above (ny - 1).

The cells carry the template's letters, so the face, the eye options' code and Ocular Surge read them as
they read ours:

  L  her lash (and his face line where it closes the far eye)    w  her white
  d  her dark green     i  her green   (the iris: moves the way the player's eye colour moves her green)
  o D s b l   skin: no pixel of hers is painted there; the face's own skin shows (her skin shades
              there are 's', as the template's)

and two lid states the game needs that his picture does not show, made of his own pixels:

  lowered  (reading) her lash comes down a row, over where the white and iris were; skin above it
  closed   (knocked out) the same, with her lash's brown corner turning down under its outer end

Her brows stay where they are in all three.

It writes, in <out>:

  eyes@16.png   her eyes on our template's cells, open, lowered and closed, at 16x (grey: the face's skin)
  hers@16.png   his pixels there (x 48-61, rows 14-27), at 16x

and, with a third argument, the game's module (src/sprite/lyraEyeArt.ts). The same picture always
gives the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/lyra-eyes-from-ref.py docs/reference/lyra-game-scale-owner-reference.jpg <out> src/sprite/lyraEyeArt.ts
"""

import os
import sys

import numpy as np
from PIL import Image

PITCH = 19.32
PHASE = (0.0, 0.0)

# The near eye's first column and the lash row, in his pixels.
EX, NY = 51, 18
FX = 57

# Our template's letters for each eye cell and his pixel there (None: skin, nothing painted).
OPEN = {
    'near': (['LLLLs', 'Lwidb', 'sbbbb'], [[(51, 18), (52, 18), (53, 18), (54, 18), None],
                                           [(51, 19), (52, 19), (53, 19), (54, 19), None],
                                           [None] * 5]),
    'far': (['LLL', 'wdL', 'bso'], [[(57, 18), (58, 18), (59, 18)],
                                    [(57, 19), (58, 19), (59, 19)],
                                    [None] * 3]),
}
LOWERED = {
    'near': (['ssssb', 'LLLLs', 'sbbbb'], [[None] * 5, [(51, 18), (52, 18), (53, 18), (54, 18), None], [None] * 5]),
    'far': (['bbb', 'LLL', 'bso'], [[None] * 3, [(57, 18), (58, 18), (59, 18)], [None] * 3]),
}
CLOSED = {
    'near': (['ssssb', 'LLLLs', 'Lbbbb'], [[None] * 5, [(51, 18), (52, 18), (53, 18), (54, 18), None], [(51, 19), None, None, None, None]]),
    'far': (['bbb', 'LLL', 'bso'], [[None] * 3, [(57, 18), (58, 18), (59, 18)], [None] * 3]),
}
# Her brows: (columns, rows) off each eye's first cell and the lash row, and his pixels.
BROWS = {
    'near': ((1, -1), [[(52, 17), (53, 17), (54, 17), (55, 17)]]),
    'far': ((1, -1), [[(58, 17)]]),
}
IRIS_AT = (53, 19)  # her green: the colour the player's eye colour replaces
# Her hair's mid red (the most common colour of her hair across the crown, x 44-60, rows 8-16), which
# her brows are drawn in the reds of: the hair colour moves them as far.
HAIR_BOX = (44, 8, 61, 17)


def native(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    n = int(round(a.shape[0] / PITCH))
    out = np.zeros((n, n, 3), np.int32)
    for j in range(n):
        for i in range(n):
            y0, y1 = int(round(PHASE[1] + j * PITCH)), int(round(PHASE[1] + (j + 1) * PITCH))
            x0, x1 = int(round(PHASE[0] + i * PITCH)), int(round(PHASE[0] + (i + 1) * PITCH))
            c = a[y0 + 4:y1 - 4, x0 + 4:x1 - 4].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return out


def hexof(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in c)


def main():
    src, outdir = sys.argv[1], sys.argv[2]
    ts = sys.argv[3] if len(sys.argv) > 3 else None
    os.makedirs(outdir, exist_ok=True)
    nat = native(src)

    # Every cell used, so colours a JPEG step apart become the one he used most here.
    cells = []
    for states in (OPEN, LOWERED, CLOSED):
        for _, grid in states.values():
            cells += [p for row in grid for p in row if p]
    for _, grid in BROWS.values():
        cells += [p for row in grid for p in row]
    cells.append(IRIS_AT)
    raw = [tuple(int(v) for v in nat[y, x]) for x, y in cells]
    counts = {}
    for c in raw:
        counts[c] = counts.get(c, 0) + 1
    reps = sorted(counts, key=lambda c: (-counts[c], c))
    merged = {}
    for c in reps:
        for r in reps:
            if max(abs(c[k] - r[k]) for k in range(3)) <= 4:
                merged[c] = r
                break
    col = lambda p: hexof(merged[tuple(int(v) for v in nat[p[1], p[0]])])

    hy0 = HAIR_BOX
    hair = nat[hy0[1]:hy0[3], hy0[0]:hy0[2]].reshape(-1, 3)
    reds = [tuple(c) for c in hair if c[0] > 140 and c[0] > c[1] + 60]
    hc = {}
    for c in reds:
        hc[c] = hc.get(c, 0) + 1
    brow_hair = hexof(sorted(hc, key=lambda c: (-hc[c], c))[0])

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

    states = {name: {side: (letters, enc(grid)) for side, (letters, grid) in st.items()} for name, st in (('open', OPEN), ('lowered', LOWERED), ('closed', CLOSED))}
    brows = {side: (at, enc(grid)) for side, (at, grid) in BROWS.items()}
    iris = col(IRIS_AT)
    pal = dict(seen)

    # Previews.
    k = 16
    sheet = Image.new('RGB', ((5 + 2 + 3) * k * 3 + 2 * k * 2, 5 * k), (255, 255, 255))
    px = sheet.load()
    for si, name in enumerate(('open', 'lowered', 'closed')):
        ox = si * (12 * k)
        for side, x0 in (('near', 0), ('far', 7)):
            letters, rows = states[name][side]
            at, brow = brows[side]
            for r in range(3):
                for c in range(len(rows[r])):
                    h = pal.get(rows[r][c])
                    rgb = tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) if h else (200, 200, 200)
                    for yy in range(k):
                        for xx in range(k):
                            px[ox + (x0 + c) * k + xx, (r + 2) * k + yy] = rgb
            for c, ch in enumerate(brow[0]):
                h = pal[ch]
                rgb = tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
                for yy in range(k):
                    for xx in range(k):
                        px[ox + (x0 + at[0] + c) * k + xx, (2 + at[1]) * k + yy] = rgb
    sheet.save(os.path.join(outdir, 'eyes@16.png'))
    crop = nat[14:28, 48:62].astype(np.uint8)
    Image.fromarray(crop).resize((14 * k, 14 * k), Image.NEAREST).save(os.path.join(outdir, 'hers@16.png'))

    if not ts:
        return
    out = [
        "// The owner's Lyra's eyes, his pixels and colours (tools/refs/lyra-eyes-from-ref.py from",
        '// docs/reference/lyra-game-scale-owner-reference.jpg, drawn at our scale). Generated: rerun the script to change it.',
        '',
        "import type { PaintedEye } from './eyeArt';",
        '',
        '/** His colours, one character each. */',
        'export const KEEN_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {kk}: '{v}'," for kk, v in seen]
    out += ['};', '']
    docs = {
        'open': 'His pixels: her black lash over a row of her lash\'s brown corner, white, green and dark green; the far eye\'s brown and black lash over its white and dark green, closed by his face line.',
        'lowered': 'Reading: her lash comes down a row, over where the white and iris were; skin above it.',
        'closed': 'Knocked out: her lash comes down a row, its brown corner turning down under its outer end.',
    }
    out += ["/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out), on the template's own eye cells and rows. */",
            "export const KEEN_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {"]
    for name in ('open', 'lowered', 'closed'):
        out += [f'  /** {docs[name]} */', f'  {name}: {{']
        for side in ('near', 'far'):
            letters, rows = states[name][side]
            out += [f'    {side}: {{', f'      letters: [{", ".join(repr(r) for r in letters)}],', f'      rows: [{", ".join(repr(r) for r in rows)}],', '    },']
        out += ['  },']
    out += ['};', '',
            "/** Her brows, his pixels in her hair's reds: from `at` (columns, rows) off each eye's first cell and the lash row ('.' none). */",
            "export const KEEN_BROWS: Record<'near' | 'far', { at: readonly [number, number]; rows: string[] }> = {"]
    for side in ('near', 'far'):
        at, rows = brows[side]
        out += [f'  {side}: {{ at: [{at[0]}, {at[1]}], rows: [{", ".join(repr(r) for r in rows)}] }},']
    out += ['};', '',
            "/** Her green, the colour her iris follows: the player's eye colour moves her iris as far. */",
            f"export const KEEN_IRIS = '{iris}';", '',
            "/** Her hair's mid red, which her brows are drawn in the reds of: the hair colour moves them as far. */",
            f"export const KEEN_BROW_HAIR = '{brow_hair}';", '']
    with open(ts, 'w') as f:
        f.write('\n'.join(out))


if __name__ == '__main__':
    main()
