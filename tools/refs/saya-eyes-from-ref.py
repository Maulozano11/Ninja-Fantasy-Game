"""The owner's Saya's eyes (docs/reference/saya-game-scale-owner-reference.jpg) as the 'shade' eye shape.

His game-scale Saya ("aquí hay otra", the picture he drew at our sprite scale) is 1024 x 1024 picture pixels
for 100 x 100 of hers: one of her pixels is 10.24 picture pixels, the grid starting at the picture's corner,
and one of hers is one of ours. So her eyes are lifted 1:1, as Aiden's were: each cell is her pixel there,
in her colour (the median of the cell's middle, a JPEG, and one colour per tone of hers: the mean of the
cells of that tone, PICK). Her eyes as he drew them (her pixels x 47-59, y 19-21):

  near  a black lash four of her pixels wide (x 49-52) that turns down a row at the outer corner; under
        it her grey white and two dark blues; under that her bright white and two blues; under the
        lash's corner her skin's shadow
  far   at the face's edge: her lash over one dark blue and one blue (x 57), the face's black line beside
        them (x 58); on the inner side her skin: its shadow under the bangs, a darker tone at the eye's
        inner corner (the tone of her nose and mouth) and a light one under it

Her eyes sit on our face template's eye rows: her lash row is the template's lash row (her nose and her
mouth then fall on the template's nose and mouth rows, as they are in her picture). Her face is ten of
her pixels across from its near edge to its black line, ours twelve: her far eye and the face's line are
the template's far cells (her x 56-58 on its columns 9-11) and her near eye starts a column in from the
template's near cell (her x 49 on its column 1), so her eyes are her own and only the gap between them
is a column wider than hers. Every cell of the template's eye cells is hers or her skin, written with the
template's letters, so the face, the eye options' code and Ocular Surge read them as they read ours:

  L  her lash and the face's black line beside the far eye     w  her whites
  d  her dark blue, i  her blue (the eye colour moves them as it moves her blue)
  o D s b l  her skin (cells with a digit 0-4 in DESIGN): drawn by the face in the player's skin, at the
             template's shade nearest her tone there (her shadows and the inner corner s, her light l)

Her brows are under her bangs (the row over her lash is hair), so the template's brows stay. Two lid
states the game needs that her picture does not show, made of her pixels:

  lowered  (reading) her lash comes down a row over the lower row of her eye; the lid's skin above it
  closed   (knocked out) her lash closes down a row across the shut eye; skin over and under it

Writes, in <out>:

  eyes@16.png   her eyes on the template's cells, open, lowered and closed, at 16x (white where her skin shows)
  hers@16.png   her own pixels there, at 16x

and, with a third argument, the game's module (src/sprite/sayaEyeArt.ts). The same picture always gives
the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/saya-eyes-from-ref.py docs/reference/saya-game-scale-owner-reference.jpg <out> src/sprite/sayaEyeArt.ts
"""

import os
import sys

import numpy as np
from PIL import Image

# One of her pixels in picture pixels, and her grid's size: 1024 / 100, the grid from the picture's corner.
PITCH = 10.24
SIZE = 100
# Each tone of hers: the template letter it is, and the pixels of hers (x, y) whose mean colour it takes.
PICK = {
    'k': ('L', [(49, 19), (50, 19), (51, 19), (52, 19), (49, 20), (57, 19), (58, 19), (58, 20)]),  # her lash, black
    'W': ('w', [(50, 20)]),  # her grey white
    'G': ('w', [(50, 21)]),  # her bright white
    'p': ('d', [(51, 20), (52, 20), (57, 20)]),  # her dark blue
    'B': ('i', [(51, 21), (52, 21), (57, 21)]),  # her blue
}
SKIN = 'oDsbl'  # a digit d in DESIGN: the face's own skin at shade d (SKIN[d])
# The template's eye cells: the near eye five columns, the far three, three rows from the lash row; her
# x 48 and x 56 on their first columns.
TEMPLATE = {'near': (5, 3), 'far': (3, 3)}
HERS = {'near': 48, 'far': 56}
ROW = 19  # her lash row
# Her eyes on the template's cells, one row per row: a PICK character or a skin digit.
DESIGN = {
    'open': {
        'near': [
            '3kkkk',  # (her hair, the face's skin under it) her lash
            '3kWpp',  # the lash turning down the outer corner; her grey white and dark blues
            '22GBB',  # her skin's shadow under the corner; her bright white and blues
        ],
        'far': [
            '2kk',  # her skin's shadow under the bangs; her lash
            '2pk',  # the eye's inner corner (her tone there is nearer the shadow than the dark); her dark blue; the face's black line
            '4B0',  # light skin; her blue; the face's line (the template's own outline there)
        ],
    },
    'lowered': {
        'near': [
            '33333',  # the lowered lid's skin
            '3kkkk',  # her lash, a row down
            '22GBB',  # the lower row of her eye
        ],
        'far': [
            '23k',
            '2kk',
            '4B0',
        ],
    },
    'closed': {
        'near': [
            '33333',
            '3kkkk',  # her lash closed down a row across the shut eye
            '22333',
        ],
        'far': [
            '23k',
            '2kk',
            '430',
        ],
    },
}


