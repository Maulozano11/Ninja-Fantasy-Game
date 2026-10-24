"""The owner's knights: their eyes (the 'knight' eye shape), from docs/reference/three-knights-owner-reference.jpg,
the paladin's head shrunk to our Roman head's size and cleaned (tools/refs/knights_ref.py). On each eye his
black lash line (L), the white glint under it (w) and his red iris (d: the eye colour moves it); what else is
in the eye's cells stays his (the lash's dark reds, kept as his line's letter L). Lowered (reading) and closed
(knocked out), his lash line stays and the row under it is the face's skin.

  python3 -I tools/refs/knight-eyes-from-ref.py src/sprite/knightEyeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import knights_ref as K  # noqa: E402


def build():
    rgb, m, lab = K.our_frame('paladin')
    ny = K.FACE_ANCHOR[1]
    colors = {}
    chars = iter('abcdefhijkmnpqrstuvxyz')

    def ch(c):
        h = K.hexc(c)
        for k, v in colors.items():
            if v == h:
                return k
        k = next(chars)
        colors[k] = h
        return k

    eyes = {}
    for side, e in (('near', 0), ('far', 1)):
        col0 = K.FACE_ANCHOR[0] + K.EYE_COLS[e]
        letters, rows = [], []
        for r, y in enumerate((ny, ny + 1)):
            lt, rw = '', ''
            for x in range(col0, col0 + K.EYE_W[e]):
                c = rgb[y, x]
                k = K.kind(c)
                if k == 'white' or (k == 'steel' and K.luma(c) > 150):
                    lt += 'w'
                    rw += ch(c)
                elif k == 'line' or (r == 0 and k in ('red', 'dark', 'brown')):
                    lt += 'L'
                    rw += ch(c)
                elif r == 1 and k in ('red', 'flame') or (r == 1 and k == 'brown'):
                    lt += 'd'
                    rw += ch(c)
                else:
                    lt += 'b'
                    rw += '.'
            letters.append(lt)
            rows.append(rw)
        eyes[side] = (letters, rows)
    irises = [rows[1][i] for letters, rows in eyes.values() for i in range(len(letters[1])) if letters[1][i] == 'd']
    iris = colors[max(sorted(set(irises)), key=irises.count)]

    def shut(e):
        letters, rows = e
        l2 = [letters[0].replace('w', 'L').replace('d', 'L'), 'b' * len(letters[1])]
        r2 = [rows[0], '.' * len(rows[1])]
        return l2, r2

    out = [K.header('knight-eyes-from-ref.py', "The owner's knights' eyes"), '', "import type { PaintedEye } from './eyeArt';", '',
           '/** His colours, one character each. */', 'export const KNIGHT_EYE_COLORS: Record<string, string> = {']
    out += [f"  {k}: '{v}'," for k, v in colors.items()]
    out += ['};', '', '/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */',
            "export const KNIGHT_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {"]
    for state, doc in (('open', 'His eyes as he drew them: the lash line on the anchor row, the glint and the red iris under it.'),
                       ('lowered', 'Reading: his lash line, the eye under it gone under the lowered lid.'),
                       ('closed', "Knocked out: his lash line over the shut eye; under it the face's skin.")):
        out.append(f'  /** {doc} */')
        out.append(f'  {state}: {{')
        for side in ('near', 'far'):
            letters, rows = eyes[side] if state == 'open' else shut(eyes[side])
            out.append(f'    {side}: {{')
            out.append('      letters: [' + ', '.join(f"'{r}'" for r in letters) + '],')
            out.append('      rows: [' + ', '.join(f"'{r}'" for r in rows) + '],')
            out.append('    },')
        out.append('  },')
    out += ['};', '', "/** The colour his iris is drawn in: the player's eye colour moves it as far. */", f"export const KNIGHT_IRIS = '{iris}';", '']
    return '\n'.join(out)


if __name__ == '__main__':
    K.run(sys.argv, build)
