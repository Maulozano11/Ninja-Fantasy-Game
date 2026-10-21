"""The owner's Scarlet's eyes (docs/reference/scarlet-owner-reference.jpg) as the 'noble' eye shape.

His picture is his own pixel art at 1.8 of his pixels to one of ours (tools/refs/scarlet_ref.py), so
his eyes are not lifted 1:1 as Aiden's were: they are lifted out of the reduced reference
(scarlet_ref.reduced(), tools/refs/scarlet-study.py), where his head is brought down to 0.68 with his
eyes on ours and his eyes are drawn again at our scale, after his, in his colours. Each eye is lifted
cell by cell over our face template's eye cells (MAP) and written with the template's letters, so the
face, the eye options' code and Ocular Surge read them as they read ours:

  B  the brown lines he drew round the eyes: right over each lash (his brows are under his bangs),
     at the near lash's inner end and under its outer corner; in his skin's browns, not his hair's
     crimson, so they move with the skin tone
  L  his lash lines (and the far one's dark outer end, against the face's edge)
  h  his white          w  his glints
  d  his dark amber     i  his amber      (his iris moves the way the eye colour moves his amber)
  o D s b l             his skin there: no pixel of the eye; the face's own skin shows

His eyes sit a row lower than our template's, as Aiden's do: his line over the lash takes our lash
row, his lash our second row. They are lifted where they sit on his own head (the 'noble' face shape,
tools/refs/scarlet-head-from-ref.py), whose eyes are at the face anchor's column + 1 and + 9, so on
his head every pixel of them is where the reduced reference has it (on our faces they sit at ours).
The near eye is six cells wide (our five and the column after them, where his line and his lash end
in a light brown at the inner corner) and four rows tall (the line, the lash, then his white, amber
and dark amber over his lower line, his iris's dark lower edge and his glint); the far eye three cells
and three rows (his line over the lash at its outer end, the lash, his dark amber, his glint and the
lash's dark outer end), as in his picture, where his far eye sits right at his face's edge (on his
head the edge is the column after it).

and two lid states the game needs that his picture does not show, made of his own pixels:

  lowered  (reading) the lash comes down a row over the eye, the lid's skin above it, and under it
           his white and iris show as under his open lash, without the glint (the far eye, a row
           shorter, shows only its lash there)
  closed   (knocked out) the eye is shut: under the lash line it is skin
(the far eye keeps its lash's dark outer end in both)

and writes, in <out>:

  eyes@16.png      his eyes lifted out, open, lowered and closed, at 16x (white where the face's skin shows)
  reduced@16.png   the reduced reference there, at 16x
  his@16.png       his own pixels there, at 16x

and, with a third argument, the game's module (src/sprite/nobleEyeArt.ts). The same picture always
gives the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/scarlet-eyes-from-ref.py docs/reference/scarlet-owner-reference.jpg <out> src/sprite/nobleEyeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import scarlet_ref as R  # noqa: E402

# The eyes, cell by cell, in the reduced reference (our frame): our template's near eye (5 columns,
# and a sixth for his lash's inner end) and far eye (3 columns), from the face anchor's row (139 at
# idle frame 0), where his head puts them: the near eye from x 124 (the face anchor's column 123 + 1;
# his bangs there become skin), the far one from x 132 (+ 9).
NEAR_AT = (124, 139)
FAR_AT = (132, 139)
MAP = {
    'near': [
        'sbBBBB',  # 139  his line over the lash: a mid brown, a darker one, the mid brown, its light end
        'sLLLLB',  # 140  the lash: its outer end dark red-black, black on, its inner end a light brown
        'sshidb',  # 141  his white, amber and dark amber; his skin's shade at the outer corner
        'sBbdwb',  # 142  his lower line at the outer corner, the iris's dark lower edge, his glint
    ],
    'far': [
        'bbB',  # 139  his line over the far lash, at its outer end
        'LLL',  # 140  the lash
        'dwL',  # 141  his dark amber and glint, the lash's dark outer end
    ],
}
FEATURES = 'BLhwdi'
SKIN = 'oDsbl'
# The colour his iris follows: his amber (the lit iris, his #c88038, also the eye colour of his
# preset). His line over the lash is in his skin's browns, so it follows his skin (NOBLE_SKIN in
# src/sprite/nobleHeadArt.ts, the skin of his preset).
IRIS = '#c88038'


def eyes(idx):
    """Each eye's letters and his colours (None where his skin is), open, from the reduced reference
    (PALETTE indices in our frame)."""
    out = {}
    for name, (x0, y0) in (('near', NEAR_AT), ('far', FAR_AT)):
        rows = MAP[name]
        col = []
        for r, row in enumerate(rows):
            line = []
            for c, ch in enumerate(row):
                if ch in SKIN:
                    line.append(None)
                    continue
                k = int(idx[y0 + r, x0 + c])
                assert k < len(R.PALETTE), (name, r, c)
                line.append(R.PALETTE[k])
            col.append(line)
        out[name] = (list(rows), col)
    return out


def lidded(open_eyes, closed):
    """The lowered or closed lid, from his open eye (the far eye's last column, its lash's dark outer
    end, stays as it is). Lowered: the lash comes down a row, the row it leaves is the lid's skin, and under it
    the eye shows as it does under his open lash (his white, amber and dark amber, the near eye's
    lower line at the outer corner), without the glint: the lowered eye catches no light. Closed:
    everything under the lash is skin."""
    out = {}
    lash = 1
    for name, (rows0, col0) in open_eyes.items():
        rows = [list(r) for r in rows0]
        col = [list(r) for r in col0]
        edge = (lambda c: c == len(rows0[0]) - 1) if name == 'far' else (lambda c: False)
        for c in range(len(rows0[0])):
            if edge(c):
                continue
            if closed:
                for r in range(lash + 1, len(rows)):
                    if rows0[r][c] in FEATURES:
                        rows[r][c], col[r][c] = 'b', None
                continue
            rows[lash][c], col[lash][c] = (rows0[lash][c] if rows0[lash][c] in SKIN else 'b'), None
            rows[lash + 1][c], col[lash + 1][c] = rows0[lash][c], col0[lash][c]
            for r in range(lash + 2, len(rows)):
                if rows0[r - 1][c] in 'hdi':
                    rows[r][c], col[r][c] = rows0[r - 1][c], col0[r - 1][c]
                elif rows0[r][c] not in 'LB':
                    rows[r][c], col[r][c] = (rows0[r][c] if rows0[r][c] in SKIN else 'b'), None
        out[name] = ([''.join(r) for r in rows], col)
    return out


def palette(states):
    """One character per colour of his, in order of first use."""
    chars = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    seen = []
    for state in states:
        for name in ('near', 'far'):
            for row in state[name][1]:
                for c in row:
                    if c is not None and c not in [h for _, h in seen]:
                        seen.append((chars[len(seen)], c))
    return seen


def encode(col, seen):
    key = {h: k for k, h in seen}
    return [''.join('.' if c is None else key[c] for c in row) for row in col]


def write_ts(path, states, seen):
    out = [
        "// The owner's Scarlet's eyes, his colours (tools/refs/scarlet-eyes-from-ref.py from",
        '// docs/reference/scarlet-owner-reference.jpg, brought down to our scale). Generated: rerun the script to change it.',
        '',
        "import type { PaintedEye } from './eyeArt';",
        '',
        '/** His colours, one character each. */',
        'export const NOBLE_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{v}'," for k, v in seen]
    out += ['};', '']
    docs = {
        'open': 'His eyes as he drew them: the line over the lash, the lash, his white and amber iris, the near one over his lower line and glint.',
        'lowered': 'Reading: the lash comes down a row (the lid\'s skin above it) over his white and iris, without the glint.',
        'closed': 'Knocked out: under the lash line the eye is shut (skin); the far eye keeps its lash\'s dark outer end.',
    }
    out += ['/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). The near eye is six cells wide and four rows tall, the far one three and three. */',
            'export const NOBLE_EYES: Record<\'open\' | \'lowered\' | \'closed\', { near: PaintedEye; far: PaintedEye }> = {']
    for state, eyes_ in states.items():
        out += [f'  /** {docs[state]} */', f'  {state}: {{']
        for name in ('near', 'far'):
            rows, col = eyes_[name]
            out += [f'    {name}: {{', f'      letters: [{", ".join(repr(r) for r in rows)}],', f'      rows: [{", ".join(repr(r) for r in encode(col, seen))}],', '    },']
        out += ['  },']
    out += ['};', '',
            "/** His amber, the lit iris: the player's eye colour moves his iris as far. */",
            f"export const NOBLE_IRIS = '{IRIS}';", '']
    src = '\n'.join(out)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(src)
    os.replace(tmp, path)


def rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    idx = R.reduced_index()
    opened = eyes(idx)
    states = {'open': opened, 'lowered': lidded(opened, False), 'closed': lidded(opened, True)}
    seen = palette(states.values())
    if len(sys.argv) > 3:
        write_ts(sys.argv[3], states, seen)

    # The study: each state's eyes over a grey ground (white where the face's skin shows), the
    # reduced reference there, and his own pixels there.
    gap = FAR_AT[0] - NEAR_AT[0]
    h, w = 6, gap + 6
    sheet = np.full((h * 3 + 2, w, 3), 200, np.int32)
    for k, eyes_ in enumerate(states.values()):
        for name, x0 in (('near', 1), ('far', 1 + gap)):
            rows, col = eyes_[name]
            for r, row in enumerate(col):
                for c, px in enumerate(row):
                    sheet[k * (h + 1) + 1 + r, x0 + c] = rgb(px) if px is not None else (255, 255, 255)
    R.save(sheet, os.path.join(out, 'eyes@16.png'), k=16)
    red = R.reduced()[NEAR_AT[1] - 3:NEAR_AT[1] + 7, NEAR_AT[0] - 3:FAR_AT[0] + 8]
    red = np.where(red[..., 3:4] > 0, red[..., :3], 200)
    R.save(red, os.path.join(out, 'reduced@16.png'), k=16)
    a = R.native(ref)
    ex, ey = R.EYES['near']
    R.save(a[int(ey) - 5:int(ey) + 6, int(ex) - 6:int(R.EYES['far'][0]) + 6], os.path.join(out, 'his@16.png'), k=16)
    print(len(seen), 'colours:', ' '.join(f'{k}={v}' for k, v in seen))


if __name__ == '__main__':
    main()
