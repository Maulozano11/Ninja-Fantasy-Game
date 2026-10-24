"""The owner's eyes on his navy officer (docs/reference/navy-officer-owner-reference.jpg) as the 'navy'
eye shape.

His head is shrunk to our Roman head's size and cleaned with his palette only (tools/refs/navy_ref.py). His
eyes come out under a full lash line of his black on the face anchor's row: on the near eye his white and his
red iris between his line, on the far eye his red iris under the lash, against the line of his far cheek. This
script lifts both eyes out of that, cell by cell over our face template's eye cells (navy_ref.EYES: the near
eye's 5 columns from x 49, the far eye's 3 from x 56, the lash row and the row under it), with the template's
letters, so the face and the eye options' code read them as they read ours:

  L  his lash line          w  his white
  d  his dark red iris      i  his bright red iris (his iris moves the way the eye colour does from IRIS)
  s  his skin there: no pixel of the eye; the face's own skin shows

and two lid states the game needs that his picture does not show, made of his own pixels:

  lowered  (reading) the lid comes down over the eye's row: its cells take his lash colour
  closed   (knocked out) the same, the eye shut under his lash colour

It writes the game's module (src/sprite/navyEyeArt.ts). The same picture always gives the same bytes:

  python3 -I tools/refs/navy-eyes-from-ref.py src/sprite/navyEyeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import navy_ref as N  # noqa: E402

FEATURES = 'Lwdi'


def eyes(g):
    out = {}
    for name, (x0, y0, w, h) in N.EYES.items():
        letters, col = [], []
        for y in range(y0, y0 + h):
            lr, cr = '', []
            for x in range(x0, x0 + w):
                ch = N.eye_letter(g[y, x])
                lr += ch
                cr.append(tuple(int(v) for v in g[y, x]) if ch in FEATURES else None)
            letters.append(lr)
            col.append(cr)
        out[name] = (letters, col)
    return out


def lidded(open_eyes):
    """The lowered (and closed) lid: the eye's row under the lash takes his lash colour where it shows the eye."""
    out = {}
    for name, (rows, col) in open_eyes.items():
        rows = [list(r) for r in rows]
        col = [list(r) for r in col]
        lash = next(c for c in col[0] if c is not None)
        for c, ch in enumerate(rows[1]):
            if ch in 'wdi':
                rows[1][c] = 'L'
                col[1][c] = lash
        out[name] = ([''.join(r) for r in rows], col)
    return out


def palette(states):
    chars = 'abcdefhijklmnpqrstuvwxyz'
    seen = []
    for state in states:
        for name in ('near', 'far'):
            for row in state[name][1]:
                for c in row:
                    if c is not None and not any(c == ref for _, ref in seen):
                        seen.append((chars[len(seen)], c))
    return seen


def encode(col, seen):
    return [''.join('.' if c is None else next(k for k, ref in seen if ref == c) for c in row) for row in col]


def main():
    out_ts = sys.argv[1]
    g, _, _, _ = N.game('high')
    opened = eyes(g)
    shut = lidded(opened)
    states = {'open': opened, 'lowered': shut, 'closed': shut}
    seen = palette(states.values())
    reds = [c for _, c in seen if N.kind(c) == 'red']
    iris = N.hexc(max(reds, key=lambda c: N.luma(N.np.array(c))))
    out = [
        N.header('navy-eyes-from-ref.py', "The owner's eyes on his navy officer").rstrip(),
        '',
        "import type { PaintedEye } from './eyeArt';",
        '',
        '/** His colours, one character each. */',
        'export const NAVY_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{N.hexc(v)}'," for k, v in seen]
    out += ['};', '']
    docs = {
        'open': 'His eyes as the reduction gives them: his lash line on the anchor row, his white and red iris under it.',
        'lowered': "Reading: the lid comes down over the eye's row (its cells take his lash colour).",
        'closed': 'Knocked out: the eye shut under his lash colour.',
    }
    out += ['/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */',
            "export const NAVY_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {"]
    for state, e in states.items():
        out += [f'  /** {docs[state]} */', f'  {state}: {{']
        for name in ('near', 'far'):
            rows, col = e[name]
            out += [f'    {name}: {{', f'      letters: [{", ".join(repr(r) for r in rows)}],', f'      rows: [{", ".join(repr(r) for r in encode(col, seen))}],', '    },']
        out += ['  },']
    out += ['};', '',
            "/** His bright red, the eye colour his iris is painted in: the player's eye colour moves his reds as far. */",
            f"export const NAVY_IRIS = '{iris}';", '']
    N.write(out_ts, '\n'.join(out))
    print(len(seen), 'colours, iris', iris, opened)


if __name__ == '__main__':
    main()
