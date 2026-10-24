"""The owner's samurai: his eyes (the 'samurai' eye shape), from docs/reference/samurai-owner-reference.jpg,
his head shrunk to our Roman head's size and cleaned (tools/refs/samurai_ref.py). On each eye his heavy
black lash line (L), his white glint under it (w) and his pupil in the line (d: the eye colour moves it).
Lowered (reading) and closed (knocked out), his lash line stays and the glint is the face's skin; his pupil is
his line.

  python3 -I tools/refs/samurai-eyes-from-ref.py src/sprite/samuraiEyeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import samurai_ref as S  # noqa: E402


def build():
    rgb, label = S.game()
    ox, oy = S.OFFSET
    ny = S.FACE_ANCHOR[1]
    colors = {}
    chars = iter('abcdefhijkmnpqrstuvxyz')

    def ch(c):
        h = S.hexc(c)
        for k, v in colors.items():
            if v == h:
                return k
        k = next(chars)
        colors[k] = h
        return k

    eyes = {}
    for side, col0, w in (('near', S.FACE_ANCHOR[0] + S.EYE_COLS[0], S.EYE_W[0]), ('far', S.FACE_ANCHOR[0] + S.EYE_COLS[1], S.EYE_W[1])):
        letters, rows = [], []
        for y in (ny, ny + 1):
            lt, rw = '', ''
            for x in range(col0, col0 + w):
                c = rgb[y - oy, x - ox]
                k = S.kind(c)
                if (x, y) == S.PUPIL[side]:
                    lt += 'd'
                    rw += ch(c)
                elif k == 'line':
                    lt += 'L'
                    rw += ch(c)
                elif k == 'white':
                    lt += 'w'
                    rw += ch(c)
                else:
                    lt += 'b'
                    rw += '.'
            letters.append(lt)
            rows.append(rw)
        eyes[side] = (letters, rows)
    iris = colors[eyes['near'][1][0][S.PUPIL['near'][0] - S.FACE_ANCHOR[0] - S.EYE_COLS[0]]]

    def shut(e):
        letters, rows = e
        l2 = [letters[0].replace('d', 'L'), ''.join('b' if c == 'w' else c for c in letters[1])]
        r2 = [rows[0], ''.join('.' if letters[1][i] == 'w' else rows[1][i] for i in range(len(rows[1])))]
        return l2, r2

    out = [S.header('samurai-eyes-from-ref.py', "The owner's samurai eyes"), '', "import type { PaintedEye } from './eyeArt';", '',
           '/** His colours, one character each. */', 'export const SAMURAI_EYE_COLORS: Record<string, string> = {']
    out += [f"  {k}: '{v}'," for k, v in colors.items()]
    out += ['};', '', '/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */',
            "export const SAMURAI_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {"]
    for state, doc in (('open', 'His eyes as he drew them: the heavy lash line on the anchor row, his pupil in it, the glint under it.'),
                       ('lowered', 'Reading: his lash line, the glint gone under the lowered lid.'),
                       ('closed', 'Knocked out: his lash line over the shut eye; under it the face\'s skin.')):
        out.append(f'  /** {doc} */')
        out.append(f'  {state}: {{')
        for side in ('near', 'far'):
            letters, rows = eyes[side] if state == 'open' else shut(eyes[side])
            out.append(f'    {side}: {{')
            out.append('      letters: [' + ', '.join(f"'{r}'" for r in letters) + '],')
            out.append('      rows: [' + ', '.join(f"'{r}'" for r in rows) + '],')
            out.append('    },')
        out.append('  },')
    out += ['};', '', '/** The colour his pupil is drawn in: the player\'s eye colour moves it as far. */', f"export const SAMURAI_IRIS = '{iris}';", '']
    return '\n'.join(out)


if __name__ == '__main__':
    S.run(sys.argv, build)
