"""Lyra below the waist: her pleated skirt, her tabard and her belt, at our scale, in her colours.

From the owner's Lyra (docs/reference/lyra-owner-reference.jpg; tools/refs/heroine_ref.py reads her
pixels): a short charcoal skirt in knife pleats with a red stripe in every fold and a red hem; the long
cream tabard open at the front from the belt to the calves, edged in red and gold, with a gold scroll on
the near hip and its grey-brown lining showing between and beside the legs; the dark leather belt with
its steel buckle, the gold-edged leather flap under it at the front and the red leather pouch capped in
steel at the far hip.

Her picture is 2.6 times our size and her body is not ours (heroine_ref.py: she is 5.4 heads tall, ours
4.1; our hips are wider for the height), so nothing here is copied pixel for pixel: every piece is drawn
by hand at our scale on our female body at idle frame 0, after her picture and the reduced reference
(heroine_ref.reduced('lyra'), the study's layout of her on our body), in her colours only (every colour
below is one of heroine_ref.PALETTES['lyra']; the script checks it). Her design at our size:

  skirt   five pleats from the near hip to the far one, each fold a black crease with her dark red
          stripe beside it (a darker red under the belt and above the hem), the faces her charcoal
          greys lit toward the front, her red hem two rows deep under a black line
  tabard  front: the near panel over the hip from the belt to the skirt's hem, its front edge running
          down and back toward the near thigh (the skirt shows between the panels, as in her picture)
          with her gold and red edging and her gold scroll; the far panel's edge at the far hip, gold
          and red, behind the far hand
          near: the near panel below the skirt, behind the near leg, widening to the calf, its hem cut
          to a point with her red band between two gold lines and cream teeth biting into it
          back: her grey-brown lining behind the legs (what her picture shows between them, continued
          behind the legs), the far panel's cream outer edge and its red and gold hem
  belt    two rows of her dark leather between black lines, her steel buckle on the near side, the
          gold-edged leather flap under the belt at the front, her red pouch with its steel cap at the
          far hip

What her picture hides was continued from what shows: the skirt under the panels and the belt, the
lining behind the legs, the near panel behind the near leg and the blade.

Writes the pieces as text grids (one character per colour of hers, '.' empty) placed in our 256 x 256
frame at the female idle, and which characters each colour slot recolours, to
src/sprite/items/lyraLowerArt.ts (src/sprite/items/lyraLower.ts carries them onto the rig). Same input,
same bytes.

    python3 -I tools/refs/lyra-lower-from-ref.py src/sprite/items/lyraLowerArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import heroine_ref as H  # noqa: E402

# Her colours used here, one character each (all from heroine_ref.PALETTES['lyra']).
KEY = {
    # her black line
    'k': '#04010d',
    # the skirt's charcoal, darkest to lightest
    'X': '#2a2a37', 'e': '#404049', 'm': '#464654', 'E': '#565862', 't': '#686a74',
    # her reds: the stripes and hems, the pouch
    'J': '#3b0d21', 'q': '#590f26', 'r': '#8c1c35', '%': '#300918', '0': '#691f24',
    # the tabard's cream, lightest to darkest, and its grey-brown lining
    'c': '#f6e8cd', 'C': '#e4d0af', 'u': '#cfb599', 'v': '#cbb194', 'V': '#ac937a', 'l': '#9a7e6a',
    'L': '#795d58', 'b': '#634947',
    # her gold
    'G': '#f4c66e', 'Y': '#e8b45e', 'o': '#ce9242', 'g': '#be8442',
    # the belt's dark leather
    'K': '#160a17', '5': '#2a1c24', 'n': '#352628', 'N': '#473435', '6': '#503b3c', '^': '#6c4636',
    # her steel
    'f': '#d4e4ea', 'i': '#b0b6bc', '3': '#98a4aa', 'I': '#788c9a', '8': '#727882',
}

# Each piece: (left column, top row) in our frame at the female idle, and its rows.
PIECES = {
    # bottom_striped_pleats: the skirt (torso.bottom)
    'SKIRT': (112, 170, [
        '.kkkkkkkkkkkkkkkkkkkkkkkkk.',
        'kXXkJXXXkJXXXXkJXXXXkJXXXXk',
        'kXekqXeekqXeeekqXeeekqXeeXk',
        'kXekqXemkqXmEmkqXmmekqXeeXk',
        'kXekqXmmkqXEEmkqXmEmkqXmeXk',
        'kXekqXmEkqXEtEkqXmEmkqXmeXk',
        'kXekqXmmkqXEXmkqXmXekqXeeXk',
        'kXekqXmmkqXmXmkqXmXekqXeXXk',
        'kXXkqXmekqXmXmkqXeXekqXeXXk',
        'kXXkqXeekqXeXekqXeXekqXXXXk',
        'kXXkJXeXkJXeXXkJXXXXkJXXXXk',
        'krrkqrrrkqrrrrkqrrrrkqrrrqk',
        'kqrkqqrrkqqrrrkqqrrrkqqrqqk',
        '.kkkkkkkkkkkkkkkkkkkkkkkkk.',
    ]),
    # skirt_gilded_tabard: over the hips and the skirt (skirt)
    'TABARD_FRONT': (106, 170, [
        '............................kkkkkkk.',
        '......kkkkkkkkkkkkkk........kGrCCvk.',
        '......kccCCCCCCCCrGk........kGrCCvk.',
        '......kccCCCCYGGCrGk.........kGrCvk.',
        '.....kccCCCCYrrrrGk..........kGrCvk.',
        '....kccCCCCCYrCrGk............kGrvk.',
        '....kccCCCCCvYoGk.............kGrCvk',
        '...kccCCucCvvrGk...............kGrvk',
        '...kccCCucvvrGk................kGrvk',
        '..kccCCucvvrGk..................kGrk',
        '..kccCCuvvrGk...................kGrk',
        '.kccCCuvvrGk....................kGrk',
        '.kccCCvvrGk.........................',
        'kccCCuvvrGk.........................',
    ]),
    # the near panel below the skirt, behind the near leg (farLeg.armor)
    'TABARD_NEAR': (99, 184, [
        '.......kccCCuvVVlk',
        '......kccCCucvVVlk',
        '......kccCCucvVVlk',
        '.....kccCCucCvVVlk',
        '.....kccCCucCvVVlk',
        '....kccCCucCCvVVlk',
        '....kccCCucCCvVVlk',
        '...kccCCucCCCvVVlk',
        '...kYrrrYcCCvVVlk.',
        '..kYrrrYcCCCvVVlk.',
        '..kYrrrYcCCCvVVlk.',
        '.kYrrrYcCCCCvVVlk.',
        '.kYrrrYcCCCCvVVYk.',
        'kYrCCYcCCCCuvYYrk.',
        'kYrCCYcCCCCuYrrrk.',
        'kYrCCrYCCCYYrrrrk.',
        '.kYrrrrYCYCrrrrYk.',
        '..kYrrrrYrCrrYYk..',
        '...kYYrqrrrrYkk...',
        '....kkYrrrYYk.....',
        '......kYrYkk......',
        '.......kYk........',
        '........k.........',
    ]),
    # the lining behind the legs and the far panel (backGear)
    'TABARD_BACK': (117, 180, [
        'bbbbbbbbbbbbbbbbbbbbbkcCk........',
        'bbbbbbbbbbbbbbbbbbbbbkcCk........',
        'bbbbbbbbbbbbbbbbbbbbbbkcCk.......',
        'bbbbbbbbbbbbbbbbbbbbbbkcCk.......',
        'LLLLLLLLlVLLLlVLLLlLLLkcCk.......',
        'LLLLLLLLlVLLLlVLLLlLLLlkcCk......',
        'LLLLLLLLlVLLLlVLLLlLLLlkcCk......',
        'LLLLLLLLlVLLLlVLLLlLLLlkcCk......',
        'LLLLLLLLlVLLLlVLLLlLLLlVkcCk.....',
        'LLLLLLLLlVLLLlVLLLlLLLlVkcCk.....',
        'LLLLLLLLlVLLLlVLLLlLLLlVkcCk.....',
        'LLLLLLLLlVLLLlVLLLlLLLlVLkcCk....',
        'LLLLLLLLlVLLLlVLLLlLLLlVLkcCk....',
        'LLLLLLLLlVLLLlVLLLlLLLlVVkcCk....',
        'LLLLLLLLlVLLLlVLLLlLLLlVVkcCk....',
        'LLLLLLLLlVLLLlVLLLlLLLlVVLkcCk...',
        'LLLLLLLLlVVLLlVLLLlLLLlVVLkcCk...',
        'LLLLLLLLlVVLLlVLLLlLLLlVVLkcCk...',
        'LLLLLLLLlVVLLlVLLLlLLLlVVLLYrrk..',
        'LLLLLLLLlVVLLlVLLLlLLLlVVLLYrrk..',
        'LLLLLLLLlVVLLlVLLLlLLLlVVLLYrrk..',
        'LLLLLLLLlVVLLlVLLLlLLLlVVLLLYrrk.',
        'LLLLLLLLlVVLLlVLLLlLLLlVVLLLYrrk.',
        'LLLLLLLLlVVLkkkkkkkkkLlVVLLLYrrk.',
        'kkkkkkkkkkkk.........kkkkkkkLYYYk',
        '............................kkkkk',
        '............................kkkkk',
    ]),
    # waist_pouch_belt: the belt, its flap and the pouch (waist)
    'BELT': (114, 165, [
        '......................kkkkk.',
        '.....................kfiitIk',
        '.....................k3iI8Ek',
        '.....................kkkkkkk',
        '....kkk..............kJq0qJk',
        'kkkkfiikkkkkkkkkkkkkkkJq0qJk',
        'k6NkiKik6NNNNNN6NNNNNkJq0qJk',
        'knnkittknn5nnnnnn5nnnkJqqqJk',
        'kkkkkkkkkkkkkkkkkkkkkk%JqJ%k',
        '.........kG^6^gk......kkkkk.',
        '..........kG6gk.............',
        '...........kgk..............',
        '............k...............',
    ]),
}

# What each colour slot recolours (her black line never does), and the colour of hers it starts from:
# picking that colour keeps every pixel hers.
ROLES = {
    'SKIRT_CLOTH': ('XemEt', '#464654'),
    'SKIRT_STRIPES': ('Jqr', '#8c1c35'),
    'TABARD_CLOTH': ('cCuvVlLb', '#e4d0af'),
    'TABARD_TRIM': ('qr', '#8c1c35'),
    'TABARD_GOLD': ('GYog', '#e8b45e'),
    'BELT_LEATHER': ('K5nN6^', '#473435'),
    'BELT_STEEL': ('fi3I8tE', '#b0b6bc'),
    'BELT_POUCH': ('%Jq0', '#590f26'),
    'BELT_GOLD': ('GYog', '#e8b45e'),
}
# Which pieces each role's characters are read in (a character means one colour of hers everywhere).
ROLE_PIECES = {
    'SKIRT': ('SKIRT_CLOTH', 'SKIRT_STRIPES'),
    'TABARD': ('TABARD_CLOTH', 'TABARD_TRIM', 'TABARD_GOLD'),
    'BELT': ('BELT_LEATHER', 'BELT_STEEL', 'BELT_POUCH', 'BELT_GOLD'),
}


def check():
    pal = set(H.PALETTES['lyra'])
    for ch, hx in KEY.items():
        assert hx in pal, f'{ch} {hx} is not one of her colours'
    assert len(set(KEY.values())) == len(KEY), 'one character per colour'
    for name, (x0, y0, rows) in PIECES.items():
        assert len({len(r) for r in rows}) == 1, f'{name}: rows of different lengths'
        for r in rows:
            for ch in r:
                assert ch == '.' or ch in KEY, f'{name}: {ch!r} is not in KEY'
    for item, roles in ROLE_PIECES.items():
        used = set()
        for name, (_x, _y, rows) in PIECES.items():
            if name.split('_')[0] == item:
                used |= {ch for r in rows for ch in r if ch != '.'}
        covered = set('k')
        for role in roles:
            chars, base = ROLES[role]
            assert base in KEY.values(), f'{role}: {base} is not used here'
            covered |= set(chars)
        assert used <= covered, f'{item}: {sorted(used - covered)} recolour with no slot'


def ts_piece(name, x0, y0, rows):
    used = sorted({ch for r in rows for ch in r if ch != '.'}, key=lambda ch: list(KEY).index(ch))
    out = [f'export const LYRA_{name}: DrapedPiece = {{', f'  x: {x0},', f'  y: {y0},', '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {ch if ch.isalpha() else repr(ch)}: '{KEY[ch]}'," for ch in used]
    out += ['  },', '};', '']
    return out


def main(path):
    check()
    lines = [
        "// Lyra's skirt, tabard and belt (tools/refs/lyra-lower-from-ref.py from",
        '// docs/reference/lyra-owner-reference.jpg): drawn by hand at our scale in her colours, each piece placed',
        '// in our 256 x 256 frame on the female body at idle frame 0 (lyraLower.ts carries them onto the rig).',
        '// Generated: rerun the script to change it.',
        '',
        "import type { DrapedPiece } from './lyraLower';",
        '',
    ]
    for name, (x0, y0, rows) in PIECES.items():
        lines += ts_piece(name, x0, y0, rows)
    lines.append('/** The characters each colour slot recolours, and the colour of hers it starts from. */')
    for role, (chars, base) in ROLES.items():
        lines.append(f"export const LYRA_{role} = '{chars}';")
        lines.append(f"export const LYRA_{role}_BASE = '{base}';")
    with open(path, 'w', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
