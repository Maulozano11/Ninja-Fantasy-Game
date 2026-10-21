"""Lyra's blouse and her corset, pauldron and bracers (docs/reference/lyra-owner-reference.jpg) as
painted pieces that ride the rig.

The owner's Lyra wears an off-the-shoulder cream blouse with puffed sleeves, a red scarf round the
near shoulder and a red V at the neckline edged in gold; over it a brown leather corset with gold
filigree, gold bands top and bottom and two steel buckles, one gold pauldron on the far shoulder held
by a strap across the chest, and brown leather bracers with gold studs over long sleeves that show a
cream cuff at the wrist. Her picture is not at our scale: the study (tools/refs/heroine_ref.py,
reduced('lyra')) brought her down onto our female body at idle frame 0, in her own colours. This
script cuts that reduced reference into one piece per segment of our rig, each with its pivot on a
joint of our female idle (heroine_ref.OUR_JOINTS), so src/sprite/painted.ts stampPiece draws it as she
is in our idle pose and turns it with its limb in every other pose:

  top_offshoulder_blouse (src/sprite/items/lyraUpper.ts)
    BLOUSE_TORSO      neckline, V, bust, body to the waist   pivot: neck       torso.top
    BLOUSE_SLEEVE_N   red scarf band and puffed sleeve       pivot: shoulderN  nearArm.cloth (over the forearm)
    BLOUSE_FOREARM_N  fitted sleeve and cuff                 pivot: elbowN     nearArm.cloth
    BLOUSE_SLEEVE_F   the far puffed sleeve                  pivot: shoulderF  farArm.cloth (over the forearm)
    BLOUSE_SIDE_F     its edge where our torso is wider      pivot: shoulderF  torso.top (under the blouse)
    BLOUSE_FOREARM_F  the far fitted sleeve and cuff         pivot: elbowF     farArm.cloth
  armor_gilded_corset
    CORSET            strap across the chest, corset         pivot: neck       torso.armor
    CORSET_PAULDRON   gold pauldron on the far shoulder      pivot: shoulderF  torso.armor (over the corset)
    CORSET_BRACER_N   near bracer                            pivot: elbowN     nearArm.armor
    CORSET_BRACER_F   far bracer                             pivot: elbowF     farArm.armor

Each piece is written below as rows of our 256 x 256 frame from its origin: '*' is her pixel there
(the reduced reference), '.' nothing, any other character one of her colours (FILL) for what her
picture hides: the blouse under the corset, the braid and the pauldron, the sleeves under the bracers,
the corset's near side under her arm and braid, the strap under the braid, the far bracer and cuff
behind the pouch at her hip. Those are drawn after her own pixels round them (her tones, her
shading from the upper left, her black line). Not hers to take here: her skin (ours is the body's),
her hair, the belt with its buckle and the pouch at her hip, and the tabard below.

check() lays the pieces in the game's order at idle and makes sure every pixel of her blouse,
corset, pauldron and bracers is hers; nothing is written otherwise. The same picture always gives
the same bytes. Run from the repository root:

  python3 -I tools/refs/lyra-upper-from-ref.py <out> [src/sprite/items/lyraUpperArt.ts]
"""

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import heroine_ref as H  # noqa: E402

WHICH = 'lyra'
J = H.OUR_JOINTS
PAL = H.PALETTES[WHICH]

# Her colours for the fills (indices into PALETTES['lyra']).
FILL = {
    '#': 0,    # her black line
    'k': 15,   # red scarf / lining
    'e': 7,    # its dark underside
    'I': 89,   # cream, lit
    'E': 81,   # cream
    'B': 69,   # cream, shade
    'x': 54,   # cream, dark
    'D': 72,   # gold
    'y': 56,   # gold, dark
    's': 33,   # gold, darkest
    'm': 21,   # leather
    'i': 12,   # leather, dark
    'f': 8,    # leather, darkest (the strap)
    'u': 39,   # leather, lit
}

# What each of her colours is, for the items' colour slots (src/sprite/items/lyraUpper.ts): the
# blouse's cream and its red lining; the corset's leather, gold and steel. Her black line has none.
TONES = {
    'blouse': [89, 81, 69, 54],
    'lining': [15, 7],
    'gold': [85, 72, 56, 33],
    'leather': [39, 21, 12, 8],
    'steel': [86, 68, 34],
}
LINE = 0

