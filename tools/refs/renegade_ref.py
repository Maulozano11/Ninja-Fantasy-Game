"""Shared helpers for lifting parts out of the owner's Renegade picture (docs/reference/renegade-owner-reference.jpg).

His picture (2000x2000) is our Renegado 2 (the second rogue look, src/battle/units.ts: male, idle frame 0)
painted over by the owner in his own pixels, one fine pixel of our sprites each. His pixels are not
square in the picture: 19.38 picture pixels across and 19.61 down, from (5.75, 18.95) (found from his
black line: every edge of his falls on that grid). Lined up with our male at idle frame 0, a pixel of
his at (x, y) sits at (x + OFFSET[0], y + OFFSET[1]) of our 256 x 256 frame: his figure stands where
ours does (95% of his silhouette is ours), so every piece hangs from our joints where he drew it.
JOINTS are our male rig's joints at that frame, in his pixels.

SEG says which piece each of his pixels belongs to (one letter per pixel, from column SEG_X):

  h hair (with his brows and the shaved side)   e our face (not lifted: forehead, eyes, ear)
  m the cloth mask                              t the tunic (with his skin in its V neck)
  u f n the near upper arm, forearm and fist    U F N the far upper arm, forearm and fist
  b the woven rope belt and its hanging ends    k the kunai (its ring and blade)
  p the trousers' waistband and seat            a s A S the near and far trouser legs (thigh, shin)
  w o W O the near and far wraps and sandals    # his line (it goes with the pieces it touches)

It started from our own render's part map (which item drew each pixel) and was set by hand where he
drew things elsewhere: his mask hangs to a point over the tunic, his brows and shaved side are hair, the
belt's hanging ends cross the kunai's handle, the kunai is only his greys (its ring and blade).

His black line is every pixel darker than LINE_LUMA: pure black round the figure, and a near-black brown
on the belt and in the tunic's deepest folds. A line pixel goes with each piece whose own colour it
touches side on (else at a corner), so every piece keeps its border when it moves apart. The white he
left inside the figure (between the spikes, beside the arm, round the kunai's blade) is a gap, except in
the blade, where it is his metal's light.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I.
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from aiden_ref import luma, save  # noqa: E402,F401
from roman_ref import CHARS, hexc, write  # noqa: E402,F401

REF = 'docs/reference/renegade-owner-reference.jpg'
PITCH = (19.38, 19.61)
PHASE = (5.75, 18.95)
OFFSET = (73, 120)
# Our male rig at idle frame 0, in his pixels (src/sprite/rig.ts drawRig, fine pixels less OFFSET).
JOINTS = {
    'head': (53.00, 18.00),
    'neck': (54.18, 27.65),
    'pelvis': (54.00, 56.87),
    'shoulderN': (41.01, 32.51),
    'shoulderF': (61.27, 31.81),
    'elbowN': (37.13, 44.50),
    'elbowF': (64.09, 44.08),
    'wristN': (34.62, 55.21),
    'wristF': (69.52, 53.65),
    'handN': (33.80, 58.72),
    'handF': (71.30, 56.78),
    'hipN': (48.58, 56.46),
    'hipF': (58.51, 53.12),
    'kneeN': (49.17, 72.65),
    'kneeF': (65.23, 67.86),
    'ankleN': (45.42, 87.59),
    'ankleF': (62.94, 83.08),
}
# Our face template's anchor (src/sprite/body.ts faceAnchor: the near eye's lash start) at idle frame 0.
ANCHOR = (50, 19)
# Where our kunai's grip passes through the near fist at idle frame 0 (src/sprite/grip.ts gripPoint), and
# the blade's angle there (swordAngle: 52, the reference's hanging blade).
GRIP = (33, 60)
GRIP_ANGLE = 52
# Darker than this is his line (his black, and the near-black brown of the belt's and tunic's lines).
LINE_LUMA = 24
# Lighter than this is white: round the figure the background, inside it a gap he left (but the blade's light).
WHITE_LUMA = 225

# Line pixels that also go with a piece in front of the one whose colour they touch: where our body
# under that piece is a pixel wider than his drawing, his line there must be the front piece's, or our
# outline would show instead (the near upper arm's inner edge on the shoulder).
LINE_ALSO = {(44, 29): 'u'}

SEG_X = 24
SEG = [
    '......................................................',  # 0
    '..............................#.......................',  # 1
    '..........................##.#h#......................',  # 2
    '......................##.#h###h#...####...............',  # 3
    '.....................#hh#h#hhhhh###hh#................',  # 4
    '...................##.#hhhhhhhh#hhhhh#................',  # 5
    '..................#hh#hhhhhhhhhhhhhh####..............',  # 6
    '..................##hhhhhhhhhhhhhhhhhhhh#.............',  # 7
    '.................#hhhhhhhhhhhhhhhhhhhhh###............',  # 8
    '..................#hhhhhhhhhhhhhhhhhhh#...............',  # 9
    '.................#hhhhhhhhhhhhhhhhhhhh#...............',  # 10
    '...............##hhhhhhhhhhhhhhhhhhhhhh#..............',  # 11
    '................#hhhhhhhhhhhhhhhhhh###h#..............',  # 12
    '.................#hhhhhhhheeeeehhhhe#.h#..............',  # 13
    '................#hhhhhhhheeeeeeeeeeeh###..............',  # 14
    '................#hhhhhhheeeeeeeeeeeee#................',  # 15
    '...............#hhhhhhhheeeeeeeeeeeee#................',  # 16
    '................#hhhhhhheehheeeeeeeee#................',  # 17
    '.................#h#eehheeeehheeeeehh#................',  # 18
    '.................#h#eeehehe##hhheee##.................',  # 19
    '................#hh#eeeeeeeee#eeeee##.................',  # 20
    '...............###hh#eeeeeeeeeeeeeee#.................',  # 21
    '.................#h#h##ee############.................',  # 22
    '..................#hhh###mmmmmmmmmmmm#................',  # 23
    '.................##hh###mmmmmmmmmmmm##................',  # 24
    '...................####m#mmmmmmmmmm#..................',  # 25
    '......................#mm#mmmmmmmmm##.................',  # 26
    '......................###mmmmmmmmm#####...............',  # 27
    '...............####.##tt#mmmmmmmmmm###U##.............',  # 28
    '.............##uuuu##ttt##mmmmmmmm#t#t##U#............',  # 29
    '............#uuuuuuu#tttt#mm#mmmmm###t##U#............',  # 30
    '............#uuuuuuuu#ttt#mm##mmm###tt##UU#...........',  # 31
    '............#uuuuuuuu#tttt##t#mmm#t#t###UU#...........',  # 32
    '...........#uuuuuuuuu#tttttttt#mm###t###U##...........',  # 33
    '............#uuuuuuuu#ttttttttt#m##tt######...........',  # 34
    '...........#uuuuuuuuu#tttttttt#m#tttt######...........',  # 35
    '...........#uuuuuuuu#tttttttttt#ttttt###UU#...........',  # 36
    '...........#uuuuuuu#tttttttttttt#ttttt##UU#...........',  # 37
    '...........#uuuuuuu#ttttttttttttttt#tt##UU#...........',  # 38
    '..........#uuuuuuu#ttttttttttttttt#ttt##UU#...........',  # 39
    '..........#uuuuuuu#tttttttttttttt#tttt##UUU#..........',  # 40
    '..........#fffffuu#ttttttttttttt#tttt###UUU#..........',  # 41
    '..........#ffffff#tttttttttt####tttt####UUU#..........',  # 42
    '.........#fffffff#tttttttttttttttttt#t##FFFF#.........',  # 43
    '.........#ffffff#.#tttttttttttttttt##t#FFFFF#.........',  # 44
    '........#fffffff#..#tt#ttttttttttt##tt#FFFFFF#........',  # 45
    '........#fffffff#..#ttt#ttttttttt##tt##FFFFFF#........',  # 46
    '........#fffffff#..#tttt#ttttttt##tt###FFFFFFF#.......',  # 47
    '........#fffffff##.#ttttt#ttttt##tt#####FFFFFF#.......',  # 48
    '........#fffffff#b#######################FFFFF#.......',  # 49
    '........#ffffff#bbbbbbbbbbbbbbbbbbbbbbbb#FFFFFF#......',  # 50
    '........#ffffff#bbbbbbbbbbbbbbbbbbbbbbbb##FFFFF#......',  # 51
    '........#nnnnn#bbbbbbbbbbbbbbbbbbbbbbbbb##FFFFF#......',  # 52
    '........#nnnnn#bbbbbbbbbbbbbbbbbbbbbbbbbb#N#NNNN#.....',  # 53
    '........#nnnn#bbbbbbbbbbbbbbbb#############NNNNN#.....',  # 54
    '.....###nnnnn#bbb##########################NNNNNN#....',  # 55
    '....kk#nnnnnn#bb##########t###ttt#tt#t##AAA#NN#NN#....',  # 56
    '....##nnnnnnnn######ttttt#tttttt##t#tt##AAA#NNNNN#....',  # 57
    '.....#nnnnnnnn#bb###tt##ttttttt#tt#####AAAA#NNNN#.....',  # 58
    '.....#nnnnnnnn#bbb#p####tttttt#ttt###tAAAAAA#NN#......',  # 59
    '.....#nnnnn##n#bb#####pp##########tttAAAAAAA###.......',  # 60
    '......#nnnnnb#bbb##pppppppppppp#pptAAAAAAAAA#.........',  # 61
    '.......#nnnnbbbb#.#ppp###pppppp##pAAAAAAAAAAA#........',  # 62
    '........##nnk#kk..#pppp#ppppppp#ppAAAAAAAAAAA#........',  # 63
    '.........#b#kkkkk.#aaaa#aaaaa#a##AAAAAAAAAAAA#........',  # 64
    '.........#b#kkkkkkaaaaa#aaaaa##..#AAAAAAAAAAAA#.......',  # 65
    '........#bb#kkkkk##aaaa#aaaaa##...#AAAAAAAA#A##.......',  # 66
    '.......#bbb#kkkkk#.#aaa#aaaaa##...#AAAAAAA#A#A#.......',  # 67
    '.......#bbbbkkkkkk.#aaa########....#AAAAAA#AAA#.......',  # 68
    '......#bbbbbkkkkkk.#aaaaaaaaaa#....#AAAAAA#AAA#.......',  # 69
    '......#bbbbb####k#.#aaaaaaaaaa#....#AAAAAA#AA##.......',  # 70
    '......#bbbb#.....##aaaaaaaaaaa#....#SAAAAA###A#.......',  # 71
    '......#bbbb#......aaaaaaaaaaaa#....#SSAAAAAAA#........',  # 72
    '......######.......#aaaaaaaaaa#....#SSSSAAASS#........',  # 73
    '...................#aaaaaaaaaa#....####WSSSSS#........',  # 74
    '..................#saaaaaaaaa#.....#WWW#######........',  # 75
    '..................#ssaaaaaaaa#....##WWWWWWWW##........',  # 76
    '..................#sssaaaaaas#....####WWWWW##.........',  # 77
    '..................##wssssasss#....##WW#####W#.........',  # 78
    '..................#w####wssss#.....#WWWWWW###.........',  # 79
    '.................##wwwww#####......####WWW###.........',  # 80
    '.................###wwwwwww##......#WWW#####..........',  # 81
    '.................##w##wwwww#.......#WWWWWW#...........',  # 82
    '.................##www######.......#OOOOOOO#..........',  # 83
    '..................#wwwwwww##.......#OOOOOOOO##........',  # 84
    '..................###wwww#w#.......#OOOOOOOO#O#.......',  # 85
    '..................#ww######........#OOOOOOOOOOO##.....',  # 86
    '..................#oooooo#.........#OOOOOOOOOOOOO#....',  # 87
    '.................#ooooooo#.........##OOOOOOOOOOOO#....',  # 88
    '.................#ooooooo#.........####OOOOOOOOOO#....',  # 89
    '.................#oo#oooo#.............##########.....',  # 90
    '................#oooooooo#............................',  # 91
    '................#oooooooo#............................',  # 92
    '................#oooooooo#............................',  # 93
    '................#oooooooo#............................',  # 94
    '................#oooooooo#............................',  # 95
    '................#oooooooo#............................',  # 96
    '................#oooooooo#............................',  # 97
    '.................#########............................',  # 98
    '......................................................',  # 99
]


# A pixel of his pure black line (row, column: the far edge of his face), for lines drawn where he hid one.
SEG_LINE_PIXEL = (16, 61)


def inside(pts, H, W):
    """roman_ref.inside: the pixels whose centres lie inside a polygon of his pixel corners."""
    from roman_ref import inside as inside0
    return inside0(pts, H, W)


def native(path=REF):
    """His pixels: the median of each block's interior (4 picture pixels in from its edges), as an
    (H, W, 3) int array."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    H, W, _ = a.shape
    nx = int((W - PHASE[0]) / PITCH[0])
    ny = int((H - PHASE[1]) / PITCH[1])
    xs = [int(round(PHASE[0] + k * PITCH[0])) for k in range(nx + 1)]
    ys = [int(round(PHASE[1] + k * PITCH[1])) for k in range(ny + 1)]
    out = np.zeros((ny, nx, 3))
    for j in range(ny):
        for i in range(nx):
            c = a[ys[j] + 4:ys[j + 1] - 4, xs[i] + 4:xs[i + 1] - 4].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def seg_grid(shape):
    """SEG as an (H, W) array of letters over his whole picture ('.' outside it)."""
    H, W = shape
    g = np.full((H, W), '.', dtype='<U1')
    for y, row in enumerate(SEG):
        for i, ch in enumerate(row):
            g[y, SEG_X + i] = ch
    return g


