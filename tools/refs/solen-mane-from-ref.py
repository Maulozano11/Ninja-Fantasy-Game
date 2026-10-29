"""The owner's bronze warrior's mane, braid and diadem (docs/reference/bronze-warrior-repaint-owner-reference.jpg)
on Solen's head, as a hairstyle and an accessory.

The owner's decision (2026-10-29, D-T17): the bronze warrior IS Solen. His head in the game is Solen's (the
'founder' face, our standard eyes in his red, his skin), and what the repaint gave as his own head becomes
creator options for Solen's head: his long wavy black mane with the braid tied in bronze bands behind
(hair_solen_mane) and his bronze diadem across the brow (acc_solen_diadem). His pixels are his repaint's
(tools/refs/bronze-repaint-from-ref.py: one of his pixels one fine pixel of ours, his hair, braid and diadem cut
from it and continued where his face hid them), laid for Solen's head:

  - his head was smaller than ours (its top three rows lower, his chin on ours), and his fringe fell to his
    eyes: his mane is lifted LIFT rows, so his fringe clears Solen's eyes as it cleared his own, and the
    diadem and the braid with it, so they stay where he set them on the hair;
  - the crown is continued up to Solen's skull (SKULL: our male heads' outline, the same skull under the
    founder, roman, valiant and night faces, read off the game: per column, the head's first row from the
    face anchor), one row over it, by continuing his pixels: each column goes on upward as his rows below
    its top are, mirrored (his line left out), his line closing it; so no skull shows past his hair;
  - over the skull above the hairline (HAIRLINE) every pixel of Solen's head is his hair: a notch of his
    mane there (open on his smaller head) is filled with his hair beside it, so no skin shows through it;
  - the back part is the mane with the forehead between the fringe's strands filled in (the head's pixels
    from the hairline to the brow that his front leaves open, each the colour above it), as his Solen's hair
    is built (solen-hair-from-ref.py): drawn behind the head, it is also the head's outline there (the game
    trims our skull to it, items/hair.ts trimSkull), so no edge of ours shows past his hair, and a notch
    between his locks beside the head shows the background, not hair.

Both parts and the braid pivot on our face anchor (the near eye's lash start), as his Solen's hair does, so
they frame the eyes the same on every body and in every pose. The same picture always gives the same bytes.
Run from the repository root:

  python3 -I tools/refs/solen-mane-from-ref.py src/sprite/items/solenManeArt.ts [study.png]
"""

import importlib
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import bronze_ref as R  # noqa: E402

REPAINT = importlib.import_module('bronze-repaint-from-ref')

# How many rows his mane, braid and diadem are lifted on Solen's head.
LIFT = 3
# Our male heads' skull: the head's first row in each column from the face anchor (dx: dy), read off the game
# (src/sprite/compose.ts spriteLayers, the 'head.body' layer of the male idle frame 0 with no hair, against
# body.ts faceAnchor; the same for the founder, roman, valiant and night faces).
SKULL = {-7: -7, -6: -9, -5: -10, -4: -11, -3: -11, -2: -12, -1: -12, 0: -12, 1: -12, 2: -12, 3: -12, 4: -12, 5: -12,
         6: -11, 7: -11, 8: -10, 9: -9, 10: -7}
# How many rows over the skull's outline his hair's own line stands.
OVER = 1
# From this row (from the anchor) down to the brow (BROW) the head between his fringe's strands is the
# forehead, which shows; above it the skull is his hair everywhere.
HAIRLINE = -4
BROW = 0


def skull(x, y):
    """Whether a pixel of our frame is inside Solen's skull."""
    nx, ny = ANCHOR
    dx, dy = x - nx, y - ny
    return dx in SKULL and SKULL[dx] <= dy < BROW

ANCHOR = R.ANCHOR
NEAR4 = ((1, 0), (-1, 0), (0, 1), (0, -1))


def lifted(piece):
    m, c, isl = piece
    out_m = np.zeros_like(m)
    out_c = np.zeros_like(c)
    out_l = np.zeros_like(isl)
    out_m[:-LIFT] = m[LIFT:]
    out_c[:-LIFT] = c[LIFT:]
    out_l[:-LIFT] = isl[LIFT:]
    return out_m, out_c, out_l


