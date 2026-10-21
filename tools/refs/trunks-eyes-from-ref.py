"""The owner's eyes from his Trunks 3 picture (docs/reference/trunks3-owner-reference.jpg) as the 'glint'
eye shape (a provisional name: his to choose).

His picture is our male painted over in his own pixels (tools/refs/trunks_ref.py: one of his pixels is
one fine pixel of our sprites, our face anchor at his (48, 22)). He repainted the eyes on our face: the
near eye a navy-black lash line four pixels long from a dark red-brown inner corner, under it a grey
white, a light red glint, a dark crimson and his black outer corner, then a white and two reds with a
pale fleck of lit lid at the outer corner, and a lit fleck under the inner corner; the far eye a short
lash line, then a dark, a crimson and a dark, then a grey white, a red and the dark corner. His far eye
starts a column further in than ours (at the template's column 8). This script lifts both eyes out of
his pixels, cell by cell over our face template's eye cells (MAP), with the template's letters, so the
face, the eye options' code and Ocular Surge read them as they read ours:

  L  his lash line and corners    h  his grey white     w  his white
  d  his dark crimson             i  his reds and his glint (his iris moves the way our red eye colour,
                                                         the one he painted it over, does)
  l  his lit flecks of lid        (they follow the character's skin from the skin he painted on)
  o D s b                         his skin there: no pixel of the eye; the face's own skin shows

and two lid states the game needs that his picture does not show, made of his own pixels:

  lowered  (reading) the lid comes down over the top of the eye: the row under the lash takes the
           lash's colours beside it
  closed   (knocked out) the eye is shut: the lash colours run on across the row under the lash, and
           the row under that is the face's skin

It writes the game's module (src/sprite/glintEyeArt.ts) and, in <study>, his face beside the eyes lifted
out (open, lowered, closed) at 16x. The same picture always gives the same bytes:

  python3 -I tools/refs/trunks-eyes-from-ref.py src/sprite/glintEyeArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import trunks_ref as R  # noqa: E402

PIC = 'trunks3'
# Our face anchor (the near eye's lash start) in his pixels, and the template columns the eyes start at.
NX, NY = R.face_anchor(PIC)
FAR_FROM = 8
MAP = {
    'near': [
        'LLLLb',  # 22  the lash line from its dark red-brown inner corner; a lock of his hair over the end
        'LhidL',  # 23  his dark inner corner, the grey white, the light red glint, the crimson, the black corner
        'bwiil',  # 24  the white and two reds, the lit fleck of lid at the outer corner (plain skin inside)
        'lbbbb',  # 25  the lit fleck under the inner corner
    ],
    'far': [
        'sLL',  # 22  the short lash line (a shadow of skin before it)
        'LdL',  # 23  a dark, the crimson, a dark
        'hiL',  # 24  the grey white, the red, the dark corner
    ],
}
FEATURES = 'Lhwdil'
# His red iris was painted over our red eye colour (#d81b2a, Solen's red and the creator's red swatch);
# his lit flecks over Solen's skin (PAINTED_SKIN in trunksKit.ts).
IRIS = '#d81b2a'
SKIN = '#f3c39c'


def eyes(a):
    """Each eye's letters and his colours (None where the face's own skin shows), open."""
    out = {}
    for name, x0 in (('near', NX), ('far', NX + FAR_FROM)):
        rows = MAP[name]
        col = [[tuple(int(v) for v in a[NY + r, x0 + c]) if ch in FEATURES else None for c, ch in enumerate(row)] for r, row in enumerate(rows)]
        out[name] = (list(rows), col)
    return out


def lidded(open_eyes, closed):
    """The lowered or closed lid, from his open eye: the row under the lash takes his lash colours beside
    it; shut, the row under that is the face's skin."""
    out = {}
    for name, (rows, col) in open_eyes.items():
        rows = [list(r) for r in rows]
        col = [list(r) for r in col]
        lid = 1
        lash = [q for q, ch in enumerate(rows[lid]) if ch == 'L']
        for c, ch in enumerate(rows[lid]):
            if ch != 'L':
                q = min(lash, key=lambda q: (abs(q - c), q))
                rows[lid][c] = 'L'
                col[lid][c] = col[lid][q]
        if closed:
            for c, ch in enumerate(rows[2]):
                if ch in 'hwdi':
                    rows[2][c] = 'b'
                    col[2][c] = None
        out[name] = ([''.join(r) for r in rows], col)
    return out