def is_skin(c):
    """His skin: the lit peach and rose tones, and the dark rose of its shadows (red over green, blue
    close to green), never his browns (blue well under green)."""
    r, g, b = (int(v) for v in c)
    return (r > 150 and r - b > 50) or (r > 90 and b >= g - 6 and r > g + 20)


def is_metal(c):
    """The kunai's steel: his greys, blue-greys and whites (little colour), against its warm rust."""
    r, g, b = (int(v) for v in c)
    return max(r, g, b) - min(r, g, b) < 40 or b > r + 3


def pieces(a):
    """His figure cut into pieces: {letter: mask} and his colours (H, W, 3). A line pixel goes with each
    piece whose own colour touches it side on, else with those that touch it at a corner."""
    H, W, _ = a.shape
    seg = seg_grid((H, W))
    L = luma(a)
    line = (L < LINE_LUMA) & (seg != '.')
    own = {}
    for ch in sorted(set(seg.ravel()) - {'.', '#'}):
        m = (seg == ch) & ~line
        if ch != 'k':
            m &= L <= WHITE_LUMA
        own[ch] = m
    masks = {ch: m.copy() for ch, m in own.items()}
    SIDE = ((1, 0), (-1, 0), (0, 1), (0, -1))
    CORNER = ((1, 1), (1, -1), (-1, 1), (-1, -1))

    def touching(src, y, x, steps):
        return [ch for ch, m in src.items() if any(0 <= y + dy < H and 0 <= x + dx < W and m[y + dy, x + dx] for dy, dx in steps)]

    todo = set(zip(*np.nonzero(line)))
    for y, x in sorted(todo):
        side = touching(own, y, x, SIDE) or touching(own, y, x, CORNER)
        for ch in side:
            masks[ch][y, x] = True
        if side:
            todo.discard((y, x))
    # Where his line is two pixels thick, the outer pixel touches only line: it goes with the pieces whose
    # line it touches (side on, else at a corner), passed on outward until every pixel of his line has one.
    while todo:
        got = {}
        for y, x in sorted(todo):
            side = touching(masks, y, x, SIDE)
            if side:
                got[(y, x)] = side
        if not got:
            for y, x in sorted(todo):
                side = touching(masks, y, x, CORNER)
                if side:
                    got[(y, x)] = side
        if not got:
            break
        for (y, x), side in got.items():
            for ch in side:
                masks[ch][y, x] = True
            todo.discard((y, x))
    for (x, y), ch in LINE_ALSO.items():
        masks[ch][y, x] = True
    return masks, line


