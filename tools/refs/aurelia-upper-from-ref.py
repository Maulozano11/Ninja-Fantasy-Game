"""Aurelia's dress bodice and detached sleeves (docs/reference/aurelia-owner-reference.jpg) as painted
pieces that ride the rig: the creator's 'armor_dawn_vestment' (src/sprite/items/aureliaVestment.ts).

His Aurelia wears a white sleeveless dress: a high white collar edged in gold round the neck with a
blue gem at the throat, bare shoulders, a bodice embroidered in gold down the middle; and white
sleeves of their own, each held round the upper arm by a gold band, falling to a wide cuff edged in
gold at the wrist, open on the outer side over a grey lining. The skirt from the gold sash down (and
the sash, the belt and the pouch) is another item's (aurelia-lower): the bodice stops at the sash's
line.

At his size she is 198 of her pixels tall, ours 91, so nothing is copied 1:1: the pieces are the
reduced reference's (tools/refs/heroine_ref.py reduced('aurelia'), the hand-drawn torso of
tools/refs/heroine_paint.py PAINT['aurelia']) in her colours (heroine_paint.KEY['aurelia'], every one
a colour of her picture: checked), fitted to our female rig at idle frame 0:

  - BODICE   the collar, the gem, the bodice to the sash's line: the reduced reference's, with what
             the reduction lost of her picture (the gold piping down the near armhole, the shade at
             the foot of the bust and the shadow under it)                      pivot neck      torso.armor
  - WAIST    the bodice carried on under the sash to the hips (hidden under the sash when her skirt
             is worn; it closes the dress when it is not)                       pivot neck      torso.top
  - sleeves  refitted to our arms: the reduced reference's sleeves stop at her wrist, four of our
             pixels above ours (her arms are shorter for the figure), so each is drawn again at our
             arm's length after her picture: the gold band under the bare shoulder, the white sleeve
             widening to the cuff, the outer side open from the elbow down over her grey lining with
             her gold edge, the gold cuff at our wrist; the far sleeve after the near one, as the
             reduced reference draws it. Each is cut at the elbow into the upper arm's piece
             (pivot shoulder) and the forearm's (pivot elbow), which reaches on under the upper
             arm's so a bending elbow opens no gap             nearArm.armor; the far one farLeg.armor

In our idle pose each piece is stamped exactly as drawn here (stampPiece at its own angle); in other
poses it turns with its segment. Writes <ts> (src/sprite/items/aureliaVestmentArt.ts); the same
input always gives the same bytes. Run from the repository root with python3 -I:

  python3 -I tools/refs/aurelia-upper-from-ref.py [src/sprite/items/aureliaVestmentArt.ts]
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import heroine_ref as R  # noqa: E402
from heroine_paint import KEY, PAINT  # noqa: E402

WHICH = 'aurelia'
# Her colours by character (heroine_paint.KEY).
COLORS = dict(KEY[WHICH])
J = R.OUR_JOINTS

# ---------------------------------------------------------------------------------------------
# The pieces in our 256 x 256 frame, as they lie on our female at idle frame 0. '.' is empty.


def torso_block():
    """The reduced reference's hand-drawn torso (heroine_paint PAINT['aurelia'] 'torso'): (x0, y0, rows)."""
    for name, x0, y0, rows in PAINT[WHICH]:
        if name == 'torso':
            return x0, y0, rows
    raise SystemExit('no torso block in heroine_paint')


# Her skin in the reduced torso: our body's own skin shows there (the player's skin colour).
SKIN = set('SszZ')
# The sash's line: the bodice ends on the row above it (the sash is aurelia-lower's).
SASH_ROW = 166
# The first row under her armholes: from here down the bodice (and its waist) is our torso; above it
# our shoulders stay bare.
ARMHOLE_ROW = 156
# What her bodice has that the reduction lost, after her picture (each row replaces the reduced
# reference's; x from 111 as in its block): the gold piping down the near armhole (x 120, her x 96-97);
# the bust turning into shade at its foot and the shadow under it, a grey band broken by the gold vine
# (her y 64-70).
DETAIL = {
    155: '........kowwwwoYowwwwWk.',
    156: '........koXwwwwYwwwwwWk.',
    157: '........kowwoYoYoYowwWk.',
    158: '........kWwwwoYYYowwWCk.',
    159: '........kCcWwwoYowwcCCk.',
    160: '.........kCcWwwYwwWcCk..',
}


