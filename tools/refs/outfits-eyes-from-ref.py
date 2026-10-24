"""The owner's three new male outfits: his eyes (the 'wanderer' eye shape), from
docs/reference/three-outfits-owner-reference.jpg (the armoured figure's head, at our Roman head's size).

Each eye is his lash (on the face anchor's row), then his blue iris with its white glint, two rows. Every cell is his
pixel; the letters say what each is (L his line and the dark round the eye, w his white, d his darker blue,
i his lighter blue, b the face's skin where he drew skin). His iris is recoloured by the eye colour.

  python3 -I tools/refs/outfits-eyes-from-ref.py src/sprite/outfitEyeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import outfits_ref as O  # noqa: E402


def build():
    rgb, label = O.game(O.HEAD_FIG)
    ax, ay = O.FACE_ANCHOR
    colors = {}
    chars = iter('acefghjkmnpqrstuvxyz')

    def ch(c):
        h = O.hexc(c)
        for k, v in colors.items():
            if v == h:
                return k
        k = next(chars)
        colors[k] = h
        return k

    blues = []
    eyes = {}
    for side, x0, w in (('near', ax + O.EYE_COLS[0], O.EYE_W[0]), ('far', ax + O.EYE_COLS[1], O.EYE_W[1])):
        letters, rows = [], []
        for y in range(ay, ay + O.EYE_ROWS):
            lt, rw = '', ''
            for x in range(x0, x0 + w):
                c = rgb[y, x]
                k = O.kind(c)
                if y < O.LASH_ROW:
                    # above his lash: the face's own (his hair over it)
                    lt += 'b'
                    rw += '.'
                elif k == 'blue':
                    blues.append((float(O.luma(c)), O.hexc(c)))
                    lt += 'i' if O.luma(c) > 70 else 'd'
                    rw += ch(c)
                elif k == 'line' or (k in ('dark', 'hair') and y == O.LASH_ROW):
                    lt += 'L'
                    rw += ch(c)
                elif k in ('white', 'steel') and y > O.LASH_ROW:
                    lt += 'w'
                    rw += ch(c)
                elif k in ('dark', 'hair'):
                    lt += 'L'
                    rw += ch(c)
                else:
                    lt += 'b'
                    rw += '.'
            letters.append(lt)
            rows.append(rw)
        eyes[side] = (letters, rows)
    blues.sort()
    iris = blues[len(blues) // 2][1]

    def lowered(e):
        # reading: the lid comes down over his iris's top row, his line there
        letters, rows = e
        lid = next(r for r in rows[0] if r != '.')
        l2 = [letters[0], ''.join('L' if c in 'wdi' else c for c in letters[1]), letters[2]]
        r2 = [rows[0], ''.join(lid if letters[1][i] in 'wdi' else rows[1][i] for i in range(len(rows[1]))), rows[2]]
        return l2, r2

    def shut(e):
        # knocked out: his lash line across the middle row, skin above and below
        letters, rows = e
        lid = next(r for r in rows[0] if r != '.')
        w = len(letters[0])
        mid = ''.join('L' if (letters[0][i] != 'b' or letters[1][i] != 'b') else 'b' for i in range(w))
        l2 = ['b' * w, mid, 'b' * w]
        r2 = ['.' * w, ''.join(lid if mid[i] == 'L' else '.' for i in range(w)), '.' * w]
        return l2, r2

    out = [O.header('outfits-eyes-from-ref.py', "The owner's eyes from his three outfits"), '', "import type { PaintedEye } from './eyeArt';", '',
           '/** His colours, one character each. */', 'export const OUTFIT_EYE_COLORS: Record<string, string> = {']
    out += [f"  {k}: '{v}'," for k, v in colors.items()]
    out += ['};', '', '/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */',
            "export const OUTFIT_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {"]
    for state, doc in (('open', 'His eyes as he drew them: the lash, his blue iris and its white glint.'),
                       ('lowered', 'Reading: the lid down over the top of his iris.'),
                       ('closed', 'Knocked out: his lash line across the shut eye; round it the face\'s skin.')):
        out.append(f'  /** {doc} */')
        out.append(f'  {state}: {{')
        for side in ('near', 'far'):
            e = eyes[side]
            letters, rows = e if state == 'open' else lowered(e) if state == 'lowered' else shut(e)
            out.append(f'    {side}: {{')
            out.append('      letters: [' + ', '.join(f"'{r}'" for r in letters) + '],')
            out.append('      rows: [' + ', '.join(f"'{r}'" for r in rows) + '],')
            out.append('    },')
        out.append('  },')
    out += ['};', '', "/** The colour his iris is drawn in: the player's eye colour moves it as far. */", f"export const OUTFIT_IRIS = '{iris}';", '']
    return '\n'.join(out)


if __name__ == '__main__':
    O.run(sys.argv, build)
