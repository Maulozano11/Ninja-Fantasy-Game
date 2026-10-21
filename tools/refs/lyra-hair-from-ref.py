"""Lyra's hair (docs/reference/lyra-owner-reference.jpg, the owner's first heroine) as a hairstyle.

Her picture is about two and a half times our scale (heroine_ref.py: one of her pixels is 7.8 picture
pixels, she is 256 of them tall, ours 91), so her hair cannot be lifted pixel for pixel as Aiden's
was. It is brought down to our scale over her picture laid on our female rig at idle frame 0
(heroine_ref.SEGMENTS: her head scaled about her eyes onto ours, her long hair on the 'hair' map down
our back, her braid on the torso's), pixel by pixel in her colours only (PALETTES['lyra'], checked
here), keeping her dark line, the shapes of her locks and the details that read at our size:

  HEAD   over the head (hairFront): the crown lit from the upper left, the fringe sweeping over the
         forehead to the far side, the dark far lock hanging past the cheek to the jaw with its tip
         curling out, the hair over the back of the head down to the braid, the gold pin (a ring on a
         short stick, 'pin' below) in the hair above the ear, the black bow at the back of the head
         ('bow'), and her ear between the locks. Where her picture shows forehead and cheek, our face
         shows: the face is ours (our eyes, both of them whole), the hair frames it as hers frames
         hers. Her ear is drawn in the player's skin (EAR: our skin ramp's shades).
  LONG   behind the body (hairBack): her waist-long hair, three wavy locks from under the head down
         our back, the outer one swinging out past the near arm and curling back with its tip flicked
         out, the next one ending below it, the dark hair behind the arm and the body to the waist.
         What our body hides is continued from what shows.
  BRAID  in front of the near shoulder (hairFront, behind the near arm): the thick braid from under
         her ear down over the shoulder onto the chest, its plaits lit from the upper left.

The pieces are rows of KEY characters ('.' empty) in our 256 x 256 frame at the female idle frame 0;
each rides our face anchor (src/sprite/body.ts faceAnchor: the near eye's lash start, (123, 141)
there), so they move as one with the head. LONG and BRAID also turn with the torso (their angle is
our idle torso's). The colour slots: her mid auburn moves every hair colour of hers (her line stays),
the bow's greys follow the ribbon colour and the pin's golds the ornament colour.

Writes, in <out>: pieces@8.png (the three pieces together, at 8x) and reduced@8.png (the reduced
reference there, heroine_ref.reduced), and with a second argument the game's module
(src/sprite/items/lyraHairArt.ts). The same input always gives the same bytes. From the repo root:

  python3 -I tools/refs/lyra-hair-from-ref.py <out> [src/sprite/items/lyraHairArt.ts]
"""

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import heroine_ref as R  # noqa: E402

# Her colours used here, one character each.
KEY = {
    # her hair: her black line, then her auburns darkest first
    'k': '#04010d', 'J': '#3b0d21', 'q': '#590f26', 'Q': '#691f24', 'p': '#963b2b', 'h': '#a6442d',
    'P': '#b24f33', 'H': '#d07344',
    # the bow: her greys
    'X': '#2a2a37', 'e': '#404049', 'E': '#464654', 'f': '#565862',
    # the pin: her golds
    'O': '#9c5d27', 'o': '#ce9242', 'Y': '#e8b45e', 'G': '#f4c66e', 'y': '#fdd36c',
    # her ear: her skin (drawn in the player's, EAR)
    'S': '#fdceb0', 's': '#eea692', 'z': '#df9180', 'Z': '#c8756a',
}
LINE = 'k'
BOW = 'XeEf'
PIN = 'OoYGy'
# Her ear in our skin ramp's shades (src/sprite/body.ts: 1 dark, 2 shade, 3 base, 4 light): her skin
# is our base, her pinks our shades.
EAR = {'S': 3, 's': 2, 'z': 2, 'Z': 1}
# Her mid auburn (the lit face of most locks), the bow's mid grey and the pin's mid gold: the colour
# slots' defaults, which every other colour of theirs follows.
BASE = {'hair': '#a6442d', 'ribbon': '#404049', 'ornament': '#ce9242'}

# Our face anchor and our torso's angle (pelvis to neck, screen degrees) at the female idle frame 0.
ANCHOR = (123, 141)
TORSO_ANGLE = -89.5