def crown(m, c, isl, black):
    """His mane continued up to Solen's skull (module docstring)."""
    nx, ny = ANCHOR
    m, c, isl = m.copy(), c.copy(), isl.copy()
    new = np.zeros_like(m)
    for dx, top in sorted(SKULL.items()):
        x = nx + dx
        ys = [y for y in range(ny) if m[y, x]]
        if not ys:
            continue
        his_top = min(ys)
        target = ny + top - OVER
        if target >= his_top:
            continue
        # his colours in this column below his top, his line left out: what the new rows mirror
        src = [y for y in range(his_top, ny + 12) if m[y, x] and not isl[y, x]]
        if not src:
            continue
        for y in range(target, his_top):
            k = his_top - y
            cand = [q for q in src if q >= his_top + k - 1]
            q = cand[0] if cand else src[-1]
            m[y, x] = True
            c[y, x] = c[q, x]
            isl[y, x] = False
            new[y, x] = True
        m[target, x] = True
        c[target, x] = black
        isl[target, x] = True
    # a notch of his mane over the skull above the hairline: his hair beside it (the nearest of his pixels in
    # its row, his line left out), so no skin shows through it
    for dx in sorted(SKULL):
        x = nx + dx
        for y in range(ny + SKULL[dx], ny + HAIRLINE):
            if m[y, x]:
                continue
            xs = [p for p in range(x - 6, x + 7) if 0 <= p < 256 and m[y, p] and not isl[y, p]]
            if not xs:
                continue
            q = min(xs, key=lambda p: (abs(p - x), p))
            m[y, x] = True
            c[y, x] = c[y, q]
            isl[y, x] = False
            new[y, x] = True
    # his line closes the new rows: a new pixel with no hair beside it, or a new pixel beside the white
    for y, x in zip(*np.nonzero(new)):
        if isl[y, x]:
            continue
        if any(not m[y + dy, x + dx] for dy, dx in NEAR4):
            c[y, x] = black
            isl[y, x] = True
    return m, c, isl


def back_of(m, c, isl):
    """The back part: the mane with the forehead between the fringe's strands filled in (the skull's pixels from
    the hairline to the brow that the front leaves open)."""
    nx, ny = ANCHOR
    bm, bc = m.copy(), c.copy()
    for y in range(ny + HAIRLINE, ny + BROW):
        xs = np.nonzero(m[y])[0]
        if len(xs) < 2:
            continue
        for x in range(int(xs.min()), int(xs.max()) + 1):
            if m[y, x] or not skull(x, y):
                continue
            q = y - 1
            while q >= 0 and not (bm[q, x] and not isl[q, x]):
                q -= 1
            if q < 0:
                # (no hair above in this column: his nearest pixel of the mane in this row, his line left out)
                side = sorted((abs(int(p) - x), int(p)) for p in xs if not isl[y, p]) or [(0, int(xs[0]))]
                bc[y, x] = c[y, side[0][1]]
            else:
                bc[y, x] = bc[q, x]
            bm[y, x] = True
    return bm, bc


def part_ts(name, doc, rows, pivot, colours_const):
    out = [f'/** {doc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{pivot[0]}, {pivot[1]}],', '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', f'  colors: {colours_const},', '};', '']
    return out


def kind_ts(name, palette, piece):
    found = {h: R.material([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)], piece) for h in palette.values()}
    names = sorted(set(found.values()))
    out = [f"/** What each colour of {name} is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */",
           f"export const {name}_KIND: Record<string, {' | '.join(repr(n) for n in names)}> = {{"]
    out += [f"  '{h}': '{found[h]}'," for h in sorted(found)]
    out += ['};', '']
    return out