# The blouse's body under the corset, the braid and the near arm, by rule: per row its left and right
# line (our torso's edge, or her corset's where it is wider), her cream lit from the upper left, two
# folds gathering into the waist, and a hem two rows over the hips with her line under it (the torso
# stretches by two in some poses, which would bare the waist). Her own pixels from x 135 on (her line
# and her far sleeve where our torso reaches over them) are kept.
BODY_ROWS = {
    160: (116, None), 161: (117, None), 162: (117, None), 163: (118, None), 164: (119, None),
    165: (119, None), 166: (120, 134), 167: (120, 134), 168: (119, 134), 169: (118, 134),
    170: (117, 135), 171: (117, 136), 172: (116, 136), 173: (115, 137), 174: (115, 137),
}
BODY_TONE = {115: 'E', 116: 'E', 117: 'E', 118: 'E', 119: 'I', 120: 'I', 121: 'E', 122: 'E', 123: 'E', 124: 'E', 125: 'B',
             126: 'E', 127: 'E', 128: 'E', 129: 'E', 130: 'B', 131: 'B', 132: 'B', 133: 'x', 134: 'x', 135: 'x', 136: 'x'}


# How far our torso reaches over her far sleeve, per row (our female idle's torso and the bandeau
# under it).
HER_SIDE = {160: 137, 161: 137, 162: 137, 163: 136, 164: 135, 165: 135}


def body_rows():
    rows = {}
    for y, (left, right) in BODY_ROWS.items():
        r = {left: '#'}
        end = right if right is not None else 135
        for x in range(left + 1, end):
            t = BODY_TONE[x]
            if y >= 168 and x in (125, 130):
                t = 'x'
            if y >= 170 and x == 127:
                t = 'B'
            r[x] = t
        if right is not None:
            r[right] = '#'
        else:
            # her line between the blouse and the far sleeve, and her sleeve where our torso reaches over it
            for x in range(135, HER_SIDE[y] + 1):
                r[x] = '*'
        if y == max(BODY_ROWS):
            r = {x: '#' for x in r}
        rows[y] = r
    return rows


