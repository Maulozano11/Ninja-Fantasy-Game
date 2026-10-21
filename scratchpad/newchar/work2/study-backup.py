"""The owner's Scarlet brought down to our scale: the reduced reference every Scarlet part copies.

His picture (docs/reference/scarlet-owner-reference.jpg, tools/refs/scarlet_ref.py) is his own pixel
art at 1.8 of his pixels to one of ours, in proportions that are not ours. This script:

1. cuts his figure into parts (polygons in his pixels, PARTS) and leaves his cape out (the owner did
   not want it): the cape is whatever of him no part takes;
2. mends in his pixels what the cape and the sword hid (MEND): the cape lay over his near shoulder
   (its gold edge crossed his upper arm), the sword's cross-guard over his coat's near skirt; his far
   sleeve is a sliver beside his coat, so our far arm (which hangs clear of the body) wears his near
   sleeve, as his near glove's cuff;
3. lays each part on our male rig at idle frame 0 by its map (scarlet_ref.SEGMENTS) and brings it
   down: each of our pixels takes the mean of his colours under it (5 x 5 samples) and then the
   nearest colour of his (scarlet_ref.PALETTE); his gold trims are laid on forward, pixel by pixel,
   so his one-pixel lines stay unbroken lines (and do not muddy the cloth beside them);
4. draws by hand, at our scale and after his, what the reduction cannot keep (LAYER_PATCHES, in his
   colours): his eyes and their glints, his smile, his chest (collar, lapels and their embroidery,
   cravat, shirt, buckle), his gloves on our fists, his coat's skirts and their trims, his trousers'
   pinstripes (two of our pixels apart: his are finer than our pixel), his boots, his sword's hilt;
   then lays his black line round the figure and between his parts, and the PATCHES (by hand, on the
   finished figure) mend the last pixels.

Every pixel is one of his colours. Back to front: far arm, the coat's lining between his legs, the
legs, the coat, near arm, the sword (blade, then hilt), the near glove over the grip, the head.

It writes, in <out>:

  reduced@1.png   the reduced reference in our 256 x 256 frame's box (REDUCED_BOX) at 1x
  reduced@8.png   the same at 8x
  overlay@8.png   on our male idle (dimmed) with our joints marked, and our body's pixels he leaves
                  bare (other than his face, neck and fingers) in magenta
  compare@4.png   his figure (without the cape) beside the reduced one at the same height
  native@4.png    his pixels at 4x
  parts@4.png     his parts, each in its own tint (the cape and what MEND changed left plain)
  palette.png     his colours, those the reduced reference uses marked

and, with --write, tools/refs/data/scarlet-reduced.npy (PALETTE indices over REDUCED_BOX, 255 where
he is not; its last row holds the box's x0, y0) and scarlet-reduced-parts.npy (which part each pixel
came from) that scarlet_ref.reduced() and reduced_parts() read. <idle> is our male at idle frame 0
with no items (a 256 x 256 PNG, tools/refs/scarlet-idle.mts writes it). The same picture always gives
the same bytes. Run from the repository root with python3 -I:

  npx tsx tools/refs/scarlet-idle.mts <out>
  python3 -I tools/refs/scarlet-study.py <out> <out>/male-idle.png [--write]
  python3 -I tools/refs/scarlet-study.py --palette
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

import scarlet_ref as R  # noqa: E402

# The reduced reference's box in our frame (x0, y0, x1, y1): the figure and the sword fit in it.
REDUCED_BOX = (88, 116, 168, 224)

# His parts, in his pixels (x, y of pixel corners; a pixel is in when its centre is). Where two
# overlap the first listed has it. What no part takes is the cape (and the white round him).
PARTS = {
    # hair, face and chin (his neck below the chin goes with the coat, round the cravat, and so does
    # his collar's white-edged tip under his hair's near ends)
    'head': [(54, 16), (102, 16), (102, 50), (97, 53), (93, 55), (89, 56), (86, 57.5), (84, 58.5), (78, 58.5), (75, 56),
             (72, 54), (68, 52), (65, 51.5), (61, 52), (57, 51), (54, 49)],
    # the near glove, below the cuff, and the grip in it
    'handN': [(48.5, 109.5), (59.5, 109.5), (59.5, 118), (58, 123.5), (50, 123.5), (48.5, 118)],
    # the near sleeve, from under the cape's edge (the shoulder above it is the cape's, mended into
    # the coat's own shoulder) to the cuff
    'armN': [(63, 56.5), (59, 58.5), (55, 61.5), (51.5, 66), (49, 72), (47.5, 80), (47, 90), (47.5, 100), (48, 109.5),
             (59.5, 109.5), (60.5, 104), (61.5, 96), (62.5, 90), (64.5, 82), (65.5, 74), (66.5, 66), (66.5, 58)],
    # the far glove (his far sleeve is a sliver; our far arm wears his near one, MEND)
    'handF': [(101, 108.5), (107.5, 108.5), (108.5, 115), (108, 123.5), (101.5, 123.5), (101, 116)],
    # the gold cross and the small gold piece hanging from his belt over his near leg, and the red
    # tassel at his far hip: they hang on the coat's layer, over the trousers
    'ornaments': [(73, 102), (80, 102), (80, 119), (73, 119)],
    'tassel': [(92, 103.5), (96, 103.5), (96, 114.5), (92, 114.5)],
    'ornament2': [(70.5, 115), (75, 115), (75, 120.5), (70.5, 120.5)],
    # his trousers in the coat's opening and his boots
    'legN': [(68.5, 103.5), (79.5, 103.5), (80.5, 118), (78.5, 130), (77.5, 140), (75, 150), (74.5, 156), (73, 165),
             (69.5, 172), (70, 180), (70.5, 186), (68, 190.5), (55, 190.5), (54.5, 184), (57, 176), (58.5, 165),
             (59.5, 155), (61, 148), (61.5, 140), (63.5, 130), (66, 120), (68, 110)],
    'legF': [(80.5, 103.5), (97.5, 103.5), (97.5, 125), (97, 140), (97.5, 150), (101, 165), (103.5, 178), (103, 186.5),
             (83, 186.5), (83.5, 170), (83, 155), (82.5, 147), (84.5, 140), (84.5, 125), (81, 120)],
    # the back of his coat between his legs: its purple lining
    'lining': [(77, 118), (88, 118), (88, 149), (77, 149)],
    # the coat: collar, lapels, body, shirt and cravat, belt, the skirts to their tattered hems
    'torso': [(60, 50), (100, 50), (97, 56), (96, 62), (95.5, 80), (96, 96), (98.5, 104), (101.5, 108.5), (101.5, 124),
              (106, 125), (110, 129), (111, 150), (110, 160), (96, 160), (96, 150), (64, 150), (62, 160), (44, 160),
              (43.5, 150), (45, 138), (47, 126), (48, 110), (60, 110), (61.5, 96), (64.5, 82), (66.5, 66), (64, 57)],
}
# Back to front.
ORDER = ['armF', 'handF', 'lining', 'legF', 'legN', 'torso', 'armN', 'blade', 'hilt', 'handN', 'head']
# Which of his parts each of ours is cut from ('armF' wears his near sleeve; the ornaments ride the
# coat's layer).
SOURCE = {'armF': ['armN'], 'torso': ['torso', 'ornaments', 'tassel', 'ornament2']}
# Under his belt's ornaments his trousers go on (the ornaments ride the coat's layer, laid by its
# map, a little off where the legs' maps lay the trousers): his trousers' cloth there.
UNDERNEATH = {'legN': (['ornaments', 'ornament2'], '#252328'), 'legF': (['tassel'], '#1a191e')}

# His sword's blade (polygon, his pixels): from the cross-guard to the point, its black line round it.
# The hilt (pommel, grip, cross-guard) is drawn by hand at our scale (LAYER_PATCHES['hilt']): at 0.6
# it is a few pixels each, his grip is hidden under his glove and his cuff, and his guard lies on
# his coat and cape, so it is drawn as he drew it rather than cut out of them.
BLADE = [(37.5, 122.5), (44.5, 122.5), (50.5, 126.5), (50, 130.5), (47, 135.5), (43, 140.5), (36, 150.5), (28, 160.5),
         (21, 170.5), (16, 175.5), (12, 180), (9, 180), (9.5, 176), (10.5, 174), (13, 169.5), (19.5, 159.5),
         (25.5, 149.5), (32.5, 139.5), (34.5, 134.5), (37, 129.5)]
# His cross-guard and pommel, to keep them out of the coat (the guard lies on his near skirt, MEND_ROWS).
HILT = [((64.5, 101.5), (57, 112.5), 2.6), ((37.5, 112.5), (58.5, 134), 2.2), ((50, 120), (45.5, 127), 3.0)]

# Mends in his pixels, before anything is cut: (polygon, from colours, to colour). In the polygon,
# his pixels of the `from` colours (characters of scarlet_ref.CHARS; '*' any) become `to`.
#   the cape's gold edge across his near upper arm, and its black shadow under it -> his sleeve's
#   greys (the coat's shoulder runs on into the sleeve);
#   his coat's near skirt behind the cross-guard and the grip -> his coat's dark cloth, and the gold
#   trim of the skirt's outer edge carried up behind the guard.
MEND = [
    ([(68, 71), (69, 74), (52, 87), (48, 86), (48, 82)], 'mvyFJOSa', 'j'),
    ([(68, 71), (69, 74), (52, 87), (48, 86), (48, 82)], 'bd', 'f'),
]
# The coat's near skirt behind the cross-guard, drawn by hand in his pixels (x0, y0, rows; '.' keeps
# his pixel, '_' clears it): his panel's cloth, its outer edge's dark gold trim carried up from where
# it shows (x 52, y 136) to under his glove, and the white and the cape beside it cleared.
MEND_ROWS = [
    (45, 124, [
        '____abvdfjjjjj',
        '____abvdfjjnjj',
        '____abvdfjnnjj',
        '_____avdfjnjjj',
        '_____avdfjjjjj',
        '_____avdhjjjjj',
        '_____avdfjjjjf',
        '______avdfjjjj',
        '______avdfjjjj',
        '______avddfjjj',
        '______bvddfjjj',
        '______bvvdfjnj',
    ]),
]

# His gold, his eye colours and his reds: his trims are laid on forward (GOLD), and the mean that
# picks a cloth pixel's colour leaves his gold out.
GOLD = ['#947650', '#a8865d', '#846542', '#70583c', '#be8867']
DARK_GOLD = ['#5e4a33', '#4e3c2b', '#332a1e']
REDS = ['#5d0e1a', '#84141f', '#7c1e2c', '#a11a24', '#a9292f', '#9e3b41', '#c72b32', '#d83c44', '#e85056']
COVER = 0.5  # a pixel of ours is a part's when this much of it is
# but a pixel of his hair's when a third of it is: his hair ends in thin strands, one of his pixels
# wide, that would be lost
COVER_PART = {'head': 0.34}
SAMPLES = 5
# The parts whose gold is laid on forward.
SPLAT = {'torso', 'armN', 'armF', 'handN', 'handF', 'legN', 'legF'}
# The blade takes, for each of our pixels, his commonest colour along the blade through the point
# under its middle (5 of his pixels along, one across): his black line, his steel edges and his red
# core stay apart, each an unbroken band, and his JPEG speckle along them goes.
NEAREST = {'blade', 'hilt'}
ALONG = 2

# His black line round the figure; his hair's own dark red where the hair is the edge.
LINE = '#040405'
HAIR_LINE = '#26060d'
HAIR = ['#26060d', '#3a0f1e', '#4e172a', '#601f35', '#70273e', '#87324c', '#9a3e58', '#ac5068']
# Where his coat is hidden in his picture and ours shows (our arms hang clear of the body, our far
# hand further out): the coat's layer carried on outward, row by row, to a column of ours, in his
# cloth (side, first row, last row + 1, to x, colour).
UNDER = {'torso': [('L', 148, 170, 115, '#252328'), ('L', 170, 186, 111, '#1a191e'), ('R', 172, 194, 141, '#1a191e')]}

# Mends by hand, in our frame: (x0, y0, rows); '.' keeps the pixel, '_' clears it, any other
# character is that colour of his (scarlet_ref.CHARS). LAYER_PATCHES go on one part's own layer
# (scarlet_ref.reduced_layers(): what of it the parts in front hide too); PATCHES on the finished
# figure, after his black line.
LAYER_PATCHES = {
    # his legs on ours, drawn at our scale after his: his trousers with his pinstripes (two of our
    # pixels apart: his are finer than our pixel), lit on the near side, the near knee's fold; his tall
    # boots: the cuff at the top with his strap across it, his shine down the shin and over the toe,
    # the black sole; the near toe a little to the side as his, the far one forward as his
    'legN': [(110, 174, [
        '________tjtjnfndja',
        '________tjtjnfndja',
        '________tjtjnfndja',
        '________tjtjnfndja',
        '________tjtjnfndja',
        '________tjtjnfndja',
        '________tjtjnfndja',
        '________tjtjnfndja',
        '________tjtjnfndja',
        '________tjtjnfndja',
        '________tjtjnfndja',
        '________tjtjnfndja',
        '_______jtjtfnfjdb_',
        '_______jtjtfnfjdb_',
        '_______jtjtfnfjdb_',
        '_______jtjtfnfjdb_',
        '_______jtjnfjdb___',
        '_______jtjnfjdb___',
        '_______jtjnfjdb___',
        '______dfdfdfdf____',
        '______tjtfndjb____',
        '______tjtfndjb____',
        '_____aaaaaaaaa____',
        '_____ajntnjfda____',
        '_____aBHNHBtna____',
        '_____afjnjfdda____',
        '______ajnBnfda____',
        '______afnHnfda____',
        '______afjBnfda____',
        '______afjHjfda____',
        '______adjBjfda____',
        '______adnBjdda____',
        '______afnHjdda____',
        '_____afjBtfda_____',
        '_____afnHjfda_____',
        '____afjBtjfda_____',
        '___aajnHjffdda____',
        '___afnBtjfddda____',
        '___ajBHnjfddda____',
        '__afnHVnjffdda____',
        '__ajBVHtjffdda____',
        '__anHBtjffddda____',
        '__atBtjffddda_____',
        '__ajtjffdddba_____',
        '___aaaaaaaaaa_____',
    ])],
    'legF': [(126, 172, [
        '_nfnfjdjdfbf__________',
        '_nfnfjdjdfbf__________',
        '_nfnfjdjdfbf__________',
        '_nfnfjdjdfbf__________',
        '_nfnfjdjdfbf__________',
        '_nfnfjdjdfbf__________',
        '__fnfndjdfbf__________',
        '__fnfndjdfbf__________',
        '__fnfnfjdjdfbf________',
        '__fnfnfjdjdfbf________',
        '__fnfnfjdjdfbf________',
        '__fnfnfjdjdfbf________',
        '_____afnfjdfbf________',
        '_____afnfjdfbf________',
        '_____afnfjdjbfb_______',
        '_____afnfjdjbfb_______',
        '_____afnfjdjbfb_______',
        '_____aaaaaaaaaa_______',
        '______afjntnjfa_______',
        '______atBHNHBta_______',
        '______adfjnjfda_______',
        '_______afjBnfda_______',
        '_______afjHnfda_______',
        '_______adjBjfda_______',
        '_______adjHjfda_______',
        '_______adjBjfda_______',
        '_______adnHjfda_______',
        '_______adnBjfda_______',
        '_______adnHjfda_______',
        '_______adjBjfdda______',
        '_______adjtBjfdda_____',
        '______addjjtBjfdaa____',
        '______addjjntBHjfda___',
        '______addfjjntBHjfdda_',
        '______addfjjnntBVHjfda',
        '______addffjjnntBVHjda',
        '______abddffjjnntBHjda',
        '______aabddffjjjnttjda',
        '__________aaaaaaaaaa__',
    ])],
    # his chest, drawn at our scale after his: the high collar (gold-edged, his white glint at the near
    # tip), the cravat's knot round the neck and its tail down the middle of the shirt, the open
    # collar's skin, the near lapel (his gold edge, his gold embroidery, its black inner edge), the far
    # lapel (gold edge and embroidery), the coat's near front edge in his dark gold, the shirt's white
    # and greys to his belt, and his gold buckle ring
    'torso': [(116, 147, [
        '.azfda.........afJa.....',
        '.aJSfjak......kbjJfa....',
        '.afShfaukk...kucaJfa....',
        '.jfSOhfakuZXukcaJFda....',
        '.jfOhSfackUkuukaSyfa....',
        '.nfOJfSaakurukcaJvfd....',
        '.njSfOJSackuukcaOyfd....',
        '.njOJfSFSa7ikuk5aJfd....',
        '.jfSfSOfJa75kuc3aSyf....',
        '.jfdSJfOJa75ukc0aJvf....',
        '.jfdSfOJfa73kuiYaOyf....',
        '.ffdjSfJOa53kuc0aJvf....',
        '.ffdjSOfJa70kucYaSyf....',
        '.fddfjSJfa53ckuVaJvf....',
        '.fddfjSfOa70ikuYaOyf....',
        '.fddffjSJa53kuk0aJvf....',
        '.fddffjSfa70ckiVaSyf....',
        '.fddffjjSa53Ykc0aJvf....',
        '.fddffjjSa703iYVaOyf....',
        '.fddffjjSa70330YaJvf....',
        '.fddffjjya5303YVaSyf....',
        '.fddffjjya7053YVaJvf....',
        '.fddffjjva3503YRaOyf....',
        '.fddffjjyaV03YVNaJvf....',
        '.fddffjjvaRVYVNRayff....',
        '.ddajnjnyaaaaJOSayad....',
        '...adfjfdvdhOadXJadd....',
        '...adffddyddSddSFadf....',
        '...aedddavadJOSvaadf....',
    ]),
              # his coat's skirts below the belt: the near one (his dark gold trim down its front edge and its
              # outer edge, its cloth lit toward the front, a fold, his tattered hem), the far one (the purple
              # lining inside its front edge, his trim, the shaded cloth, the hem); his gold cross and the small
              # gold piece hanging from the belt over the near thigh, his red tassel at the far hip
              (104, 176, [
        '_______ddffjjjjya_____J_______J__vffffdd____',
        '_______ddffjjjjva____JSJ______k__yffffdd____',
        '_______ddffjjjjya___JOSOJ_____s__vffffdd____',
        '_______ddffjjjjya____aOa______k__vffffdd____',
        '_______ddffjjjjva_____J_______s__yfffffdd___',
        '_______ddffjjjya______O_______k__vfffffdd___',
        '_______ddffjjjya__FJ__J__________vfffffdd___',
        '_______ddffjjjva__JO__F_________ehyffffdd___',
        '_______ddfffjjya________________ehvffffdd___',
        '_______ddfffjjya________________ehvffffdd___',
        '______vdfffjjva_________________ehyffffdd___',
        '______vdfffjjya_________________ehvffffdd___',
        '______vdfffjjya__________________ehvfffdd___',
        '______vdfffjjva__________________ehyfffdd___',
        '_____vdfffjjjya__________________ehvffffdd__',
        '_____vdfffjjya___________________ehvffffdd__',
        '_____vdfffjjva___________________ehyffffdd__',
        '_____vdfffjjya____________________ehvfffdd__',
        '____vdfffjjjya____________________ehvfffdd__',
        '____vdfffjjjva____________________ehyfffdd__',
        '____vdfffjjjya____________________ehvfffdd__',
        '____vdfffjjjya____________________ehvfffdd__',
        '____vdfd_fjjy_____________________ehyfffdd__',
        '____vd____jy______________________hevf_dd___',
        '____d______v_________________________f__d___',
        '_____________________________________d______',
        '____________________________________________',
        '____________________________________________',
        '____________________________________________',
        '____________________________________________',
              ])],
    # his fingerless gloves on our fists (his near one round a grip that, turned, runs the other way,
    # so drawn by hand): his black leather lit on the side the light comes from, his skin on the
    # fingers, in our fists' own finger shading; the near fist round the grip, the far one hanging
    'handN': [(102, 174, [
        '__________',
        '__antjfaa_',
        '_antBnjfa_',
        '_ajntnjfda',
        '_ajnnjffda',
        '_afjjffdaa',
        '_a4Q4Q4QQa',
        '_aX4X4X4a_',
        '__aQXQXQa_',
        '___aa_aa__',
        '__________',
    ])],
    'handF': [(138, 171, [
        '_________',
        '_________',
        '_aafnnfa_',
        '_ajntnja_',
        '_afjfjnfa',
        '_aXqXqXUa',
        'aaUQUQUQa',
        '__aQUXXa_',
        '___aUUa__',
        '____aa___',
        '_________',
    ])],
    # the coat's near shoulder (the cape lay over his) rounded out over our broad shoulder, in his
    # sleeve's lit greys
    'armN': [(106, 147, [
        '......hhhhhh.',
        '....hhjttnnn.',
        '...hjtt......',
        '..hjtn.......',
        '..hjtn.......',
        '.hjjtn.......',
        '.hjjnj.......',
        '.hjjh........',
        '.hjjh........',
        '.hjh.........',
        '.hh..........',
    ])],
    # his face: his eyes on ours (his lashes, his white, his amber iris and its glint; the far one his
    # dark amber and glint), the shade under his bangs, the hair strand between his eyes, his nose's
    # shade, his small smile, his jaw and chin
    'head': [(119, 139, [
        'rAlrArrMJMUrl44M..',
        'liiwAwcbbbQl4qaab.',
        'irwrAGZ3TI66zI5bc.',
        'lrwlrwM4z7666QZXb.',
        'ilrwlAl466666422b.',
        'lilrwl466666UXZb..',
        'iilirl466666UZXb..',
        '....zQ262MU66ZXi..',
        '....Mz466662XZv_..',
        '....cUJq2662Fa_...',
        '......UMqqZ6c_....',
    ])],
    # his hilt, turned with his blade: his pommel (steel cap, red gem with his pink glint, dark ring),
    # his grip (dark steel, under our fist) and his cross-guard (light steel on the side the light
    # comes from, his red gem where the blade leaves it), in his black line
    'hilt': [(96, 170, [
        '..........................',
        '.aaa......................',
        'aHBta.....................',
        'at1Ka.................aa..',
        '.aCsraa..............aNta.',
        '..aaiBBaa...........aRBa..',
        '......atBaa........aNta...',
        '.......aatBa......aRBa....',
        '.........aataa...aNta.....',
        '...........aBta.aRBa......',
        '............aaBaNta.......',
        '..............aKCa........',
        '.............aNsa.........',
        '............aRBa..........',
        '...........aNta...........',
        '..........aRBa............',
        '.........aNta.............',
        '........aRBa..............',
        '.......aVta...............',
        '.......aaa................',
        '..........................',
    ])],
}
PATCHES = []


def inside(poly, xs, ys):
    """Even-odd test of points against a polygon."""
    poly = np.asarray(poly, float)
    res = np.zeros(np.broadcast(xs, ys).shape, bool)
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        cond = ((yi > ys) != (yj > ys)) & (xs < (xj - xi) * (ys - yi) / (yj - yi + 1e-12) + xi)
        res ^= cond
        j = i
    return res


def capsule(a, b, hw, xs, ys):
    a = np.asarray(a, float)
    b = np.asarray(b, float)
    d = b - a
    t = np.clip(((xs - a[0]) * d[0] + (ys - a[1]) * d[1]) / (d @ d), 0, 1)
    return np.hypot(xs - a[0] - t * d[0], ys - a[1] - t * d[1]) <= hw


def ci(h):
    return R.PALETTE.index(h)


def his():
    """His pixels, mended (MEND, MEND_ROWS): (N rgb, Q palette indices, N0 and Q0 as he drew them, for
    the sword, and the parts' masks). His white round him is no part's; nor is the cape."""
    N0 = R.native()
    fig = ~R.background(N0)
    Q0 = R.quantize(N0)
    N, Q = N0.copy(), Q0.copy()
    H, W = Q.shape
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy = xx + 0.5, yy + 0.5
    P = R.rgb()
    # the sword, as he drew it (the mends paint over where it was)
    skin = np.isin(Q0, [ci(h) for h in ('#f8d4b8', '#f2c8aa', '#eabb9d', '#e2af8c', '#ca9c75', '#be8867', '#b27758', '#9e654b')])
    M = {}
    hilt = np.zeros((H, W), bool)
    for a, b, hw in HILT:
        hilt |= capsule(a, b, hw, cx, cy)
    M['hilt'] = hilt & ~skin & fig & ~inside(PARTS['handN'], cx, cy) & ~inside(PARTS['armN'], cx, cy)
    M['blade'] = inside(BLADE, cx, cy) & fig & ~M['hilt']
    taken = ~fig | M['hilt'] | M['blade']
    for poly, frm, to in MEND:
        m = inside(poly, cx, cy) & fig
        if frm != '*':
            m &= np.isin(Q, [R.CHARS.index(c) for c in frm])
        Q[m] = R.CHARS.index(to)
        N[m] = P[R.CHARS.index(to)]
    for x0, y0, rows in MEND_ROWS:
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                y, x = y0 + dy, x0 + dx
                if ch == '_':
                    taken[y, x] = True
                elif ch != '.':
                    Q[y, x] = R.CHARS.index(ch)
                    N[y, x] = P[R.CHARS.index(ch)]
                    taken[y, x] = False
    shine = np.isin(Q, [ci(h) for h in GOLD + DARK_GOLD + REDS])
    near = shine | np.pad(shine, 1)[:-2, 1:-1] | np.pad(shine, 1)[2:, 1:-1] | np.pad(shine, 1)[1:-1, :-2] | np.pad(shine, 1)[1:-1, 2:]
    for name in ('head', 'handN', 'armN', 'handF', 'ornaments', 'tassel', 'ornament2', 'legN', 'legF', 'lining', 'torso'):
        m = inside(PARTS[name], cx, cy) & ~taken
        if name in ('ornaments', 'tassel', 'ornament2'):
            m &= near
        M[name] = m
        taken |= m
    return N, Q, N0, Q0, M


def reduce_part(name, seg, N, Q, mask, box, gold):
    """One part of him brought down onto our box: (h, w) PALETTE indices, -1 where he is not."""
    x0, y0, x1, y1 = box
    h, w = y1 - y0, x1 - x0
    H, W = Q.shape
    S = 1 if name in NEAREST else SAMPLES
    offs = (np.arange(S) + 0.5) / S
    oy, ox = np.meshgrid(offs, offs, indexing='ij')
    yy, xx = np.mgrid[y0:y1, x0:x1]
    q = np.stack([(xx[..., None, None] + ox).ravel(), (yy[..., None, None] + oy).ravel()], 1)
    p = R.backward(seg, q)
    px = np.floor(p[:, 0]).astype(int)
    py = np.floor(p[:, 1]).astype(int)
    ok = (px >= 0) & (px < W) & (py >= 0) & (py < H)
    hit = np.zeros(len(q), bool)
    hit[ok] = mask[py[ok], px[ok]]
    cols = np.zeros((len(q), 3))
    cols[hit] = N[py[hit], px[hit]]
    isg = np.zeros(len(q), bool)
    isg[hit] = np.isin(Q[py[hit], px[hit]], list(gold))
    hit = hit.reshape(h, w, S * S)
    cols = cols.reshape(h, w, S * S, 3)
    isg = isg.reshape(h, w, S * S)
    cover = hit.mean(-1)
    out = np.full((h, w), -1)
    on = cover >= (COVER_PART.get(name, COVER) if S > 1 else 0.5)
    # the mean of his colours under the pixel, his gold left out where it is not all gold
    use = hit & ~isg
    none = use.sum(-1) == 0
    use[none] = hit[none]
    n = np.maximum(use.sum(-1), 1)
    mean = (cols * use[..., None]).sum(2) / n[..., None]
    if on.any():
        out[on] = R.quantize(mean[on])
    return out


def splat(seg, Q, mask, keep, box):
    """His pixels of the colours `keep` laid forward onto our box, each on the pixel of ours its
    middle lands in: his thin lines stay unbroken (one of ours is 1.8 of his). (h, w) indices, -1
    elsewhere; where several of his land on one of ours the brightest wins."""
    x0, y0, x1, y1 = box
    ys, xs = np.nonzero(mask & np.isin(Q, list(keep)))
    out = np.full((y1 - y0, x1 - x0), -1)
    if not len(xs):
        return out
    q = R.forward(seg, np.stack([xs + 0.5, ys + 0.5], 1).astype(float))
    u = np.floor(q[:, 0]).astype(int) - x0
    v = np.floor(q[:, 1]).astype(int) - y0
    L = R.luma(R.rgb())
    for i, j, c in sorted(zip(u, v, Q[ys, xs]), key=lambda t: (L[t[2]], t[0], t[1])):
        if 0 <= i < x1 - x0 and 0 <= j < y1 - y0:
            out[j, i] = int(c)
    return out


def turn(a, k):
    return np.rot90(a, k)


def outline(idx, part):
    """His black line round the figure: every pixel on its edge that is not already as dark; his hair
    keeps its own dark red edge. And between his parts where one lies on another of the same cloth
    (his near sleeve on his coat, his legs under his coat's hem): the front part's edge."""
    L = R.luma(R.rgb())
    line, hairline = ci(LINE), ci(HAIR_LINE)
    hairish = {ci(c) for c in HAIR}
    op = idx >= 0
    pad = np.pad(op, 1)
    edge = op & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    out = idx.copy()
    for j, i in zip(*np.nonzero(edge)):
        v = idx[j, i]
        if L[v] <= 12:
            continue
        out[j, i] = hairline if (part[j, i] == 'head' and v in hairish) else line
    # the near sleeve's edge where it lies on the coat
    h, w = idx.shape
    for j in range(h):
        for i in range(w):
            if part[j, i] != 'armN' or L[out[j, i]] <= 12:
                continue
            nb = [part[jj, ii] for jj, ii in ((j - 1, i), (j + 1, i), (j, i - 1), (j, i + 1)) if 0 <= jj < h and 0 <= ii < w]
            if 'torso' in nb:
                out[j, i] = line
    return out


def patch(idx, box, patches):
    x0, y0 = box[:2]
    idx = idx.copy()
    for px, py, rows in patches:
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                if ch == '.':
                    continue
                idx[py + dy - y0, px + dx - x0] = -1 if ch == '_' else R.CHARS.index(ch)
    return idx


def blade_layer(seg, Q, mask, box):
    """The blade on our box: for each of our pixels, his commonest colour along the blade (ALONG of
    his pixels either way) through the point under its middle; -1 off the blade."""
    x0, y0, x1, y1 = box
    H, W = Q.shape
    yy, xx = np.mgrid[y0:y1, x0:x1]
    p = R.backward(seg, np.stack([xx.ravel() + 0.5, yy.ravel() + 0.5], 1))
    a, b = (np.asarray(v, float) for v in seg['his'][:2])
    u = (b - a) / np.hypot(*(b - a))
    out = np.full(len(p), -1)
    for i, (px, py) in enumerate(p):
        ix, iy = int(np.floor(px)), int(np.floor(py))
        if not (0 <= ix < W and 0 <= iy < H and mask[iy, ix]):
            continue
        votes = []
        for k in range(-ALONG, ALONG + 1):
            jx, jy = int(np.floor(px + k * u[0])), int(np.floor(py + k * u[1]))
            if 0 <= jx < W and 0 <= jy < H and mask[jy, jx]:
                votes.append(int(Q[jy, jx]))
        out[i] = max(sorted(set(votes)), key=lambda c: (votes.count(c), c == Q[iy, ix]))
    return out.reshape(y1 - y0, x1 - x0)


def layers():
    """Each part of him on our box, alone (what the parts in front of it hide included): a dict of
    (h, w) PALETTE indices, -1 where it is not."""
    N, Q, N0, Q0, M = his()
    box = REDUCED_BOX
    h, w = box[3] - box[1], box[2] - box[0]
    gold = {ci(c) for c in GOLD}
    out = {}
    for name in ORDER:
        seg = R.SEGMENTS[name]
        mask = np.zeros(Q.shape, bool)
        for src in SOURCE.get(name, [name]):
            mask |= M[src]
        n, q = (N0, Q0) if name in NEAREST else (N, Q)
        if name in UNDERNEATH:
            srcs, c = UNDERNEATH[name]
            n, q = n.copy(), q.copy()
            for src in srcs:
                under = M[src] & inside(PARTS[name], *np.mgrid[0:Q.shape[0], 0:Q.shape[1]][::-1] + 0.5)
                mask |= under
                q[under] = ci(c)
                n[under] = R.rgb()[ci(c)]
        if seg.get('quarter_turns'):
            k = seg['quarter_turns']
            n, q, mask = turn(n, k), turn(q, k), turn(mask, k)
        if name == 'hilt':
            r = np.full((h, w), -1)
        elif name == 'blade':
            r = blade_layer(seg, q, mask, box)
        else:
            r = reduce_part(name, seg, n, q, mask, box, gold)
        if name in SPLAT:
            sp = splat(seg, q, mask, gold, box)
            on = (sp >= 0) & (r >= 0)
            r[on] = sp[on]
        for side, ya, yb, to, c in UNDER.get(name, []):
            r = extend(r, box, side, ya, yb, to, ci(c))
        out[name] = patch(r, box, LAYER_PATCHES.get(name, []))
    return out


def extend(r, box, side, ya, yb, to, c):
    """A layer carried on outward (side 'L' or 'R') to column `to` of our frame, in colour c, on rows
    ya..yb-1."""
    r = r.copy()
    x0, y0 = box[:2]
    for y in range(ya, yb):
        row = r[y - y0]
        xs = np.nonzero(row >= 0)[0]
        if not len(xs):
            continue
        if side == 'L':
            row[to - x0:xs[0]] = np.where(row[to - x0:xs[0]] < 0, c, row[to - x0:xs[0]])
        else:
            row[xs[-1] + 1:to - x0 + 1] = np.where(row[xs[-1] + 1:to - x0 + 1] < 0, c, row[xs[-1] + 1:to - x0 + 1])
    return r


def compose(lay):
    """The parts back to front, his black line and the PATCHES: (idx, part)."""
    box = REDUCED_BOX
    h, w = box[3] - box[1], box[2] - box[0]
    idx = np.full((h, w), -1)
    part = np.full((h, w), '', dtype='<U6')
    for name in ORDER:
        put = lay[name] >= 0
        idx[put] = lay[name][put]
        part[put] = name
    idx = outline(idx, part)
    idx = patch(idx, box, PATCHES)
    part[idx < 0] = ''
    return idx, part


def build():
    N, Q, N0, Q0, M = his()
    idx, part = compose(layers())
    return N, Q, M, idx, part


def to_rgba(idx):
    P = R.rgb()
    out = np.zeros(idx.shape + (4,), np.uint8)
    m = idx >= 0
    out[m, :3] = P[idx[m]]
    out[m, 3] = 255
    return out


def big(a, k, bgc=(236, 236, 240)):
    a = a.astype(np.uint8)
    if a.shape[2] == 4:
        base = np.zeros(a.shape[:2] + (3,), np.uint8)
        base[:] = bgc
        al = a[..., 3:4] / 255.0
        a = (a[..., :3] * al + base * (1 - al)).astype(np.uint8)
    im = Image.fromarray(a)
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def bare(idle, idx, part):
    """Our body's pixels he leaves bare, other than his face, neck and fingers: (h, w) bool."""
    x0, y0, x1, y1 = REDUCED_BOX
    sub = idle[y0:y1, x0:x1]
    body = sub[..., 3] > 0
    yy, xx = np.mgrid[y0:y1, x0:x1]
    hx, hy = R.OUR_JOINTS['head']
    face = (np.hypot(xx - hx, (yy - hy) * 0.9) < 11.5) | ((yy < 151) & (np.abs(xx - 127) < 5))
    hands = np.zeros_like(face)
    for j in ('handN', 'handF'):
        jx, jy = R.OUR_JOINTS[j]
        hands |= np.hypot(xx - jx, yy - jy) < 4.5
    return body & (idx < 0) & ~face & ~hands


def write_outputs(out, idle_path, N, Q, M, idx, part):
    box = REDUCED_BOX
    rgba = to_rgba(idx)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(out, 'reduced@1.png'))
    big(rgba, 8).save(os.path.join(out, 'reduced@8.png'))
    R.save(R.native(), os.path.join(out, 'native@4.png'), 4)
    # palette: every colour of his, the ones the reduced reference uses underlined
    used = set(np.unique(idx[idx >= 0]).tolist())
    k = 24
    pal = Image.new('RGB', (len(R.PALETTE) * k, k + 6), (255, 255, 255))
    d = ImageDraw.Draw(pal)
    for i, hexc in enumerate(R.PALETTE):
        d.rectangle((i * k, 0, i * k + k - 2, k - 1), fill=hexc)
        if i in used:
            d.rectangle((i * k, k + 1, i * k + k - 2, k + 4), fill=(0, 0, 0))
    pal.save(os.path.join(out, 'palette.png'))
    # overlay on our male idle, joints marked, our body he leaves bare in magenta
    k = 8
    idle = np.asarray(Image.open(idle_path).convert('RGBA')).astype(np.float64)
    x0, y0, x1, y1 = box
    base = np.full((y1 - y0, x1 - x0, 3), 236.0)
    sub = idle[y0:y1, x0:x1]
    al = sub[..., 3:4] / 255
    base = base * (1 - al) + (sub[..., :3] * 0.55 + 236 * 0.45) * al
    ra = rgba[..., 3:4] / 255 * 0.72
    comp = base * (1 - ra) + rgba[..., :3] * ra
    comp[bare(idle, idx, part)] = (255, 0, 255)
    im = Image.fromarray(comp.astype(np.uint8)).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for name, (jx, jy) in R.OUR_JOINTS.items():
        X, Y = (jx - x0) * k, (jy - y0) * k
        col = (0, 140, 255) if name.endswith('N') else (230, 40, 200) if name.endswith('F') else (0, 190, 0)
        d.ellipse((X - 5, Y - 5, X + 5, Y + 5), outline=col, width=2)
    im.save(os.path.join(out, 'overlay@8.png'))
    # his figure without the cape beside ours at the same height
    keep = np.zeros(Q.shape, bool)
    for m in M.values():
        keep |= m
    hisf = np.zeros(N.shape[:2] + (4,), np.uint8)
    hisf[keep, :3] = N[keep]
    hisf[keep, 3] = 255
    yy, xx = np.nonzero(keep)
    hisf = hisf[yy.min():yy.max() + 1, xx.min():xx.max() + 1]
    oy, ox = np.nonzero(idx >= 0)
    ours = rgba[oy.min():oy.max() + 1, ox.min():ox.max() + 1]
    kk = 4
    hh = ours.shape[0] * kk
    a = big(hisf, 1)
    a = a.resize((round(a.width * hh / a.height), hh), Image.NEAREST)
    b = big(ours, kk)
    c = Image.new('RGB', (a.width + b.width + 16, hh), (255, 255, 255))
    c.paste(a, (0, 0))
    c.paste(b, (a.width + 16, 0))
    c.save(os.path.join(out, 'compare@4.png'))
    # his parts, each in its own tint over his (mended) pixels; the cape and the white left grey
    tint = {'blade': (255, 60, 60), 'hilt': (255, 140, 60), 'head': (255, 200, 0), 'armN': (0, 140, 255),
            'handN': (0, 220, 255), 'handF': (230, 40, 200), 'legN': (0, 200, 120), 'legF': (120, 220, 0),
            'lining': (150, 60, 255), 'torso': (255, 255, 255), 'ornaments': (255, 255, 0),
            'tassel': (255, 255, 0), 'ornament2': (255, 255, 0)}
    show = (N * 0.25 + 150).astype(np.uint8)
    for name, m in M.items():
        show[m] = (N[m] * 0.55 + np.array(tint[name]) * 0.45).astype(np.uint8)
    R.save(show, os.path.join(out, 'parts@4.png'), 4)


def write_npy(idx, part):
    os.makedirs(os.path.dirname(R.REDUCED), exist_ok=True)
    x0, y0 = REDUCED_BOX[:2]
    a = np.where(idx >= 0, idx, 255).astype(np.uint8)
    a = np.vstack([a, np.zeros((1, a.shape[1]), np.uint8)])
    a[-1, :2] = (x0, y0)
    with open(R.REDUCED, 'wb') as f:
        np.save(f, a, allow_pickle=False)
    lab = np.full(idx.shape, 255, np.uint8)
    for i, name in enumerate(R.PART_NAMES):
        lab[part == name] = i
    lab = np.vstack([lab, np.zeros((1, lab.shape[1]), np.uint8)])
    lab[-1, :2] = (x0, y0)
    with open(R.REDUCED.replace('.npy', '-parts.npy'), 'wb') as f:
        np.save(f, lab, allow_pickle=False)


def rows(idx, x0, y0, x1, y1):
    """The reduced reference over a box of our frame as rows of his colours' characters (for
    PATCHES)."""
    bx, by = REDUCED_BOX[:2]
    out = []
    for y in range(y0, y1):
        out.append(''.join('.' if idx[y - by, x - bx] < 0 else R.CHARS[idx[y - by, x - bx]] for x in range(x0, x1)))
    return out


def palette():
    """His colours, rebuilt: his figure's pixels clustered (redmean distance 14, most common first,
    then medians), plus the purples of his lining clustered apart (distance 7, 8 pixels or more)."""
    N = R.native()
    L = R.luma(N)

    def cluster(px, tol):
        keys, inv, cnt = np.unique((px // 6).astype(int), axis=0, return_inverse=True, return_counts=True)
        inv = inv.ravel()
        cs = []
        for o in np.argsort(-cnt, kind='stable'):
            c = px[inv == o].mean(0)
            if all(R.colour_distance(c, q) > tol for q in cs):
                cs.append(c)
        cs = np.array(cs)
        for _ in range(10):
            lab = np.stack([R.colour_distance(px, c) for c in cs], 1).argmin(1)
            cs = np.array([np.median(px[lab == i], 0) for i in range(len(cs)) if (lab == i).any()])
        lab = np.stack([R.colour_distance(px, c) for c in cs], 1).argmin(1)
        return np.round(cs).astype(int), np.bincount(lab, minlength=len(cs))

    main, _ = cluster(N[L < 236].reshape(-1, 3).astype(float), 14)
    pur = ((N[..., 0] + N[..., 2]) / 2 - N[..., 1] >= 5) & (L < 60) & (np.abs(N[..., 0] - N[..., 2]) < 14)
    purples, pc = cluster(N[pur].reshape(-1, 3).astype(float), 7)
    extra = [c for c, k in zip(purples, pc) if k >= 8 and all(R.colour_distance(c, m) > 4 for m in main)]
    cs = np.array(list(main) + extra)
    cs = cs[np.argsort(R.luma(cs), kind='stable')]
    return ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in cs]


def main():
    if sys.argv[1:] == ['--palette']:
        for h in palette():
            print(h)
        return
    out, idle = sys.argv[1], sys.argv[2]
    N, Q, M, idx, part = build()
    write_outputs(out, idle, N, Q, M, idx, part)
    if '--rows' in sys.argv[3:]:
        x0, y0, x1, y1 = map(int, sys.argv[sys.argv.index('--rows') + 1:sys.argv.index('--rows') + 5])
        for r in rows(idx, x0, y0, x1, y1):
            print(r)
    if '--write' in sys.argv[3:]:
        write_npy(idx, part)


if __name__ == '__main__':
    main()