def kind_of(c, letter):
    """What a colour of his is in a piece: his 'line'; 'skin' (in his arms all of it, elsewhere his skin
    tones: the tunic's V neck, the toes); 'metal' or 'rust' on the kunai; 'hair' in the hair; else
    'cloth'."""
    if luma(np.array(c, float)) < LINE_LUMA:
        return 'line'
    if letter in 'ufnUFN':
        # all of his arms is skin, but the kunai's handle under the fist (its rust stays his)
        return 'skin' if letter != 'n' or is_skin(c) or luma(np.array(c, float)) < 60 else 'rust'
    if letter == 'k':
        return 'metal' if is_metal(c) else 'rust'
    if letter == 'h':
        return 'hair'
    if letter in 'towO' and is_skin(c):
        return 'skin'
    if letter in 'paAsS' and max(c) - min(c) < 20 and luma(np.array(c, float)) > 120:
        return 'metal'  # the pocket's button
    return 'cloth'


def pack(col, mask):
    """roman_ref.pack: rows of palette characters (his colours within 3 share one), origin, palette."""
    from aiden_ref import pack as pack0
    return pack0(col, mask, CHARS)


def angle(a_name, b_name):
    (ax, ay), (bx, by) = JOINTS[a_name], JOINTS[b_name]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def base(a, masks, letters, kinds, q=0.5):
    """His colour of middle lightness among the pixels of these kinds in these pieces (with `q`, that
    fraction of them darker): the base a colour slot recolours from."""
    found = []
    for ch in letters:
        for y, x in zip(*np.nonzero(masks[ch])):
            if kind_of(a[y, x], ch) in kinds:
                found.append((float(luma(a[y, x].astype(float))), hexc(a[y, x])))
    found.sort()
    return found[int(len(found) * q)][1]