def bodice():
    x0, y0, rows = torso_block()
    out = []
    for i, r in enumerate(rows):
        y = y0 + i
        if y >= SASH_ROW:
            break
        r = DETAIL.get(y, r)
        out.append(''.join('.' if c in SKIN else c for c in r))
    return x0, y0, out


# The bodice carried on under the sash to the hips, after its last rows (the gold vine down the
# middle); its lower edge takes her line.
WAIST = (111, SASH_ROW, [
    '.........kWWwwwYwwwWWk..',
    '.........kWWwwoYowwWck..',
    '.........kWWwwwYwwwWck..',
    '.........kWWwwwYwwwWck..',
    '.........kWWwwwwwwwWck..',
    '.........kWWwwwwwwwWck..',
    '.........kkkkkkkkkkkkk..',
])


def sleeve(spec, x0):
    """A sleeve from rows of (y, left line's x, inside[, right end]): her line at the left and after
    the inside (or `right end` in its place)."""
    y0 = spec[0][0]
    rows = []
    for y, left, inner, *rest in spec:
        rows.append('.' * (left - x0) + 'k' + inner + (rest[0] if rest else 'k'))
    w = max(len(r) for r in rows)
    return x0, y0, [r.ljust(w, '.') for r in rows]


# The near sleeve on our near arm (our arm's outline runs from x 112-119 at row 156 to 108-113 at row
# 174; the wrist is at row 176). Her shading: white toward the light (left), cream, light grey, grey
# at the inner side; the gold band 'YoYo' over a darker gold row; from the elbow her gold edge runs
# down to the outer side over the grey lining 'v' (its fold 'V'), the white sleeve going on to the
# wrist with a gold line at its inner side; the gold cuff at the wrist.
NEAR = sleeve([
    (156, 110, 'YoYoYoYoY'),
    (157, 110, 'OYYYYYYYO'),
    (158, 110, 'wwwWWccC'),
    (159, 110, 'wwwWWccC'),
    (160, 110, 'wwwWWcC'),
    (161, 109, 'wwwwWWcC'),
    (162, 109, 'wwwWWWcC'),
    (163, 109, 'wwwWWWcC'),
    (164, 108, 'wwwWWWoC'),
    (165, 108, 'wwwWYYoC'),
    (166, 107, 'wwwWYccoC'),
    (167, 107, 'wwYYWcoC'),
    (168, 106, 'wwYVWWcoC'),
    (169, 106, 'YYvVWWcoC'),
    (170, 105, 'YvvVwWWcoC'),
    (171, 104, 'YvvVwWWcoC'),
    (172, 103, 'YvvvVwWWcoC'),
    (173, 103, 'YvvvVwWWcoC'),
    (174, 103, 'YvvvVwWWcoC'),
    (175, 103, 'YoYoYoYoYoO'),
    (176, 103, 'kkOOOOOOOOk'),
    (177, 105, 'kkkkkkkkk', ''),
], 100)

# The far sleeve on our far arm (outline x 136-137 at rows 152-163, 139-141 at rows 166-172; the
# wrist at row 175), after the near one as the reduced reference draws it: the band, the sleeve
# widening to its gold-edged opening at the outer (right) side, the cuff. Its left part lies under
# the bodice (drawn over it), so no gap opens between them.
FAR = sleeve([
    (156, 132, 'YoYoYo'),
    (157, 132, 'OYYYYO'),
    (158, 131, 'wwwwWcC'),
    (159, 131, 'wwwwWcC'),
    (160, 131, 'wwwwWWcC'),
    (161, 131, 'wwwwWWcC'),
    (162, 131, 'wwwwWWccC'),
    (163, 131, 'wwwwWWccC'),
    (164, 131, 'wwwwWWccC'),
    (165, 131, 'wwwwWWccCC'),
    (166, 131, 'wwwwWWWcCC'),
    (167, 131, 'wwwwWWWcCCY'),
    (168, 131, 'wwwwWWWcCYo'),
    (169, 132, 'wwwwWWcCYoY'),
    (170, 132, 'wwwwWWcYoYv'),
    (171, 132, 'wwwwWWcYoYvv'),
    (172, 132, 'YoYoYoYoYoYo'),
    (173, 132, 'OOOOOOOOOOOO'),
    (174, 132, 'kkkkkkkkkkkk', ''),
], 128)

