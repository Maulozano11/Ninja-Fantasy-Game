"""The owner's Saya's eyes (docs/reference/saya-owner-reference.jpg) as the 'shade' eye shape.

His Saya is his own pixel art at ten picture pixels to one of hers (tools/refs/heroine_ref.py), her head
about 0.65 of ours across and 0.62 down, so her eyes are not lifted 1:1 as Aiden's were: each cell of
ours takes the colour of the pixel of hers it stands for (PICK, her pixels by their place in her
picture, in her palette, heroine_ref.PALETTES['saya']), laid out at our scale over our face
template's eye cells (DESIGN). Her eyes as he drew them:

  near  a thick navy-black lash two of her rows deep running out past the eye's outer corner, where it
        ends in a brown tip; at the outer corner it turns down; under it a wide eye, white on the
        outer side, the rest a bright blue iris (a darker blue, a dark navy pupil, a white glint) and a
        pale grey at its lower inner corner; a dark brown inner end to the lash; no lower line
  far   at the face's edge: the lash sweeps up and out along the edge, under it a white glint over her
        blue

At our scale the lash is one row (her two rows are 1.2 of ours), the eye under it two (her three are
1.9), the near eye five cells wide with the lash's tip a cell further out (her nine pixels across are
5.9 of ours), the far eye three wide with the lash's tip a row higher. Her glint on the near eye is a
quarter of the cell it falls in (her blue is the rest), so that cell is blue; the far eye keeps its
glint, the brightest of its cell. So the near eye starts a column left and a row above the template's
eye cells and the far one a row above (AT): those cells are hers only where she has a pixel. Every cell
of the template's eye cells is hers or the face's own skin, written with the template's letters, so
the face, the eye options' code and Ocular Surge read them as they read ours:

  L  her lash (and its brown tip and inner end)     h  her pale grey
  w  her white and glint                            d  her pupil, i  her blues (they move the way
  o D s b l  (0-4 in DESIGN) the face's own skin       the eye colour moves her bright blue)

Her eyes sit on the template's eye rows, where our eyes are, so every face shape, hairstyle and pose
that fits ours fits hers (the reduced reference paints them on her own smaller head, three rows
higher). Her brows are under her bangs (the row over her lash is the bangs' shadow), so the
template's brows stay. Two lid states the game needs that her picture does not show, made of her
pixels:

  lowered  (reading) her lash comes down a row with its tip; under it the lower row of her eye, white,
           blues and grey; above it the lid's skin
  closed   (knocked out) her lash, with its tip, closes down a row across the shut eye; skin over and
           under it, as our closed eyes

Writes, in <out>:

  eyes@16.png   her eyes at our scale, open, lowered and closed, at 16x (white where the face's skin shows)
  hers@16.png   her own pixels there, at 16x

and, with a third argument, the game's module (src/sprite/sayaEyeArt.ts). The same picture always gives
the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/saya-eyes-from-ref.py docs/reference/saya-owner-reference.jpg <out> src/sprite/sayaEyeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import heroine_ref as R  # noqa: E402

WHICH = 'saya'
# Each cell's colour: the template letter it is, and the pixel of hers (x, y in her 200 x 200) whose
# colour it takes.
PICK = {
    'K': ('L', (104, 25)),  # her lash's darkest navy (its top row, the far eye's under the tip)
    'k': ('L', (105, 26)),  # her lash, navy-black
    'n': ('L', (101, 26)),  # the brown tip of the near lash, out past the corner
    'c': ('L', (109, 26)),  # the lash's dark brown inner end
    'W': ('w', (104, 27)),  # her white
    'f': ('w', (115, 27)),  # the far eye's glint
    'm': ('i', (105, 27)),  # her blue
    'B': ('i', (108, 27)),  # her bright blue, the lit iris
    'p': ('d', (107, 27)),  # her pupil, dark navy
    'G': ('h', (108, 29)),  # the pale grey at the near eye's lower inner corner
}
SKIN = 'oDsbl'  # a digit d in DESIGN: the face's own skin at shade d (SKIN[d])
# Where each eye's first cell is from the template's eye cells (columns, rows): the near eye's from
# its lash's tip a column out and a row up, the far eye's a row up (its lash's tip at the face's edge).
AT = {'near': (-1, -1), 'far': (0, -1)}
# The template's eye cells: the near eye five columns, the far three, three rows from the lash row.
TEMPLATE = {'near': (5, 3), 'far': (3, 3)}
# Her eyes at our scale, one row per row from the AT row: a PICK character, a skin digit, or '.'
# (outside the template's cells, nothing of hers).
DESIGN = {
    'open': {
        'near': [
            '......',  # (the lash's tip reaches no higher)
            'nkkkkc',  # her lash: its brown tip out past the corner, navy-black, its dark brown inner end
            '.kWmpB',  # the lash turning down the outer corner; her white, blue, pupil, bright blue
            '.2WBBG',  # her white, bright blue and the pale grey at the inner corner (no lower line)
        ],
        'far': [
            '..K',  # the lash's tip, up along the face's edge
            'Kkk',  # the lash
            'fkk',  # her glint, the lash down the face's edge
            'mk0',  # her blue, the lash, the face's outline
        ],
    },
    'lowered': {
        'near': [
            '......',
            '.33333',  # the lowered lid's skin
            'nkkkkc',  # her lash, a row down, with its tip
            '.2WBBG',  # the lower row of her eye
        ],
        'far': [
            '...',
            '330',
            'Kkk',
            'mk0',
        ],
    },
    'closed': {
        'near': [
            '......',
            '.33333',
            'nkkkkc',  # her lash closed down a row across the shut eye, with its tip
            '.23334',
        ],
        'far': [
            '...',
            '330',
            'kkk',
            '330',
        ],
    },
}
# The colour her iris follows: her bright blue (the lit iris, the eye colour of her preset).
IRIS = '#088cce'


def colour(N, xy):
    """Her palette colour of one pixel of hers."""
    x, y = xy
    return R.PALETTES[WHICH][int(R.quantize(N[y:y + 1, x:x + 1], WHICH)[0, 0])]


def build(N):
    """Each state's eyes: (letters, colours) rows, colours None where no pixel of hers is."""
    out = {}
    for state, eyes in DESIGN.items():
        out[state] = {}
        for name, rows in eyes.items():
            (dx, dy), (tw, th) = AT[name], TEMPLATE[name]
            letters, cols = [], []
            for r, row in enumerate(rows):
                lt, cl = '', []
                for c, ch in enumerate(row):
                    inside = 0 <= c + dx < tw and 0 <= r + dy < th
                    if ch in PICK:
                        lt += PICK[ch][0]
                        cl.append(colour(N, PICK[ch][1]))
                    elif ch.isdigit():
                        assert inside, (state, name, r, c)
                        lt += SKIN[int(ch)]
                        cl.append(None)
                    else:
                        assert ch == '.' and not inside, (state, name, r, c)
                        lt += '.'
                        cl.append(None)
                letters.append(lt)
                cols.append(cl)
            out[state][name] = (letters, cols)
    return out