PIECES = {
    'BLOUSE_TORSO': {
        'doc': "The blouse: the red V edged in gold, the cream bust, the red scarf round to the near arm, the body to the waist (pivot: the base of the neck).",
        'joint': 'neck', 'angle': ('pelvis', 'neck'), 'origin': (116, 154),
        'rows': [
            '.....kk*******Dkkkk....',
            '#kkkkkk********kkkk....',
            '#kkkkee********eeeee...',
            '#eeeeEI**********IE**..',
            '#EIIIEE**************..',
            '#EEBBBB**************..',
        ],
        'extra': 'body',
    },
    'BLOUSE_SLEEVE_N': {
        'doc': 'The near sleeve: the red scarf band and the puff (pivot: the near shoulder).',
        'joint': 'shoulderN', 'angle': ('shoulderN', 'elbowN'), 'origin': (107, 156),
        'rows': [
            '...********kkk',
            '..*********kkk',
            '..*********eee',
            '.**********EB#',
            '***********B#.',
            '************#.',
            '*************.',
            '*************.',
            '************..',
            '.**********...',
            '.*********#...',
        ],
    },
    'BLOUSE_FOREARM_N': {
        'doc': 'The near fitted sleeve, gathered under the puff, and her cuff at the wrist (pivot: the near elbow).',
        'joint': 'elbowN', 'angle': ('elbowN', 'wristN'), 'origin': (107, 164),
        'rows': [
            '.#BBBBBB#',
            '.#BBBBBB#',
            '.#xBxBxx#',
            '.#xBxxxx#',
            '.#IEEBBx#',
            '#EIEEBBx#',
            '#EIEBBxx#',
            '#EIEEBxx#',
            '#EEEBBxx#',
            '#xBxxxx#.',
            '#IE*****.',
            '...****..',
        ],
    },
    'BLOUSE_SLEEVE_F': {
        'doc': 'The far sleeve: its red band under the pauldron and the puff (pivot: the far shoulder).',
        'joint': 'shoulderF', 'angle': ('shoulderF', 'elbowF'), 'origin': (133, 152),
        'rows': [
            '.####...',
            '#kkkk#..',
            '#kkkk#..',
            '#eee#...',
            '#eeee**.',
            '#Bx*****',
            '#Bx*****',
            '#Bx*****',
            '#Bx*****',
            '#Bx*****',
            '#Bx*****',
            '#Bx*****',
            '#Bx*****',
            '.#x*****',
            '...#####',
        ],
    },
    'BLOUSE_SIDE_F': {
        'doc': "The far puff's edge where our torso is wider than hers: drawn over the body before the blouse, it moves with the far arm (pivot: the far shoulder).",
        'joint': 'shoulderF', 'angle': ('shoulderF', 'elbowF'), 'origin': (136, 157),
        'rows': [],
        'from': ('BLOUSE_TORSO', (136, 138, 157, 165)),
    },
    'BLOUSE_FOREARM_F': {
        'doc': 'The far fitted sleeve and its cuff, behind the pouch at her hip (pivot: the far elbow).',
        'joint': 'elbowF', 'angle': ('elbowF', 'wristF'), 'origin': (133, 164),
        'rows': [
            '.#xxx#....',
            '#BBxxx#...',
            '.#xxxxx#..',
            '.#BEEBxx#.',
            '..#BEEBxx#',
            '..#BEBBxx#',
            '...#EEBxx#',
            '...#xxxxx#',
            '...#BEBxx#',
            '....#BBx##',
            '....####..',
        ],
    },
    'CORSET': {
        'doc': 'The corset: gold bands, gold filigree, two steel buckles, and the strap across the chest to the pauldron (pivot: the base of the neck).',
        'joint': 'neck', 'angle': ('pelvis', 'neck'), 'origin': (116, 151),
        'rows': [
            '...fffff*******........',
            '.......................',
            '.......................',
            '.......................',
            '.......................',
            '.......................',
            '.......................',
            '.......................',
            '.......................',
            '.#yDDDD*************...',
            '.#immi**************...',
            '..#im***************...',
            '..#i****************...',
            '...*****************...',
            '...*****************...',
            '....***************....',
            '....***************....',
            '....***************....',
            '....***************....',
            '.###***************....',
        ],
    },
    'CORSET_PAULDRON': {
        'doc': 'The gold pauldron on the far shoulder (pivot: the far shoulder).',
        'joint': 'shoulderF', 'angle': ('shoulderF', 'elbowF'), 'origin': (130, 150),
        'rows': [
            '..*****..',
            '.*******.',
            '*********',
            '*********',
            '*********',
            '.*******.',
            '.*******.',
            '...***...',
        ],
    },
    'CORSET_BRACER_N': {
        'doc': 'The near bracer: her leather lit along its edge, gold studs (pivot: the near elbow).',
        'joint': 'elbowN', 'angle': ('elbowN', 'wristN'), 'origin': (107, 167),
        'rows': [
            '.********',
            '.********',
            '*********',
            '*********',
            '*********',
            '*********',
            '********.',
            '***......',
        ],
    },
    'CORSET_BRACER_F': {
        'doc': 'The far bracer, after the near one in the far side\'s shade, behind the pouch at her hip (pivot: the far elbow).',
        'joint': 'elbowF', 'angle': ('elbowF', 'wristF'), 'origin': (134, 166),
        'rows': [
            '.#######.',
            '#mumiif#.',
            '.#umsiif#',
            '.#mumiif#',
            '..#umsif#',
            '..#mumif#',
        ],
    },
}
# The game's drawing order (src/sprite/ctx.ts DEPTHS; within a depth, in the order drawn).
ORDER = ['BLOUSE_FOREARM_F', 'BLOUSE_SLEEVE_F', 'CORSET_BRACER_F', 'BLOUSE_SIDE_F', 'BLOUSE_TORSO', 'CORSET', 'CORSET_PAULDRON',
         'BLOUSE_FOREARM_N', 'BLOUSE_SLEEVE_N', 'CORSET_BRACER_N']

# What in the reduced reference is hers to take here: the parts of her torso and arms (not her skin,
# her hair, the belt, the pouch or the tabard).
SKIN = {84, 70, 63, 49, 45}
MINE_PARTS = ('torso', 'armN', 'armF')