def main(out, study=None):
    col, on = REPAINT.his()
    pieces, who = REPAINT.ours()
    rep, own = REPAINT.build(col, on, pieces, who)
    # his black line in the repaint: the commonest line colour of his hair
    hm0, hc0, _ = rep['hair']
    black = np.array(R.commonest([q for q in zip(*np.nonzero(hm0)) if R.material(hc0[q], 'hair') == 'line'], hc0))
    hair = lifted(rep['hair'])
    braid = lifted(rep['braid'])
    diadem = lifted(rep['diadem'])
    hm, hc, hl = crown(*hair, black)
    bm, bc = back_of(hm, hc, hl)
    nx, ny = ANCHOR
    # the front and the back share one palette (the back adds no colour of its own)
    rows, origin, palette = R.pack(bc, bm)
    ox, oy = origin
    front_rows = [''.join(ch if hm[oy + j, ox + i] else '.' for i, ch in enumerate(rw)) for j, rw in enumerate(rows)]
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    line_chars = ''.join(ch for ch, h in palette.items() if R.material([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)], 'hair') == 'line')
    base = R.middle_colour({'hair': (hm, hc, hl)}, ['hair'], ('hair', 'navy', 'grey', 'purple'))
    band = R.middle_colour({'braid': braid}, ['braid'], ('warm',))
    gold = R.middle_colour({'diadem': diadem}, ['diadem'], ('warm',))
    t = [
        "// The owner's bronze warrior's mane, braid and diadem on Solen's head, his pixels (tools/refs/solen-mane-from-ref.py from",
        '// docs/reference/bronze-warrior-repaint-owner-reference.jpg). Generated: rerun the script to change it:',
        f'//   python3 -I tools/refs/solen-mane-from-ref.py {out}',
        '',
        "import type { PaintedPart } from './capeArt';",
        "import type { PaintedPiece } from '../painted';",
        '',
        '/** One character per colour of his (the front and the back share them). */',
        'const SOLEN_MANE_COLORS: Record<string, string> = {',
    ]
    t += [f"  {key(k)}: '{v}'," for k, v in palette.items()]
    t += ['};', '']
    t += part_ts('SOLEN_MANE_FRONT', "Every pixel of his mane over the head, lifted onto Solen's skull: his blue-blacks and his black line. Its pivot is the cell on our face anchor (the near eye's lash start).", front_rows, (nx - ox, ny - oy), 'SOLEN_MANE_COLORS')
    t += part_ts('SOLEN_MANE_BACK', "His mane with what the head hides filled in above the brow, drawn behind the head; also the head's outline there (the game trims our skull to it).", rows, (nx - ox, ny - oy), 'SOLEN_MANE_COLORS')
    t += kind_ts('SOLEN_MANE', palette, 'hair')
    t += ['/** His black line: kept as he drew it when the mane is recoloured. */', f"export const SOLEN_MANE_LINE = '{line_chars}';", '',
          "/** His middle blue-black: the colour slot's default; his other blue-blacks follow it. */", f"export const SOLEN_MANE_BASE = '{base}';", '']
    brows, borigin, bpal = R.pack(braid[1], braid[0])
    t += ['const SOLEN_BRAID_COLORS: Record<string, string> = {']
    t += [f"  {key(k)}: '{v}'," for k, v in bpal.items()]
    t += ['};', '']
    t += part_ts('SOLEN_MANE_BRAID', 'His braid and its bronze bands, behind the head and shoulders, lifted with the mane: pivot on the face anchor.', brows, (nx - borigin[0], ny - borigin[1]), 'SOLEN_BRAID_COLORS')
    t += kind_ts('SOLEN_MANE_BRAID', bpal, 'braid')
    t += ["/** His middle bronze of the braid's bands: the band colour slot's default. */", f"export const SOLEN_MANE_BAND = '{band}';", '']
    dm, dc, _ = diadem
    drows, dorigin, dpal = R.pack(dc, dm)
    t += [R.ts_piece('SOLEN_DIADEM', "His bronze diadem across the brow, lifted with the mane: stamped on the face anchor, over any hair.", drows, dorigin, dpal, (nx + 0.5, ny + 0.5), -90.0)]
    t += kind_ts('SOLEN_DIADEM', dpal, 'diadem')
    t += ["/** His middle bronze of the diadem: the colour slot's default. */", f"export const SOLEN_DIADEM_BRONZE = '{gold}';", '']
    R.write(out, '\n'.join(t))
    if study:
        k = 8
        box = (nx - 16, ny - 16, nx + 20, ny + 14)
        tiles = []
        for mm, cc in ((rep['hair'][0], rep['hair'][1]), (hm, hc), (bm, bc)):
            img = np.full((256, 256, 3), 235, np.uint8)
            img[mm] = cc[mm]
            tiles.append(Image.fromarray(img[box[1]:box[3], box[0]:box[2]]).resize(((box[2] - box[0]) * k, (box[3] - box[1]) * k), Image.NEAREST))
        s = Image.new('RGB', (sum(x.width for x in tiles) + 16 * len(tiles), tiles[0].height), 'white')
        x = 0
        for x_ in tiles:
            s.paste(x_, (x, 0))
            x += x_.width + 16
        s.save(study)
    print('front', int(hm.sum()), 'back', int(bm.sum()), 'braid', int(braid[0].sum()), 'diadem', int(dm.sum()), 'line', line_chars, 'base', base, 'band', band, 'gold', gold)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