# (x0, y0, rows) in our frame at the female idle frame 0.
HEAD = (104, 125, [
    '...............kkkkkkkk.............',  # 125
    '.............kkQhhhhJQQkk...........',  # 126
    '...........kQQhHHhhhhQJhhQk.........',  # 127
    '..........khHHhhQhhhhhhQJhhQk.......',  # 128
    '.........khhhhpHhhhhhQQQQQhhpk......',  # 129
    '........khhhhhyGhhhhhhhhhhJQhhk.....',  # 130
    '.......kQhhhhYJpohQhhhhhhhhJQQhk....',  # 131
    '.......kQQhQhoJpOJQHhhHhQJhJhhhhk...',  # 132
    '......kQQhJJJhoOhQHhHHHhhhQhJhhhk...',  # 133
    '......kJJhJhYhphJhhhhhJQJJJQJJHQhk..',  # 134
    '.....kpphhhoJJpJJhhhhQ.......JJhpk..',  # 135
    '.....kpJJpoQQQQJhhhhQ........JQhhpk.',  # 136
    '..kkkJJQQOQJJJJhhhhhJ........JJhhpk.',  # 137
    '.kfEXkJJJJJQQhhhhQhh..........JQhpk.',  # 138
    '.kEeXXkJJJJJJJQQhQ..............Jhpk',  # 139
    '.kXXkXkQJJJJSSshJ...............Jhpk',  # 140
    '..kkEXkQQJQJSZshJ...............Jhpk',  # 141
    '..kEXkQQQQQJSZzhJ...............JQpk',  # 142
    '.kfeXkQQhQQJSzJhJ..............JQhpk',  # 143
    'kEeXkhhQQhhJsSJpJ..............JQhpk',  # 144
    'kkXkQhQhQQQJJsJQJ..............JQpk.',  # 145
    '.kk.hJhhQJQhJhQJQ..............JQk..',  # 146
    '....pJhhQQJhhJhQJ..............Jk...',  # 147
    '....hhQhJJQJJhQJQ..............k....',  # 148
    '.....hQJJQJQJJJJQ...................',  # 149
])
LONG = (94, 138, [
    '..............hpQJhpQJhpQJpQ..',  # 138
    '..............hpQJhpQJhpQJpQ..',  # 139
    '..............hpQJhpQJhpQJpQ..',  # 140
    '..............hpQJhpQJhpQJpQ..',  # 141
    '..............hpQJhpQJhpQJpQ..',  # 142
    '..............hpQJhpQJhpQJpQ..',  # 143
    '..............hpQJhpQJhpQJpQ..',  # 144
    '..............hpQJhpQJhpQJpQ..',  # 145
    '.........kHPhphpQJhpQJhpQJpQk.',  # 146
    '........kHPhpJPhpQqQqJpQqJQJk.',  # 147
    '........kHPhpPhppQqQqJpQqJQJk.',  # 148
    '.......kHPhpJPhppQqQqJpQqJQJk.',  # 149
    '......kHhhpJPhpJpQqQqJpQqJQJk.',  # 150
    '.....kHhhpJJPhpJpQqQqJpQqJQJk.',  # 151
    '.....kHhhpJhhpJpQqpQqJpQqJQJk.',  # 152
    '....kHhhpJJhhpJpQqpQqJpQqJQJk.',  # 153
    '....kHhhpJhhpJJpQqpQqJpQqJQJk.',  # 154
    '....kHhhpJhpJJJpQqpQqJpQqJQJk.',  # 155
    '....kPhpJJhpJJJpQqpQqJpQqJQJk.',  # 156
    '....kPhpJJhpJJJpQqpQqJpQqJQJk.',  # 157
    '....kPhpJJhpJJJpQqpQqJpQqJQJk.',  # 158
    '....kPhpJJhpJJJpQqpQqJpQqJQJk.',  # 159
    '....khpQJJhpJJJpQqpQqJpQqJQJk.',  # 160
    '.....khpQhhhpJJpQqpQqJpQqJQJk.',  # 161
    '.....khpQJhhpJpJpQqQqJpQqJQJk.',  # 162
    '.....khpQJhhpJpJpQqQqJpQqJQJk.',  # 163
    '....kPhpkkkhhppQJpQqqJpQqJQJk.',  # 164
    '...kHpkk..khhppQJpQqqJpQqJQJk.',  # 165
    '....kk....khpQpQJpQqqJpQqJQJk.',  # 166
    '...........khpQQqJpQqJpQqJQJk.',  # 167
    '...........khpQQqJpQqJpQqJQJk.',  # 168
    '............kpQQqJpQqJpQqJkk..',  # 169
    '............kpQQqJJpQqpQqJk...',  # 170
    '.............kQQqJJpQqpQqJk...',  # 171
    '.............kpQqJJpQqpQqJk...',  # 172
    '.............kpQqJpQJpQQqk....',  # 173
    '.............kpQqJpQJpQkk.....',  # 174
    '..............kQqJpQqpQk......',  # 175
    '...............kkkkQqkk.......',  # 176
    '...................kk.........',  # 177
])
BRAID = (116, 146, [
    'kHhQk.....',  # 146
    'kPhpJk....',  # 147
    '.kJQHhk...',  # 148
    '.kHhpQk...',  # 149
    '..kQPhJk..',  # 150
    '..kJQHhk..',  # 151
    '...kHhpQk.',  # 152
    '...kQPhJk.',  # 153
    '...kJQHhk.',  # 154
    '....kHhpQk',  # 155
    '....kQPhJk',  # 156
    '....kJQHhk',  # 157
    '....kHhpQk',  # 158
    '.....kPhJk',  # 159
    '.....kQHhk',  # 160
    '.....kHpk.',  # 161
    '......kQk.',  # 162
    '......kk..',  # 163
])
PIECES = {'HEAD': HEAD, 'LONG': LONG, 'BRAID': BRAID}


