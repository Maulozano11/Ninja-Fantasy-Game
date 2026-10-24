"""The owner's heroine knights: her eyes (the 'gallant' eye shape), from
docs/reference/heroine-knights-owner-reference.jpg (his paladin's head, shared by all three), shrunk with his
eye rows and columns kept whole (tools/refs/heroine_knights_ref.py head_kept()).

On the face anchor's row his black lash line over each eye (L), on the row under it his whites (w), his green
iris (i, its dark side d: the eye colour moves them) and the skin or lid he drew beside them; the near eye five
columns from the anchor, the far eye three from HK_EYE_COLS[1]. Lowered (reading) his lash line stays and the
eye row is the face's skin; closed (knocked out) the same.

  python3 -I tools/refs/hk-eyes-from-ref.py src/sprite/heroineKnightEyeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import heroine_knights_ref as R  # noqa: E402

NEAR_W, FAR_W = 5, 3


def build():
    rgb, lab = R.game(R.SHARED_FROM)
    nx, ny = R.FACE_ANCHOR
    colors = {}
    chars = iter('abcdefhijkmnpqrstuvxyz')

    def ch(c):
        h = R.hexc(c)
        for k, v in colors.items():
            if v == h:
                return k
        k = next(chars)
        colors[k] = h
        return k

    eyes = {}
    iris = None
    for side, x0, w in (('near', nx, NEAR_W), ('far', nx + R.FAR_EYE, FAR_W)):
        letters, rows = [], []
        for y in (ny, ny + 1):
            lt, rw = '', ''
            for x in range(x0, x0 + w):
                c = rgb[y, x]
                k = R.kind(c)
                if k == 'line':
                    lt += 'L'
                elif k == 'white':
                    lt += 'w'
                elif k in ('green', 'cyan'):
                    lt += 'd' if R.luma(c) < 70 else 'i'
                    if lt[-1] == 'i' and iris is None:
                        iris = R.hexc(c)
                else:
                    lt += 'h' if y > ny else 'b'
                rw += ch(c)
            letters.append(lt)
            rows.append(rw)
        eyes[side] = (letters, rows)

    def shut(e):
        letters, rows = e
        return [letters[0].replace('d', 'L').replace('i', 'L'), 'b' * len(letters[1])], [rows[0], '.' * len(rows[1])]

    out = [R.header('hk-eyes-from-ref.py', "The owner's heroine knights' eyes"), '', "import type { PaintedEye } from './eyeArt';", '',
           '/** His colours, one character each. */', 'export const HK_EYE_COLORS: Record<string, string> = {']
    out += [f"  {k}: '{v}'," for k, v in colors.items()]
    out += ['};', '', '/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out). */',
            "export const HK_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {"]
    for state, doc in (('open', 'Her eyes as he drew them: his lash line on the anchor row, his whites and green iris under it.'),
                       ('lowered', 'Reading: his lash line, the eye under the lowered lid the face\'s skin.'),
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
    out += ['};', '', "/** The colour his iris is painted in: the player's eye colour moves it as far. */", f"export const HK_IRIS = '{iris}';", '']
    return '\n'.join(out)


if __name__ == '__main__':
    R.run(sys.argv, build)