# Which colours follow which of the item's colour slots (the rest, her black line, stay).
CLOTH_CHARS = 'XwWcCvV'
GOLD_CHARS = 'yYoO'
GEM_CHARS = 'gGi'
# The slots' defaults: her white, her gold, her gem.
BASE = {'cloth': COLORS['w'], 'gold': COLORS['Y'], 'gem': COLORS['G']}
# How far each piece reaches on under the one drawn over it at the elbow (fine pixels along the arm).
UNDER = 3

# ---------------------------------------------------------------------------------------------


def cells(block):
    x0, y0, rows = block
    return {(x0 + i, y0 + j): c for j, r in enumerate(rows) for i, c in enumerate(r) if c != '.'}


def seg_angle(a, b):
    return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))


def split_arm(block, side):
    """A sleeve cut at the elbow, across the upper arm: (upper, fore) cell dicts. The forearm's piece
    reaches on UNDER pixels above the cut, under the upper arm's piece, a pixel inside its line on
    either side (so a slightly bent elbow never shows it past the upper arm's line), its edge in her
    line: where a folding elbow turns it out past the upper arm's piece, the fold is closed by her
    line. In our idle pose the upper arm's piece covers all of it."""
    sh, el = J['shoulder' + side], J['elbow' + side]
    d = (el[0] - sh[0], el[1] - sh[1])
    n = math.hypot(*d)
    u = (d[0] / n, d[1] / n)
    cs = cells(block)
    near = [(dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy]
    inner = {p for p, c in cs.items() if c != 'k' and all((p[0] + dx, p[1] + dy) in cs for dx, dy in near)}
    upper, fore = {}, {}
    for (x, y), c in cs.items():
        s = (x + 0.5 - el[0]) * u[0] + (y + 0.5 - el[1]) * u[1]
        if s < 0:
            upper[(x, y)] = c
        if s >= 0:
            fore[(x, y)] = c
        elif s >= -UNDER and (x, y) in inner:
            edge = s < 1 - UNDER or any((x + dx, y + dy) not in inner for dx, dy in near)
            fore[(x, y)] = 'k' if edge else c
    return upper, fore


def along(p, a, b):
    """Where point p lies along the segment a -> b (0 at a, 1 at b)."""
    d = (b[0] - a[0], b[1] - a[1])
    return ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (d[0] ** 2 + d[1] ** 2)


def piece_ts(name, doc, cs, joint, angle):
    xs = [x for x, _ in cs]
    ys = [y for _, y in cs]
    x0, x1, y0, y1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
    rows = [''.join(cs.get((x, y), '.') for x in range(x0, x1)) for y in range(y0, y1)]
    used = sorted({c for c in cs.values()}, key=lambda c: list(COLORS).index(c))
    px, py = int(math.floor(joint[0])) - x0, int(math.floor(joint[1])) - y0
    out = [f'/** {doc} */', f'export const {name}: PaintedPiece = {{', f'  pivot: [{px}, {py}],', f'  angle: {angle:.2f},',
           '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {c}: '{COLORS[c]}'," for c in used]
    out += ['  },', '};', '']
    return '\n'.join(out)


def check():
    """Every colour is one of her picture's; every piece's character has a colour."""
    pal = set(R.PALETTES[WHICH])
    for c, h in COLORS.items():
        if h not in pal:
            raise SystemExit(f'{c} {h} is not a colour of her picture')
    for block in (bodice(), WAIST, NEAR, FAR):
        for c in cells(block).values():
            if c not in COLORS:
                raise SystemExit(f'no colour for {c!r}')


def main():
    check()
    path = sys.argv[1] if len(sys.argv) > 1 else 'src/sprite/items/aureliaVestmentArt.ts'
    torso = seg_angle(J['pelvis'], J['neck'])
    parts = [
        '// Aurelia\'s dress bodice and detached sleeves (armor_dawn_vestment), the owner\'s picture',
        '// (docs/reference/aurelia-owner-reference.jpg) brought down to our scale in her colours by',
        '// tools/refs/aurelia-upper-from-ref.py: one piece per segment of the rig, pivot on its joint, angle',
        '// the segment\'s on our female at idle frame 0. Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        f"/** Her white: the Cloth slot's default (her cloth, its creams and greys follow it). */",
        f"export const AURELIA_CLOTH = '{BASE['cloth']}';",
        f"/** Her gold: the Gold slot's default (her golds follow it). */",
        f"export const AURELIA_GOLD = '{BASE['gold']}';",
        f"/** Her gem's blue: the Gem slot's default. */",
        f"export const AURELIA_GEM = '{BASE['gem']}';",
        f"export const AURELIA_CLOTH_CHARS = '{CLOTH_CHARS}';",
        f"export const AURELIA_GOLD_CHARS = '{GOLD_CHARS}';",
        f"export const AURELIA_GEM_CHARS = '{GEM_CHARS}';",
        f"/** Her black line. */",
        f"export const AURELIA_LINE = '{COLORS['k']}';",
        '',
    ]
    neck = J['neck']
    wx0, wy0, wrows = WAIST
    parts += [
        '/**',
        ' * Where the bodice and its waist stand for our torso, in fine pixels below the neck along the torso:',
        ' * from under her armholes (the far shoulder above stays bare) to the waist\'s lower edge.',
        ' */',
        f'export const AURELIA_TORSO_SPAN: [number, number] = [{ARMHOLE_ROW - neck[1]:.2f}, {wy0 + len(wrows) - neck[1]:.2f}];',
        '',
    ]
    parts.append(piece_ts('AURELIA_BODICE', 'The collar, the gem and the bodice to the sash\'s line (pivot: the base of the neck).',
                          cells(bodice()), neck, torso))
    parts.append(piece_ts('AURELIA_WAIST', 'The bodice on under the sash to the hips (pivot: the base of the neck).',
                          cells(WAIST), neck, torso))
    for side, block, what in (('N', NEAR, 'near'), ('F', FAR, 'far')):
        upper, fore = split_arm(block, side)
        sh, el, wr = J['shoulder' + side], J['elbow' + side], J['wrist' + side]
        parts.append(piece_ts(f'AURELIA_SLEEVE_UPPER_{side}', f'The {what} sleeve to the elbow: its gold band (pivot: the shoulder).',
                              upper, sh, seg_angle(sh, el)))
        parts.append(piece_ts(f'AURELIA_SLEEVE_FORE_{side}', f'The {what} sleeve from the elbow to its gold cuff (pivot: the elbow).',
                              fore, el, seg_angle(el, wr)))
        # the band's top and the cuff's lower edge along the arm (what of our arm the sleeve stands for)
        cs = cells(block)
        top, bot = min(y for _, y in cs), max(y for _, y in cs) + 1
        mid = lambda y: sum(x + 0.5 for x, yy in cs if yy == y) / sum(1 for _, yy in cs if yy == y)
        t_band = along((mid(top), top), sh, el)
        t_cuff = along((mid(bot - 1), bot), el, wr)
        parts.append(f'/** The {what} sleeve along its arm: its band\'s top on the upper arm (0 shoulder, 1 elbow) and its')
        parts.append(f' * lower edge on the forearm (0 elbow, 1 wrist). */')
        parts.append(f'export const AURELIA_SLEEVE_SPAN_{side}: [number, number] = [{t_band:.3f}, {t_cuff:.3f}];')
        parts.append('')
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts))
    os.replace(tmp, path)
    print('wrote', path)


if __name__ == '__main__':
    main()