def check():
    """Every character is a colour of hers (KEY), every KEY colour is one of her picture's."""
    pal = set(R.PALETTES['lyra'])
    for ch, hex_ in KEY.items():
        assert hex_ in pal, f'{ch} {hex_} is not one of her colours'
    for name, (_, _, rows) in PIECES.items():
        for j, row in enumerate(rows):
            for ch in row:
                assert ch == '.' or ch in KEY, f'{name} row {j}: {ch!r} is not in KEY'


def frame(pieces):
    """The pieces drawn in order into an RGBA frame (GRID x GRID)."""
    out = np.zeros((R.GRID, R.GRID, 4), np.uint8)
    for x0, y0, rows in pieces:
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != '.':
                    h = KEY[ch]
                    out[y0 + j, x0 + i] = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255]
    return out


def ts_part(name, doc, piece, angle=None):
    x0, y0, rows = piece
    w = max(len(r) for r in rows)
    kind = 'PaintedPiece' if angle is not None else 'PaintedPart'
    out = [f'/** {doc} */', f'export const {name}: {kind} = {{', f'  pivot: [{ANCHOR[0] - x0}, {ANCHOR[1] - y0}],']
    if angle is not None:
        out.append(f'  angle: {angle},')
    out.append('  rows: [')
    out += [f"    '{r.ljust(w, '.')}'," for r in rows]
    out += ['  ],', '  colors: LYRA_HAIR_COLORS,', '};', '']
    return '\n'.join(out)


def module():
    used = sorted({ch for _, _, rows in PIECES.values() for r in rows for ch in r if ch != '.'}, key=list(KEY).index)
    out = [
        "// Lyra's hair, the owner's first heroine (tools/refs/lyra-hair-from-ref.py from",
        '// docs/reference/lyra-owner-reference.jpg), brought down to our scale in her colours. Generated: rerun',
        '// the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        "import type { PaintedPart } from './capeArt';",
        '',
        '/** One character per colour of hers (all the pieces share them). */',
        'export const LYRA_HAIR_COLORS: Record<string, string> = {',
    ]
    out += [f"  {ch}: '{KEY[ch]}'," for ch in used]
    out += ['};', '']
    out.append(ts_part('LYRA_HAIR_HEAD', 'Over the head (hairFront): crown, fringe, far lock, the back of the head, the pin, the bow and her ear. Its pivot is the cell on our face anchor.', HEAD))
    out.append(ts_part('LYRA_HAIR_LONG', 'Behind the body (hairBack): her waist-long wavy hair. Pivot on our face anchor; it turns with the torso (angle: our idle torso\'s).', LONG, TORSO_ANGLE))
    out.append(ts_part('LYRA_HAIR_BRAID', 'In front of the near shoulder (hairFront, behind the near arm): her braid. Pivot on our face anchor; it turns with the torso.', BRAID, TORSO_ANGLE))
    out += [
        '/** Her dark line: kept as she drew it when the hair is recoloured. */',
        f"export const LYRA_HAIR_LINE = '{LINE}';",
        '/** The bow (its greys follow the ribbon colour) and the pin (its golds follow the ornament colour). */',
        f"export const LYRA_HAIR_BOW = '{BOW}';",
        f"export const LYRA_HAIR_PIN = '{PIN}';",
        "/** Her ear, in our skin ramp's shades. */",
        'export const LYRA_HAIR_EAR: Record<string, number> = { ' + ', '.join(f'{k}: {v}' for k, v in EAR.items()) + ' };',
        '/** The colour slots\' defaults: her mid auburn, the bow\'s mid grey, the pin\'s mid gold. */',
        f"export const LYRA_HAIR_BASE = '{BASE['hair']}';",
        f"export const LYRA_RIBBON_BASE = '{BASE['ribbon']}';",
        f"export const LYRA_PIN_BASE = '{BASE['ornament']}';",
        '',
    ]
    return '\n'.join(out)


def main():
    check()
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    box = (92, 120, 146, 182)
    crop = lambda a: a[box[1]:box[3], box[0]:box[2]]
    R.save(crop(frame([LONG, HEAD, BRAID])), os.path.join(out, 'pieces@8.png'))
    R.save(crop(R.reduced('lyra')), os.path.join(out, 'reduced@8.png'))
    if len(sys.argv) > 2:
        tmp = sys.argv[2] + '.tmp'
        with open(tmp, 'w') as f:
            f.write(module())
        os.replace(tmp, sys.argv[2])


if __name__ == '__main__':
    main()