def palette(states):
    """One character per colour of his (colours within 3 share one, as the other converters do)."""
    chars = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    seen = []
    for state in states:
        for name in ('near', 'far'):
            for row in state[name][1]:
                for c in row:
                    if c is not None and not any(max(abs(c[i] - ref[i]) for i in range(3)) <= 3 for _, ref in seen):
                        seen.append((chars[len(seen)], c))
    return seen


def encode(col, seen):
    def ch(c):
        if c is None:
            return '.'
        return next(k for k, ref in seen if max(abs(c[i] - ref[i]) for i in range(3)) <= 3)

    return [''.join(ch(c) for c in row) for row in col]


def module(states, seen):
    hexes = {k: '#%02x%02x%02x' % ref for k, ref in seen}
    out = [
        "// The owner's eyes from his Trunks 3 picture, his pixels (tools/refs/trunks-eyes-from-ref.py from",
        '// docs/reference/trunks3-owner-reference.jpg). Generated: rerun the script to change it.',
        "import type { PaintedEye } from './eyeArt';",
        '',
        '/** His colours, one character each. */',
        'export const GLINT_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{v}'," for k, v in hexes.items()]
    out += ['};', '']
    docs = {
        'open': 'His eyes as he painted them: the lash line on the anchor row, the white, glint and reds under it.',
        'lowered': "Reading: the lid comes down over the top of the eye (the row under the lash takes the lash's colours).",
        'closed': "Knocked out: the lash colours run across the shut eye; under them the face's skin.",
    }
    out += ['/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */',
            "export const GLINT_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {"]
    for state, eyes_ in states.items():
        out += [f'  /** {docs[state]} */', f'  {state}: {{']
        for name in ('near', 'far'):
            rows, col = eyes_[name]
            out += [f'    {name}: {{', f'      letters: [{", ".join(repr(r) for r in rows)}],', f'      rows: [{", ".join(repr(r) for r in encode(col, seen))}],', '    },']
        out += ['  },']
    out += ['};', '',
            "/** The eye colour he painted his red iris over (our red): the player's eye colour moves his iris as far. */",
            f"export const GLINT_IRIS = '{IRIS}';", '',
            "/** The skin he painted his lit flecks of lid over: the character's skin moves them as far. */",
            f"export const GLINT_SKIN = '{SKIN}';", '',
            '/** The template column his far eye starts at (ours start at 9): his far eye sits a column further in. */',
            f'export const GLINT_FAR_FROM = {FAR_FROM};', '']
    return '\n'.join(out)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(PIC)
    opened = eyes(a)
    states = {'open': opened, 'lowered': lidded(opened, False), 'closed': lidded(opened, True)}
    seen = palette(states.values())
    if out_ts:
        R.write(out_ts, module(states, seen))
    if study:
        os.makedirs(study, exist_ok=True)
        x0, y0, w, h = NX - 3, NY - 3, FAR_FROM + 9, 8
        sheet = np.full((h, w * 4 + 3, 3), 200, np.int32)
        sheet[:, :w] = a[y0:y0 + h, x0:x0 + w]
        for k, eyes_ in enumerate(states.values()):
            for name, ex in (('near', NX), ('far', NX + FAR_FROM)):
                rows, col = eyes_[name]
                for r, row in enumerate(col):
                    for c, px in enumerate(row):
                        sheet[NY - y0 + r, (k + 1) * (w + 1) + ex - x0 + c] = px if px is not None else (255, 255, 255)
        R.save(sheet, os.path.join(study, 'glint-eyes@16.png'), k=16)
    print(len(seen), 'colours:', ' '.join('%s=#%02x%02x%02x' % ((k,) + ref) for k, ref in seen))


if __name__ == '__main__':
    main()