def native(path):
    """Her pixels: the median colour of each cell's middle (5 x 5 picture pixels), SIZE x SIZE x 3."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    assert a.shape[:2] == (round(PITCH * SIZE),) * 2, a.shape
    out = np.zeros((SIZE, SIZE, 3), np.int32)
    for y in range(SIZE):
        for x in range(SIZE):
            y0, x0 = int(round(y * PITCH + 2.5)), int(round(x * PITCH + 2.5))
            out[y, x] = np.median(a[y0:y0 + 5, x0:x0 + 5].reshape(-1, 3), 0).round()
    return out


def tones(N):
    """Each PICK character's colour: the mean of its pixels of hers."""
    out = {}
    for ch, (_, cells) in PICK.items():
        c = np.mean([N[y, x] for x, y in cells], 0).round().astype(int)
        out[ch] = '#%02x%02x%02x' % tuple(c)
    return out


def build(T):
    """Each state's eyes: (letters, colours) rows, colours None where her skin shows."""
    out = {}
    for state, eyes in DESIGN.items():
        out[state] = {}
        for name, rows in eyes.items():
            tw, th = TEMPLATE[name]
            assert len(rows) == th and all(len(r) == tw for r in rows), (state, name)
            letters, cols = [], []
            for row in rows:
                lt, cl = '', []
                for ch in row:
                    if ch in PICK:
                        lt += PICK[ch][0]
                        cl.append(T[ch])
                    else:
                        lt += SKIN[int(ch)]
                        cl.append(None)
                letters.append(lt)
                cols.append(cl)
            out[state][name] = (letters, cols)
    return out


def palette(states):
    """One character per colour of hers, in order of first use."""
    chars = 'abcdefhijklmnpqrstuvwxyz'
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


def write_ts(path, states, seen, iris):
    out = [
        "// The owner's Saya's eyes in her pixels and colours (tools/refs/saya-eyes-from-ref.py from",
        '// docs/reference/saya-game-scale-owner-reference.jpg, his picture at our scale). Generated: rerun the script to change it.',
        '',
        "import type { PaintedEye } from './eyeArt';",
        '',
        '/** Her colours, one character each. */',
        'export const SAYA_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{v}'," for k, v in seen]
    out += ['};', '']
    docs = {
        'open': 'Her eyes as he drew them: the black lash turning down the outer corner, her whites and blues; the far eye at the face\'s black line.',
        'lowered': 'Reading: her lash comes down a row over the lower row of her eye.',
        'closed': 'Knocked out: her lash closes down a row across the shut eye; skin over and under it.',
    }
    out += ["/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out), on the template's eye cells: the near eye five cells wide, the far three, both three rows tall ('.' where her skin shows). */",
            "export const SAYA_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {"]
    for state, eyes_ in states.items():
        out += [f'  /** {docs[state]} */', f'  {state}: {{']
        for name in ('near', 'far'):
            rows, col = eyes_[name]
            out += [f'    {name}: {{', f'      letters: [{", ".join(repr(r) for r in rows)}],', f'      rows: [{", ".join(repr(r) for r in encode(col, seen))}],', '    },']
        out += ['  },']
    out += ['};', '',
            "/** Her eyes' letters on the template's eye cells, in each lid state. */",
            "export const SAYA_EYE_CELLS: Record<'open' | 'lowered' | 'closed', { near: string[]; far: string[] }> = {"]
    for state, eyes_ in states.items():
        near, far = eyes_['near'][0], eyes_['far'][0]
        out += [f'  {state}: {{ near: [{", ".join(repr(r) for r in near)}], far: [{", ".join(repr(r) for r in far)}] }},']
    out += ['};', '',
            "/** Her blue: the player's eye colour moves her iris as far. */",
            f"export const SAYA_IRIS = '{iris}';", '']
    src = '\n'.join(out)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(src)
    os.replace(tmp, path)


def rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def save(a, path, k):
    Image.fromarray(np.asarray(a, np.uint8)).resize((a.shape[1] * k, a.shape[0] * k), Image.NEAREST).save(path)


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    N = native(ref)
    T = tones(N)
    states = build(T)
    seen = palette(states)
    if len(sys.argv) > 3:
        write_ts(sys.argv[3], states, seen, T['B'])

    # The study: each state's eyes on the template's cells (white where her skin shows), and her own
    # pixels there, the template's twelve columns from her x 48.
    w = 12
    sheet = np.full((3 * 4 + 1, w + 2, 3), 200, np.int32)
    for k, eyes_ in enumerate(states.values()):
        for name, x0 in (('near', 1), ('far', 1 + 9)):
            for r, row in enumerate(eyes_[name][1]):
                for c, px in enumerate(row):
                    sheet[k * 4 + 1 + r, x0 + c] = rgb(px) if px is not None else (255, 255, 255)
    save(sheet, os.path.join(out, 'eyes@16.png'), 16)
    save(N[ROW - 2:ROW + 8, HERS['near'] - 1:HERS['far'] + 4], os.path.join(out, 'hers@16.png'), 16)
    print(len(seen), 'colours:', ' '.join(f'{k}={v}' for k, v in seen))


if __name__ == '__main__':
    main()