def commonest(a, masks, letters, kinds):
    """His commonest colour (colours within 3 counted as one) of these kinds in these pieces."""
    groups = []
    for ch in letters:
        for y, x in zip(*np.nonzero(masks[ch])):
            c = a[y, x]
            if kind_of(c, ch) not in kinds:
                continue
            for g in groups:
                if np.abs(g[0] - c).max() <= 3:
                    g[1] += 1
                    break
            else:
                groups.append([c, 1])
    groups.sort(key=lambda g: (-g[1], hexc(g[0])))
    return hexc(groups[0][0])


def skin_base(a, masks):
    """His commonest skin on the near arm, the broad lit tone: the character's skin colour stands for it in
    every piece (arms, the tunic's V neck, the toes), so with the character's skin set to it all are his."""
    return commonest(a, masks, 'uf', ('skin',))


def ts_piece(name, doc, rows, origin, palette, pivot, ang):
    """A PaintedPiece (src/sprite/painted.ts) as TypeScript: `pivot` the cell (his pixels) that lands on
    the joint, `ang` the limb's angle at rest."""
    ox, oy = origin
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    out = [f'/** {doc} */', f'export const {name}: PaintedPiece = {{',
           f'  pivot: [{int(np.floor(pivot[0])) - ox}, {int(np.floor(pivot[1])) - oy}],',
           f'  angle: {ang:.2f},', '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {key(k)}: '{v}'," for k, v in palette.items()]
    out += ['  },', '};', '']
    return '\n'.join(out)


def module(a, masks, doc, prefix, consts, bases, cols=None, extra=''):
    """A generated TypeScript module: the colours the slots recolour from (`bases`, name -> hex), what each
    of his colours is (`<prefix>_KIND`), where each piece lands in our male idle frame 0 (`<prefix>_REST`:
    the fine pixel of its first row's first cell) and the pieces (`consts`: (CONST, mask, doc, pivot in
    his pixels, angle)). `cols` overrides his colours (for pieces filled where they are hidden)."""
    out = [doc, "import type { PaintedPiece } from '../painted';", '']
    out.append('/** His colours the colour slots recolour from (at these, every pixel is his). */')
    for k, v in bases.items():
        out.append(f"export const {k} = '{v}';")
    out.append('')
    kinds = {}
    body = []
    rest = []
    for const, letter, m, pdoc, pivot, ang in consts:
        c = a if cols is None else cols
        rows, origin, palette = pack(c, m)
        for ch, h in palette.items():
            rgb = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]
            k = kind_of(rgb, letter)
            if kinds.get(h, k) != k:
                k = 'line' if 'line' in (k, kinds[h]) else kinds[h]
            kinds[h] = k
        body.append(ts_piece(const, pdoc, rows, origin, palette, pivot, ang))
        rest.append((const, [origin[0] + OFFSET[0], origin[1] + OFFSET[1]]))
    out.append("/** What each of his colours is: his line, skin, hair, cloth, or the kunai's metal and rust. */")
    out.append(f"export const {prefix}_KIND: Record<string, 'line' | 'skin' | 'hair' | 'cloth' | 'metal' | 'rust'> = {{")
    for h in sorted(kinds):
        out.append(f"  '{h}': '{kinds[h]}',")
    out += ['};', '']
    out.append("/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */")
    out.append(f'export const {prefix}_REST: Record<string, [number, number]> = {{')
    for const, (x, y) in rest:
        out.append(f'  {const}: [{x}, {y}],')
    out += ['};', '']
    if extra:
        out += [extra, '']
    out += body
    return '\n'.join(out)


def study(a, masks, letters, path, box=(24, 0, 78, 100), cols=None):
    """His picture beside the pieces lifted out of it (drawn back to front in `letters` order), at 8x."""
    x0, y0, x1, y1 = box
    H, W = y1 - y0, x1 - x0
    lifted = np.full((H, W, 4), 0, np.uint8)
    c = a if cols is None else cols
    for ch in letters:
        m = masks[ch]
        for y, x in zip(*np.nonzero(m)):
            if y0 <= y < y1 and x0 <= x < x1:
                lifted[y - y0, x - x0, :3] = c[y, x]
                lifted[y - y0, x - x0, 3] = 255
    his = np.concatenate([a[y0:y1, x0:x1].astype(np.uint8), np.full((H, W, 1), 255, np.uint8)], axis=2)
    save(np.concatenate([his, np.zeros((H, 2, 4), np.uint8), lifted], axis=1), path)
