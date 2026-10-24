"""The owner's katana from his Ren picture (docs/reference/ren-owner-reference.jpg): the Katana v2.

His Ren is our Ren painted over in his own pixels (tools/refs/ren_ref.py: one of his pixels is one fine
pixel of our sprites). He painted the katana "nuevo estilo v2" hanging from Ren's near fist across the
legs: a gold pommel cap, a grip wrapped in dark blue with a lit blue row, a gold cross-guard over dark
steel and a long straight blade in his blues with white glints, cut to a point. This script lifts it out
of his pixels, every pixel in his exact colour; the grip his fist hides is his wrap continued along the
sword's line, in his line (ren_ref.pieces).

Each of his colours is one of: the blade (his blues and white glints past the guard), the gold (the
pommel cap and the guard's gold), the wrap (the grip's blues and dark blues before the guard), the
steel (the guard's dark metal) or his black line. The item's colour slots move the blade, the gold and
the wrap; the steel and the line stay. His blade is painted in Ren's chakra blue (CHAKRA): a nichirin
blade (the default steel) moves from there to the wielder's chakra colour, so Ren's is his exactly.

It writes src/sprite/items/katanaV2Art.ts: the sword drawn at his angle, its pivot the cell under our
near hand joint (our fist holds it there as his does), so held at rest every pixel is his. With a
second argument, a folder, it writes his sword beside ours at 8x. The same picture always gives the
same bytes:

  python3 -I tools/refs/ren-katana-from-ref.py src/sprite/items/katanaV2Art.ts [studyDir]
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import ren_ref as R  # noqa: E402

# Ren's chakra colour (the blue burst's, src/sprite/chakra.ts): the colour his blade is painted for.
CHAKRA = '#36a0f0'
# The guard: the gold cross and the dark steel inside it (ren_ref.KATANA_DARK's second polygon).
GUARD = R.KATANA_DARK[1]


def main():
    out_ts = sys.argv[1]
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    P = R.pieces(a)
    m, c = P['katana']
    H, W = m.shape
    K = np.array([[R.kind(c[y, x]) for x in range(W)] for y in range(H)])
    guard = R.inside(GUARD, H, W)
    g0, _ = R.KATANA_GRIP
    # the sword's line: the main axis of the blade's pixels (past the guard)
    by, bx = np.nonzero(m & (np.mgrid[0:H, 0:W][1] > 44))
    pts = np.stack([bx + 0.5, by + 0.5])
    u = np.linalg.svd(pts - pts.mean(axis=1, keepdims=True), full_matrices=False)[0][:, 0]
    if u[0] < 0:
        u = -u
    angle = float(np.degrees(np.arctan2(u[1], u[0])))
    gy, gx = np.nonzero(guard & m)
    t_guard = ((gx + 0.5 - g0[0]) * u[0] + (gy + 0.5 - g0[1]) * u[1]).min()

    def part(y, x):
        k = K[y, x]
        if k == 'line':
            return 'line'
        if k == 'gold':
            return 'gold'
        t = (x + 0.5 - g0[0]) * u[0] + (y + 0.5 - g0[1]) * u[1]
        if guard[y, x]:
            return 'gold' if k == 'gold' else 'steel'
        if t < t_guard:
            return 'wrap'
        return 'blade'

    # One character per (part, colour): pack each part's colours on its own, so a blue of the wrap and
    # the same blue of the blade can follow their own slots.
    parts = {}
    for y, x in zip(*np.nonzero(m)):
        parts.setdefault(part(y, x), []).append((y, x))
    grid = np.full((H, W), '.', dtype='<U1')
    palette, of_part = {}, {}
    k = 0
    for name in ('line', 'steel', 'gold', 'wrap', 'blade'):
        seen = []
        for y, x in sorted(parts.get(name, [])):
            col = c[y, x]
            for ch, ref in seen:
                if np.abs(ref - col).max() <= 3:
                    grid[y, x] = ch
                    break
            else:
                ch = R.CHARS[k]
                k += 1
                seen.append((ch, col))
                palette[ch] = R.hexc(col)
                of_part[ch] = name
                grid[y, x] = ch
    yy, xx = np.nonzero(grid != '.')
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    rows = [''.join(grid[y, x0:x1]) for y in range(y0, y1)]
    pivot = (int(np.floor(R.JOINTS['handN'][0])) - x0, int(np.floor(R.JOINTS['handN'][1])) - y0)

    def base(name, want):
        found = sorted((float(R.luma(c[y, x][None])[0]), R.hexc(c[y, x])) for y, x in parts[name] if (c[y, x] == a[y, x]).all() and R.kind(c[y, x]) in want)
        return R.packed(found[len(found) // 2][1], {ch: h for ch, h in palette.items() if of_part[ch] == name})

    bases = {
        'KATANA_V2_BLADE': base('blade', ('blue',)),
        'KATANA_V2_GOLD': base('gold', ('gold',)),
        'KATANA_V2_WRAP': base('wrap', ('blue',)),
    }
    key = lambda q: q if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', q) else "'" + q + "'"
    chars = lambda name: ''.join(ch for ch in palette if of_part[ch] == name)
    out = [
        "// The owner's katana on his Ren (the Katana v2), his pixels (tools/refs/ren-katana-from-ref.py from",
        '// docs/reference/ren-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        'export interface PaintedKatana extends PaintedPiece {',
        '  /** The characters of the blade (his blues and white glints past the guard). */',
        '  blade: string;',
        "  /** The characters of the gold: the pommel's cap and the guard. */",
        '  gold: string;',
        "  /** The characters of the grip's wrap. */",
        '  wrap: string;',
        '}',
        '',
        '/** His middle blade blue, gold and wrap blue: the colours the colour slots turn his from. */',
    ]
    out += [f"export const {n} = '{v}';" for n, v in bases.items()]
    out += [
        '',
        "/** The chakra colour his blade is painted in (Ren's blue): a nichirin blade moves from it to the wielder's chakra. */",
        f"export const KATANA_V2_CHAKRA = '{CHAKRA}';",
        '',
        '/**',
        " * The sword as he painted it in Ren's near fist, hanging across the legs: drawn at his angle and",
        ' * pivoting on the cell under our near hand joint, so held at rest it is every pixel his. The grip',
        ' * his fist hides is his wrap continued along the sword, in his line.',
        ' */',
        'export const KATANA_V2: PaintedKatana = {',
        f'  pivot: [{pivot[0]}, {pivot[1]}],',
        f'  angle: {angle:.2f},',
        '  rows: [',
    ]
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {key(ch)}: '{h}'," for ch, h in palette.items()]
    out += ['  },', f"  blade: '{chars('blade')}',", f"  gold: '{chars('gold')}',", f"  wrap: '{chars('wrap')}',", '};', '']
    out.append("/** Where the sword's first row's first cell lands in our male idle frame 0, held at his angle. */")
    out.append(f'export const KATANA_V2_REST: [number, number] = [{x0 + R.OFFSET[0]}, {y0 + R.OFFSET[1]}];')
    out.append('')
    R.write(out_ts, '\n'.join(out))
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, P, ['katana'], os.path.join(study, 'katana@8.png'), (18, 46, 82, 96))
    print('angle', round(angle, 2), 'pivot', pivot, 'bases', bases, {n: len(chars(n)) for n in ('line', 'steel', 'gold', 'wrap', 'blade')})


if __name__ == '__main__':
    main()