def cells(letters, name):
    """The letters on the template's eye cells alone (what the face template and Ocular Surge read)."""
    (dx, dy), (tw, th) = AT[name], TEMPLATE[name]
    return [letters[r - dy][-dx:-dx + tw] for r in range(th)]


def palette(states):
    """One character per colour of hers, in order of first use."""
    chars = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    seen = []
    for state in states.values():
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
        "// The owner's Saya's eyes, her colours (tools/refs/saya-eyes-from-ref.py from",
        '// docs/reference/saya-owner-reference.jpg, brought down to our scale). Generated: rerun the script to change it.',
        '',
        "import type { PaintedEye } from './eyeArt';",
        '',
        '/** Her colours, one character each. */',
        'export const SAYA_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{v}'," for k, v in seen]
    out += ['};', '',
            "/** Where each eye's first cell is from the template's eye cells (columns, rows): the near eye's lash tip is a column out and a row up, the far eye's a row up. */",
            'export const SAYA_EYE_AT: Record<\'near\' | \'far\', readonly [number, number]> = { near: [%d, %d], far: [%d, %d] };' % (AT['near'] + AT['far']),
            '']
    docs = {
        'open': 'Her eyes as he drew them: the thick lash out past the outer corner, her white, blues, pupil and pale grey; the far eye\'s glint at the face\'s edge.',
        'lowered': 'Reading: her lash comes down a row with its tip, over the lower row of her eye.',
        'closed': 'Knocked out: her lash closes down a row across the shut eye; skin over and under it.',
    }
    out += ['/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out), from SAYA_EYE_AT: the near eye six cells wide, the far three, both four rows tall. */',
            'export const SAYA_EYES: Record<\'open\' | \'lowered\' | \'closed\', { near: PaintedEye; far: PaintedEye }> = {']
    for state, eyes_ in states.items():
        out += [f'  /** {docs[state]} */', f'  {state}: {{']
        for name in ('near', 'far'):
            rows, col = eyes_[name]
            out += [f'    {name}: {{', f'      letters: [{", ".join(repr(r) for r in rows)}],', f'      rows: [{", ".join(repr(r) for r in encode(col, seen))}],', '    },']
        out += ['  },']
    out += ['};', '',
            "/** Her eyes' letters on the template's eye cells alone (the near eye five columns, the far three, three rows from the lash row), in each lid state. */",
            'export const SAYA_EYE_CELLS: Record<\'open\' | \'lowered\' | \'closed\', { near: string[]; far: string[] }> = {']
    for state, eyes_ in states.items():
        near, far = cells(eyes_['near'][0], 'near'), cells(eyes_['far'][0], 'far')
        out += [f'  {state}: {{ near: [{", ".join(repr(r) for r in near)}], far: [{", ".join(repr(r) for r in far)}] }},']
    out += ['};', '',
            "/** Her bright blue, the lit iris: the player's eye colour moves her iris as far. */",
            f"export const SAYA_IRIS = '{IRIS}';", '']
    src = '\n'.join(out)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(src)
    os.replace(tmp, path)


def rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def main():
    ref, out = sys.argv[1], sys.argv[2]
    assert os.path.samefile(ref, R.REFS[WHICH]), ref
    os.makedirs(out, exist_ok=True)
    N = R.native(WHICH)
    states = build(N)
    seen = palette(states)
    if len(sys.argv) > 3:
        write_ts(sys.argv[3], states, seen)

    # The study: each state's eyes over a grey ground (white where the face's skin shows, in the
    # template's eye cells), and her own pixels there.
    gap = 9
    h, w = 6, gap + 6
    sheet = np.full((h * 3 + 2, w, 3), 200, np.int32)
    for k, eyes_ in enumerate(states.values()):
        for name, x0 in (('near', 1 + 1 + AT['near'][0]), ('far', 1 + 1 + gap + AT['far'][0])):
            rows, col = eyes_[name]
            for r, row in enumerate(col):
                for c, px in enumerate(row):
                    if px is not None:
                        sheet[k * (h + 1) + 1 + r, x0 + c] = rgb(px)
                    elif rows[r][c] != '.':
                        sheet[k * (h + 1) + 1 + r, x0 + c] = (255, 255, 255)
    R.save(sheet, os.path.join(out, 'eyes@16.png'), k=16)
    R.save(N[22:32, 98:120], os.path.join(out, 'hers@16.png'), k=16)
    print(len(seen), 'colours:', ' '.join(f'{k}={v}' for k, v in seen))


if __name__ == '__main__':
    main()