def mine_mask(idx, parts):
    m = np.zeros(idx.shape, bool)
    for p in MINE_PARTS:
        m |= parts[p]
    m &= idx < 255
    m &= ~np.isin(idx, list(SKIN))
    yy, xx = np.mgrid[0:H.GRID, 0:H.GRID]
    m &= yy >= 150
    m &= ~((yy >= 171) & (xx >= 115))           # the belt, its buckle and the tabard's gold under it
    m &= ~((yy >= 166) & (xx >= 135))           # the pouch at her hip
    m &= ~((yy >= 174) & (xx < 115) & ~parts['armN'])
    m &= ~((yy <= 150) & (xx >= 120) & (xx <= 131))   # her neck's line
    m &= ~((yy <= 153) & (xx <= 129) & (yy != 151))   # the line round her chest's skin
    m &= ~((yy <= 155) & parts['armN'])               # her bare near shoulder and its line
    m &= ~((yy >= 166) & (xx <= 116) & parts['torso'])  # her braid's tip by the arm
    return m


def build():
    """Each piece as {(x, y): palette index} in our frame at idle."""
    idx = H.reduced_index(WHICH)
    out = {}
    for name, d in PIECES.items():
        if 'from' in d:
            continue
        ox, oy = d['origin']
        cells = {}
        rows = list(d['rows'])
        w = len(rows[0])
        for j, row in enumerate(rows):
            assert len(row) == w, (name, j, row)
            for i, ch in enumerate(row):
                if ch == '.':
                    continue
                x, y = ox + i, oy + j
                if ch == '*':
                    v = int(idx[y, x])
                    assert v < 255, f'{name}: her pixel at {x},{y} is empty'
                    cells[(x, y)] = v
                else:
                    cells[(x, y)] = FILL[ch]
        if d.get('extra') == 'body':
            for y, r in body_rows().items():
                for x, ch in r.items():
                    if ch == '*':
                        v = int(idx[y, x])
                        assert v < 255, f'{name}: her pixel at {x},{y} is empty'
                        cells[(x, y)] = v
                    else:
                        cells[(x, y)] = FILL[ch]
        out[name] = cells
    # Her far puff where our torso reaches over it, a column or so to spare: its own piece over the
    # body, so it stays on the sleeve when the sleeve sits elsewhere than the neck says (the slender
    # body, whose shoulder is higher; other poses). The blouse keeps her line beside it.
    for name, d in PIECES.items():
        if 'from' in d:
            src, (x0, x1, y0, y1) = d['from']
            for c in [c for c in out[src] if x0 <= c[0] <= x1 and y0 <= c[1] <= y1]:
                assert out['BLOUSE_SLEEVE_F'].get(c) == out[src][c], (name, c)
                del out[src][c]
            out[name] = {c: v for c, v in out['BLOUSE_SLEEVE_F'].items() if x0 <= c[0] <= x1 and y0 <= c[1] <= y1}
    return out


def stack(out):
    """The pieces laid in the game's order at idle (each piece is drawn as it is at its own angle)."""
    top = {}
    for name in ORDER:
        top.update(out[name])
    return top


def check(out):
    """Every pixel of hers that is the blouse, corset, pauldron or a bracer must come out hers."""
    idx = H.reduced_index(WHICH)
    parts = H.reduced_parts(WHICH)
    mine = mine_mask(idx, parts)
    top = stack(out)
    bad = []
    for y, x in zip(*np.nonzero(mine)):
        got = top.get((int(x), int(y)))
        if got != int(idx[y, x]):
            bad.append((int(x), int(y), PAL[idx[y, x]], None if got is None else PAL[got]))
    return bad, mine


def tones_ok(out):
    """Every colour used is one of hers and has a kind (or is her line)."""
    kinds = {v: k for k, vs in TONES.items() for v in vs}
    errs = []
    for name, cells in out.items():
        for (x, y), v in cells.items():
            if v != LINE and v not in kinds:
                errs.append((name, x, y, PAL[v]))
    return errs


def angle_of(a, b):
    return float(np.degrees(np.arctan2(J[b][1] - J[a][1], J[b][0] - J[a][0])))


