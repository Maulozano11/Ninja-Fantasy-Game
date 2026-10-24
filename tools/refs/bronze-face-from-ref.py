"""The owner's bronze warrior's face and eyes (docs/reference/bronze-warrior-owner-reference.jpg) as the 'hoplite' face and eye shapes.

His face, brought down at the head's scale (tools/refs/bronze_ref.py: the size of his Roman head in the game,
his black line and his red eyes kept): his skull, ear, cheeks, jaw, nose and mouth, his neck under the chin,
and his eyes. The face piece is continued where his picture hides it (the forehead under the diadem, the
skull under the hair, the neck under the scarf), so with other hair or none it is still his head. It is
stamped on our face template's anchor (body.ts faceAnchor), as his Roman head is.

His eyes are also the 'hoplite' eye shape, cell by cell where they are on his face, with the template's
letters (L his lash line, w his white, i his red, d his dark red, s the face's skin), and the two lid states
the game needs, made of his own pixels as the Roman eyes' are:
  lowered  (reading) his lash line one row lower, over the top of the eye
  closed   (knocked out) his lash line over the shut eye, under it the face's skin

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/bronze-face-from-ref.py src/sprite/hopliteHeadArt.ts [study.png]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bronze_ref as R  # noqa: E402


def eyes(m, c):
    """His eyes on the face piece: {'near'|'far': (x0, y0, rows of letters, rows of his colours)} in our frame,
    each from his lash line above it to its last row of white or red."""
    eye = np.zeros(m.shape, bool)
    for y, x in zip(*np.nonzero(m)):
        if R.material(c[y, x], 'face') in ('red', 'white'):
            eye[y, x] = True
    ys, xs = np.nonzero(eye)
    cols = sorted(set(xs))
    # the two eyes: the columns split at the widest gap
    gaps = [(cols[k + 1] - cols[k], k) for k in range(len(cols) - 1)]
    _, k = max(gaps)
    out = {}
    for side, (lo, hi) in (('near', (cols[0], cols[k])), ('far', (cols[k + 1], cols[-1]))):
        sel = (xs >= lo) & (xs <= hi)
        y0, y1 = ys[sel].min() - 1, ys[sel].max()
        x0, x1 = lo, hi
        out[side] = (int(x0), int(y0), int(x1), int(y1))
    return out


LETTER = {'line': 'L', 'red': 'i', 'white': 'w', 'skin': 's', 'dark': 'd'}


def main(out, study=None):
    a, lab = R.load()
    m, c, isl = R.piece(a, lab, 'face')
    text = R.module(R.header('bronze-face-from-ref.py', "The owner's bronze warrior's face and eyes (face and eye shape 'hoplite').", f' {out}'),
                    [('HOPLITE_HEAD', (m, c, isl), "His head, skull to neck: stamped on the face anchor.", 'face')], 'HOPLITE_HEAD',
                    {'HOPLITE_SKIN': R.middle_colour({'face': (m, c, isl)}, ['face'], ('skin',))}, painted='./painted')
    E = eyes(m, c)
    reds = sorted({R.hexc(c[y, x]) for y, x in zip(*np.nonzero(m)) if R.material(c[y, x], 'face') == 'red'}, key=lambda h: -R.luma(np.array([int(h[k:k + 2], 16) for k in (1, 3, 5)], float)))
    colors = {}

    def ch(hexv):
        if hexv not in colors:
            colors[hexv] = R.CHARS[len(colors)]
        return colors[hexv]

    states = {'open': {}, 'lowered': {}, 'closed': {}}
    nx, ny = R.ANCHOR
    at = {}
    for side, (x0, y0, x1, y1) in E.items():
        letters, rows = [], []
        for y in range(ny, y1 + 1):
            lr, rr = '', ''
            for x in range(x0, x1 + 1):
                if y < y0 or not m[y, x]:
                    lr += '.'
                    rr += '.'
                    continue
                mat = R.material(c[y, x], 'face')
                lt = LETTER.get(mat, 's')
                if lt == 'i' and R.hexc(c[y, x]) != reds[0]:
                    lt = 'd'
                lr += lt
                rr += '.' if lt == 's' else ch(R.hexc(c[y, x]))
            letters.append(lr)
            rows.append(rr)
        at[side] = x0 - nx
        states['open'][side] = (letters, rows)
        # lowered: his lash line a row lower over the eye's top row; closed: his lash line, the skin under it
        lash = y0 - ny
        low_l = [list(r) for r in letters]
        low_r = [list(r) for r in rows]
        if lash + 1 < len(letters):
            for i in range(len(letters[lash])):
                if letters[lash][i] == 'L' and letters[lash + 1][i] != '.':
                    low_l[lash + 1][i] = 'L'
                    low_r[lash + 1][i] = rows[lash][i]
        states['lowered'][side] = ([''.join(r) for r in low_l], [''.join(r) for r in low_r])
        cl_l = [list(r) for r in letters]
        cl_r = [list(r) for r in rows]
        for j in range(lash + 1, len(letters)):
            for i in range(len(letters[j])):
                if letters[j][i] in 'wid':
                    # the skin under the eye: his nearest skin pixel below it on the face
                    yy = ny + j
                    while yy < m.shape[0] and not (m[yy, x0 + i] and R.material(c[yy, x0 + i], 'face') == 'skin'):
                        yy += 1
                    cl_l[j][i] = 's'
                    cl_r[j][i] = ch(R.hexc(c[yy, x0 + i]))
        states['closed'][side] = ([''.join(r) for r in cl_l], [''.join(r) for r in cl_r])
    lines = [text, "import type { PaintedEye } from './eyeArt';", '']
    lines.insert(1, '')
    text = text.replace("import type { PaintedPiece } from './painted';", "import type { PaintedEye } from './eyeArt';\nimport type { PaintedPiece } from './painted';")
    t = [text]
    t.append("/** His eyes' colours, one character each (his pixels on his face). */")
    t.append('export const HOPLITE_EYE_COLORS: Record<string, string> = {')
    for hexv, k in colors.items():
        t.append(f"  {k}: '{hexv}',")
    t += ['};', '']
    t.append("/** His eyes in each lid state, stamped on the template's eye cells from the anchor's row (body.ts drawFace). */")
    t.append("export const HOPLITE_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {")
    for state, sides in states.items():
        t.append(f'  {state}: {{')
        for side in ('near', 'far'):
            letters, rows = sides[side]
            t.append(f'    {side}: {{')
            t.append('      letters: [' + ', '.join(f"'{r}'" for r in letters) + '],')
            t.append('      rows: [' + ', '.join(f"'{r}'" for r in rows) + '],')
            t.append('    },')
        t.append('  },')
    t += ['};', '']
    t.append("/** Where his eyes start, columns from the anchor (body.ts PaintedHead ex, fx). */")
    t.append(f"export const HOPLITE_EYE_AT = {{ ex: {at['near']}, fx: {at['far']} }};")
    t.append('')
    t.append("/** The eye colour his red iris is: the player's eye colour moves his reds as far. */")
    t.append(f"export const HOPLITE_IRIS = '{reds[0]}';")
    t.append('')
    R.write(out, '\n'.join(t))
    if study:
        R.study_sheet(a, lab, {'face': (m, c, isl)}, study)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
