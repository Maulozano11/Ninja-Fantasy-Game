"""The owner's Elise's eyes (docs/reference/elise-owner-reference.jpg) as the 'azure' eye shape.

His Elise is his own pixel art, 7.81 picture pixels to one of hers (tools/refs/heroine_ref.py), so
her eyes are not lifted 1:1 as Aiden's were. Her eyes as he drew them (her pixels, x 94-112, y 25-33):

  near  a thin dark brown brow two rows over the eye (y 25), its inner end a row lower (y 26); a
        thick black lash two rows deep (y 27-28) that runs out past the eye's outer corner and turns
        down round it (y 29-30), its inner end tapering off in browns over the inner corner; under it
        a big eye four rows tall (y 29-32): white on the outer side (its top row a shaded grey), then
        a blue iris four wide, dark on top (dark blue, his white glint, a navy pupil two rows tall,
        a deep blue) and bright below (cyan, blue, light blue); a rose lower lid only at the outer
        corner, a white corner at the inner end, no lower line
  far   at the face's edge: the lash runs out past the edge, a brown inner end; under it a white
        glint over her blue and the face's line; on the nose side a dark socket shadow (a skin shade,
        a dark brown, a dark rose); no brow (the hair at the face's edge covers it)

Her head is brought down to ours at about two thirds (three of her pixels to two of ours) about the
eyes, a little larger than her head's 0.51 x 0.56 (the study's SEGMENTS): at 0.5 her eye would be
our template's 5 x 3 cells and lose her glint, cyan and pupil, the look of her eye; at two thirds it
keeps them and matches the study's reduced reference (an eye of a lash and three rows). Each cell of
ours takes the colour of the pixel of hers it stands for (PICK, her pixels by their place in her
picture, quantized to her palette, heroine_ref.PALETTES['elise']), laid out over our face template's
eye cells (DESIGN):

  near  seven columns from the template's near eye (its five and two toward the nose, for the lash's
        inner end and the brow's), six rows: the brow, its inner end, the lash a row above the
        template's lash row, then three rows of eye down to the template's last eye row (her eye
        grows up, so her mouth and chin stay where ours are, as hers are below her eyes)
  far   five columns from a column left of the template's far eye (her socket shadow) to a column
        past the face's edge (the lash's tip, as our women's far lash pokes out there), the same rows

Every cell is written with the template's letters, so the face, the eye options' code and Ocular
Surge read them as they read ours:

  B  her brow: hair-coloured, as our brows are (her browns move the way her hair's main yellow does)
  L  her lash and its brown ends           h  her shaded white        w  her white and glint
  d  her pupil and dark blues              i  her bright blues        (her iris moves the way the
                                                                      eye colour moves her blue)
  s D  her skin's shades round the eye (the lower lid, the far socket): her pixels, moved the way
       the skin tone moves her skin
  o D s b l  (0-4 in DESIGN) the face's own skin, no pixel of hers (only on the template's eye cells)

Two lid states the game needs that her picture does not show, made of her pixels:

  lowered  (reading) her lash comes down two rows, over all but the lower row of her eye, as our
           lowered lids leave one row: its browns and the far eye's tip with it
  closed   (knocked out) her lash closes down two rows across the shut eye, its outer end hanging a
           row lower; skin over and under it, as our closed eyes

Writes, in <out>:

  eyes@16.png   her eyes at our scale, open, lowered and closed, at 16x (white where the face's own
                skin shows on the template's eye cells)
  hers@16.png   her own pixels there (x 92-114, y 23-35), at 16x

and, with a third argument, the game's module (src/sprite/eliseEyeArt.ts). The same picture always
gives the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/elise-eyes-from-ref.py docs/reference/elise-owner-reference.jpg <out> src/sprite/eliseEyeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import heroine_ref as R  # noqa: E402

WHICH = 'elise'
# Each cell's colour: the template letter it is, and the pixel of hers (x, y in her 190 x 256) whose
# colour it takes.
PICK = {
    'e': ('B', (97, 25)),  # her brow, dark brown
    'K': ('L', (97, 28)),  # her lash, black
    'k': ('L', (99, 28)),  # her lash, the lighter black (its ends, the far lash)
    'r': ('L', (101, 27)),  # the brown the lash's inner end tapers into (the far lash's inner end)
    'n': ('L', (103, 27)),  # the dark brown at the lash's inner end (the far eye's inner corner)
    'h': ('h', (96, 29)),  # her shaded white, under the lash
    'w': ('w', (96, 30)),  # her white (and the glints, the same white)
    'd': ('d', (98, 29)),  # her dark blue
    'p': ('d', (100, 29)),  # her pupil, navy
    'q': ('d', (99, 30)),  # her deep blue
    'c': ('i', (98, 30)),  # her cyan
    'B': ('i', (98, 31)),  # her blue, the iris's main colour
    'v': ('i', (101, 31)),  # her light blue
    'x': ('s', (96, 32)),  # her lower lid at the outer corner, a rose skin shade
    'Z': ('s', (108, 29)),  # the far eye's socket, a skin shade under the lash
    'z': ('D', (108, 31)),  # the far eye's socket, a dark rose
}
SKIN = 'oDsbl'  # a digit d in DESIGN: the face's own skin at shade d (SKIN[d])
# Where each eye's first cell is from the template's eye cells (columns, rows): both start three rows
# above its lash row (her brow), the near eye at its first column, the far one a column left of it.
AT = {'near': (0, -3), 'far': (-1, -3)}
# The template's eye cells: the near eye five columns, the far three, three rows from the lash row.
TEMPLATE = {'near': (5, 3), 'far': (3, 3)}
# Her eyes at our scale, one row per row from the AT row: a PICK character, a skin digit (only on the
# template's eye cells, which take one or the other everywhere), or '.' (nothing of hers).
DESIGN = {
    'open': {
        'near': [
            '.eeee..',  # her brow (y 25)
            '....eee',  # its inner end, a row lower (y 26)
            'kKKKkrn',  # her lash, its inner end tapering off in browns (y 27-28)
            'khdwpk.',  # the lash turning down the outer corner; shaded white, dark blue, glint, pupil; the inner corner
            'Kwcqp..',  # the lash's outer end; white, cyan, deep blue, pupil
            '2xwBv..',  # the face's shadow; her lower lid at the corner, white, blue, light blue
        ],
        'far': [
            '.....',
            '.....',
            '.rKKk',  # her lash out past the face's edge, its brown inner end
            'Zkkk.',  # the socket under the lash; the lash
            'nwkk.',  # the dark brown inner corner, her glint, the lash down the face's edge
            'zdk0.',  # the socket's dark rose, her blue, the lash, the face's line
        ],
    },
    'lowered': {
        'near': [
            '.eeee..',
            '....eee',
            '.......',  # the lid's skin
            '33333..',
            'kKKKkrn',  # her lash, two rows down, over the eye
            '2xwBv..',  # the lower row of her eye
        ],
        'far': [
            '.....',
            '.....',
            '.....',
            '.330.',
            '.rKKk',  # her lash, two rows down, with its tip
            'zdk0.',  # the lower row of her far eye
        ],
    },
    'closed': {
        'near': [
            '.eeee..',
            '....eee',
            '.......',
            '33333..',
            'kKKKkr.',  # her lash closed across the shut eye
            'K3333..',  # its outer end hanging down
        ],
        'far': [
            '.....',
            '.....',
            '.....',
            '.330.',
            '.kKKk',  # her lash closed, with its tip
            '.330.',
        ],
    },
}
# The colours her eyes follow: her iris's main blue (the eye colour of her preset), her hair's main
# yellow (the colour most of her hair is drawn in, her hair's colour slot), her skin (her face's base).
IRIS = '#1276b0'
BROW_HAIR = '#f8dc92'
SKIN_HEX = '#facdac'
# The rest of her face round her eyes, in her colours: our face template's skin shades (its line,
# crease, shadow, base and light: SKIN) taken to her face's tones (her black line round the jaw, her
# soft rose shadows under her base, no darker line on her cheek), and our mouth (lip, crease) to
# hers: one short muted rose line. Her black line is not moved by the skin tone.
FACE_TONES = {'o': '#080613', 'D': '#d68271', 's': '#e59580', 'b': '#facdac', 'l': '#facdac'}
MOUTH = {'m': '#d68271', 'M': '#b76660'}
for _h in list(FACE_TONES.values()) + list(MOUTH.values()):
    assert _h in R.PALETTES[WHICH], _h


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
            assert len({len(r) for r in rows}) == 1 and len(rows) == 6, (state, name)
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


def template(letters, name):
    """An eye's letters on the template's eye cells (the face template's eye rows)."""
    (dx, dy), (tw, th) = AT[name], TEMPLATE[name]
    return [row[-dx:-dx + tw] for row in letters[-dy:-dy + th]]


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
    q = lambda rows: '[' + ', '.join(repr(r) for r in rows) + ']'
    out = [
        "// The owner's Elise's eyes, her colours (tools/refs/elise-eyes-from-ref.py from",
        '// docs/reference/elise-owner-reference.jpg, brought down to our scale). Generated: rerun the script to change it.',
        '',
        "import type { PaintedEye } from './eyeArt';",
        '',
        '/** Her eyes in one lid state, and their letters on the face template\'s eye cells (near 5 x 3, far 3 x 3). */',
        'export interface AzureEyes {',
        '  near: PaintedEye;',
        '  far: PaintedEye;',
        '  template: { near: string[]; far: string[] };',
        '}',
        '',
        '/** Her colours, one character each. */',
        'export const AZURE_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{v}'," for k, v in seen]
    out += ['};', '',
            "/** Where each eye's first cell is from the template's eye cells (columns, rows): both three rows above its lash row (her brow), the far eye a column left of it (her socket shadow). */",
            "export const AZURE_EYE_AT: Record<'near' | 'far', readonly [number, number]> = { near: [%d, %d], far: [%d, %d] };" % (AT['near'] + AT['far']),
            '']
    docs = {
        'open': "Her eyes as he drew them: her brow, her lash a row above our lash row, her big eye under it (white, glint, pupil, blues); the far eye's glint at the face's edge.",
        'lowered': 'Reading: her lash comes down two rows, over all but the lower row of her eye.',
        'closed': 'Knocked out: her lash closes down two rows across the shut eye, its outer end hanging down; skin over and under it.',
    }
    out += ["/** Her eyes in each lid state, from AZURE_EYE_AT: the near eye seven cells wide, the far five, both six rows tall (brow, lash, three rows of eye). */",
            "export const AZURE_EYES: Record<'open' | 'lowered' | 'closed', AzureEyes> = {"]
    for state, eyes_ in states.items():
        out += [f'  /** {docs[state]} */', f'  {state}: {{']
        for name in ('near', 'far'):
            rows, col = eyes_[name]
            out += [f'    {name}: {{', f'      letters: {q(rows)},', f'      rows: {q(encode(col, seen))},', '    },']
        out += [f"    template: {{ near: {q(template(eyes_['near'][0], 'near'))}, far: {q(template(eyes_['far'][0], 'far'))} }},", '  },']
    out += ['};', '',
            "/** Her iris's main blue: the player's eye colour moves her iris as far. */",
            f"export const AZURE_IRIS = '{IRIS}';", '',
            "/** Her hair's main yellow, whose browns her brows are: the hair colour moves them as far. */",
            f"export const AZURE_BROW_HAIR = '{BROW_HAIR}';", '',
            "/** Her skin, whose shades are round her eyes: the skin tone moves them as far. */",
            f"export const AZURE_SKIN = '{SKIN_HEX}';", '',
            "/** The face template's skin shades (line, crease, shadow, base, light) in her face's tones: the skin tone moves them as far (her black line stays). */",
            'export const AZURE_FACE: Record<string, string> = { ' + ', '.join(f"{k}: '{v}'" for k, v in FACE_TONES.items()) + ' };', '',
            "/** Her mouth for the template's lip and crease: one short muted rose line (the skin tone moves it as far). */",
            'export const AZURE_MOUTH: Record<string, string> = { ' + ', '.join(f"{k}: '{v}'" for k, v in MOUTH.items()) + ' };', '']
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
    # her skin and hair colours named above are hers
    for h in (IRIS, BROW_HAIR, SKIN_HEX):
        assert h in R.PALETTES[WHICH], h
    if len(sys.argv) > 3:
        write_ts(sys.argv[3], states, seen)

    # The study: each state's eyes over a grey ground (white where the face's own skin shows on the
    # template's eye cells), and her own pixels there.
    gap = 9
    h, w = 6, 1 + 7 + 1 + 5 + 1
    sheet = np.full((h * 3 + 4, w + 2, 3), 200, np.int32)
    for k, eyes_ in enumerate(states.values()):
        for name, x0 in (('near', 1 + AT['near'][0]), ('far', 1 + gap + AT['far'][0])):
            rows, col = eyes_[name]
            for r, row in enumerate(col):
                for c, px in enumerate(row):
                    if px is not None:
                        sheet[k * (h + 1) + 1 + r, x0 + c] = rgb(px)
                    elif rows[r][c] != '.':
                        sheet[k * (h + 1) + 1 + r, x0 + c] = (255, 255, 255)
    R.save(sheet, os.path.join(out, 'eyes@16.png'), k=16)
    R.save(N[23:35, 92:114], os.path.join(out, 'hers@16.png'), k=16)
    print(len(seen), 'colours:', ' '.join(f'{k}={v}' for k, v in seen))


if __name__ == '__main__':
    main()