CHARS = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'


def pack(cells):
    """A piece's cells as rows of characters, one per colour of hers (in palette order), its origin
    and palette."""
    xs = [x for x, _ in cells]
    ys = [y for _, y in cells]
    x0, y0 = min(xs), min(ys)
    W, Hh = max(xs) - x0 + 1, max(ys) - y0 + 1
    used = sorted(set(cells.values()))
    ch = {v: CHARS[i] for i, v in enumerate(used)}
    grid = [['.'] * W for _ in range(Hh)]
    for (x, y), v in cells.items():
        grid[y - y0][x - x0] = ch[v]
    return [''.join(r) for r in grid], (x0, y0), {ch[v]: PAL[v] for v in used}


def write_ts(out, path):
    parts = [
        "// Lyra's blouse, corset, pauldron and bracers: the owner's pixels from his heroine picture",
        '// (docs/reference/lyra-owner-reference.jpg) at our scale on the female rig, as the study brought her',
        '// down (tools/refs/heroine_ref.py), cut by tools/refs/lyra-upper-from-ref.py: one piece per segment',
        "// of the rig, pivot on its joint at our female idle, angle the segment's there. Generated: rerun",
        '// the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
    ]
    for name in PIECES:
        d = PIECES[name]
        rows, origin, pal = pack(out[name])
        parts.append(H.ts_piece(name, d['doc'], rows, origin, pal, J[d['joint']], angle_of(*d['angle'])))
    for kind, vs in TONES.items():
        doc = {
            'blouse': "Her blouse's cream, lit to dark; the Blouse slot moves them from the second.",
            'lining': 'Her red lining (the scarf band and the V) and its dark; the Lining slot moves them from the first.',
            'gold': 'Her gold, light to dark; the Gold slot moves them from the second.',
            'leather': 'Her leather, lit to dark; the Leather slot moves them from the second.',
            'steel': 'Her steel (the buckles), light to dark; the Steel slot moves them from the second.',
        }[kind]
        parts.append(f'/** {doc} */')
        parts.append(f"export const LYRA_{kind.upper()} = [{', '.join(repr(PAL[v]) for v in vs)}];".replace('"', "'"))
        parts.append('')
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts))
    os.replace(tmp, path)


def save_png(rgba, path, k=8):
    from PIL import Image
    img = Image.fromarray(rgba, 'RGBA').resize((rgba.shape[1] * k, rgba.shape[0] * k), Image.NEAREST)
    img.save(path)


def main():
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)
    out = build()
    errs = tones_ok(out)
    for e in errs:
        print('colour without a kind:', e)
    bad, mine = check(out)
    for b in bad:
        print('not hers at idle:', b)
    rgb = H.rgb(WHICH)
    # study: her pixels taken here, our pieces stacked, and each piece alone
    x0, x1, y0, y1 = 100, 150, 144, 182
    her = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    idx = H.reduced_index(WHICH)
    m = mine[y0:y1, x0:x1]
    her[m, :3] = rgb[idx[y0:y1, x0:x1][m]]
    her[m, 3] = 255
    ours = np.zeros_like(her)
    for (x, y), v in stack(out).items():
        if x0 <= x < x1 and y0 <= y < y1:
            ours[y - y0, x - x0, :3] = rgb[v]
            ours[y - y0, x - x0, 3] = 255
    save_png(np.concatenate([her, np.zeros((y1 - y0, 2, 4), np.uint8), ours], 1), os.path.join(out_dir, 'hers-vs-pieces@8.png'))
    tiles = []
    for name in PIECES:
        t = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
        for (x, y), v in out[name].items():
            t[y - y0, x - x0, :3] = rgb[v]
            t[y - y0, x - x0, 3] = 255
        tiles += [t, np.zeros((y1 - y0, 2, 4), np.uint8)]
    save_png(np.concatenate(tiles, 1), os.path.join(out_dir, 'pieces@4.png'), 4)
    for name in PIECES:
        print(name, 'cells', len(out[name]), 'colours', len(set(out[name].values())))
    if bad or errs:
        raise SystemExit('pieces are not her picture at idle')
    if len(sys.argv) > 2:
        write_ts(out, sys.argv[2])


if __name__ == '__main__':
    main()
