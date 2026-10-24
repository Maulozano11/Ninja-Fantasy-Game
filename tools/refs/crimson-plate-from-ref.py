"""The owner's plate armour (docs/reference/aiden-owner-reference.jpg) as painted pieces that ride the rig.

His Aiden wears full plate in his own pixels: steel plates with gold trim and his black line, a gorget
with a gold chain under the chin, a breastplate, faulds over the hips, a brown belt, a navy tasset
in front edged in gold, steel hip tassets, a dark navy under-suit between the plates (it shows at
the armpits, the inner elbows and the thighs), pauldrons, elbow cops, vambraces, knee cops and
greaves. This script cuts it into one piece per segment of our rig, each with its pivot on a joint
(tools/refs/aiden_ref.py: JOINTS), so src/sprite/painted.ts stampPiece draws it exactly as he drew it
in our idle pose and turns it with its limb in every other pose:

  T  chest      gorget, chain, breastplate         pivot: neck       torso.armor
  W  waist      belt, faulds, hip tassets, tasset   pivot: pelvis     torso.armor (over T)
  P  pauldron   near shoulder guard                 pivot: shoulderN  nearArm.armor (top)
  A  upper arm  near arm's under-suit               pivot: shoulderN  nearArm.armor
  E  elbow cop  near elbow                          pivot: elbowN     nearArm.armor (over A, F)
  F  vambrace   near forearm                        pivot: elbowN     nearArm.armor
  Q  pauldron   far shoulder guard                  pivot: shoulderF  farArm.armor (top)
  B  upper arm  far arm's under-suit and plate      pivot: shoulderF  farArm.armor (over G)
  G  vambrace   far forearm                         pivot: elbowF     farArm.armor
  H  thigh      near thigh's under-suit             pivot: hipN       nearLeg.armor
  K  knee cop   near knee                           pivot: kneeN      nearLeg.armor (over H, S)
  S  greave     near shin                           pivot: kneeN      nearLeg.armor
  I  thigh      far thigh's under-suit              pivot: hipF       farLeg.armor
  L  knee cop   far knee                            pivot: kneeF      farLeg.armor (over I, R)
  R  greave     far shin                            pivot: kneeF      farLeg.armor

Each piece is his pixels (OWN: the cells of his picture that belong to it) and, where something of
his covers it - the sword across the legs, the near arm over the torso's side, the cape's mantle
over the shoulders, the pieces drawn over it at the joints - cells continued from his own pixels
(EXTRA, and OWN cells the sword or the cape covers), so other poses never show a hole: they take
the colour of his pixel of the piece met first along a direction (a greave carried up under its
knee cop), or of the nearest of his pixels of the piece or of the donors named for it (his navy
under-suit for the shoulders, the thighs and under the elbow cop), and the piece's edge takes his
black line. A piece only reaches under what is drawn over it in the game, so in our idle pose every
pixel of his stays his: the script checks that (check()) and writes nothing when a filled cell would
show. For that it takes the other parts of his Aiden at the depths the game draws them: the sword
in nearArm.held, the near hand in nearArm.body, the far hand in farArm.body, the head over the
torso, and the cape's mantle over the near shoulder in nearArm.over and over the far one in
capeFront (as the Shadow Half-Cloak draws its own).

Writes <ts> (src/sprite/items/crimsonPlateArt.ts) and, in <out>/, study images at 8x. The same
picture always gives the same bytes. Run with python3 -I:

  python3 -I tools/refs/crimson-plate-from-ref.py <out> [src/sprite/items/crimsonPlateArt.ts]
"""

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import aiden_ref as R  # noqa: E402

J = R.JOINTS


def spans(text):
    """'row: x0-x1 x2-x3' lines (inclusive) as a set of (x, y) cells."""
    out = set()
    for line in text.strip().splitlines():
        row, rest = line.split(':')
        y = int(row)
        for part in rest.split():
            a, b = (part.split('-') + [part])[:2]
            out |= {(x, y) for x in range(int(a), int(b) + 1)}
    return out


# ---------------------------------------------------------------------------------------------
# What of his picture is not the armour (on top of the cape and the white, found by colour): his
# sword's cross-guard (gold like the trim) and the dark red edge of its blade, beside the plates.
SWORD = spans("""
56: 42-43
57: 41-44
58: 40-44
59: 39-43
60: 37-41
61: 36-41
62: 35-42
63: 34-45
64: 35-45
65: 34-47
66: 34-48
67: 33-50
68: 33-52
69: 43-53
70: 45-54
71: 47-56
72: 48-57
73: 49-58
74: 49-60
75: 51-61
76: 52-63
77: 54-64
78: 57-66
79: 57-67
80: 58-68
81: 59-69
82: 61-70
83: 62-70
84: 64-70
""")

# ---------------------------------------------------------------------------------------------
# The pieces: OWN is where the piece is in his picture (cells of the cape, the blade or the sword
# in it are filled), EXTRA where it goes on under what covers it (filled).
PIECES = {}

# The chest: the gorget rising beside the jaw on both sides, the gold chain, the breastplate with its
# gold ridges, down to the belt; the navy of the under-suit at the near armpit.
PIECES['T'] = dict(
    joint='neck', angle=('pelvis', 'neck'),
    own="""
25: 44-47
26: 43-48 57-59
27: 44-49 56-59
28: 45-58
29: 46-58
30: 47-59
31: 45-59
32: 44-59
33: 44-59
34: 44-59
35: 44-60
36: 43-61
37: 43-61
38: 43-61
39: 43-61
40: 43-61
41: 42-61
42: 42-61
43: 43-60
44: 43-60
45: 44-60
46: 44-60
47: 43-61
48: 49-59
49: 52-58
50: 54-57
""",
    # Under the mantle and the near pauldron (the shoulder sloping down from the gorget, in the navy
    # of the armpit), and down under the belt so a longer torso shows no gap.
    extra="""
27: 43
28: 42-44
29: 41-45
30: 40-46
31: 39-44
32: 39-43
33: 39-43
34: 39-43
35: 39-43
36: 39-42
37: 39-42
38: 39-42
39: 39-42
40: 39-42
48: 44-48
49: 44-51
50: 45-53
51: 46-58
52: 49-58
53: 52-58
""",
    fills=[
        # the shoulder: his navy at the armpit
        dict(cells='y<=42', donors='x<=44 y>=36 y<=38 cls=n'),
        # under the belt: the breastplate's last row, carried down
        dict(cells='y>=48', dir=(0, -1), edge=False),
    ],
)

# The waist: the brown belt slanting down across the body with its gold buckle, the faulds and the
# steel hip tasset on the near hip (under the sword's guard), the navy tasset edged in gold in
# front, the belt's end and the steel tasset on the far hip.
PIECES['W'] = dict(
    joint='pelvis', angle=('pelvis', 'neck'),
    own="""
48: 43-48 60-61
49: 43-51 59-61
50: 43-53 58-61
51: 42-62
52: 42-62
53: 41-62
54: 41-62
55: 40-64
56: 40-64
57: 39-65
58: 39-65
59: 40-65
60: 41-48 50-65
61: 42-48 50-66
62: 43-48 50-66
63: 46 50-66
64: 51-66
65: 51-59 64-66
66: 63-66
""",
    extra="""
58: 38
59: 39
60: 40
61: 41
""",
    fills=[dict(cells='all', dir=(1, 0))],
)

# The near pauldron: a domed top plate edged in gold and a lame below it, in his black line; its top
# runs on under the mantle.
PIECES['P'] = dict(
    joint='shoulderN', angle=('shoulderN', 'elbowN'),
    own="""
29: 34-38
30: 34-40
31: 34-41
32: 33-42
33: 32-43
34: 32-43
35: 33-43
36: 34-40
37: 33-40
38: 33-39
39: 32-38
40: 33-38
""",
    extra="""
29: 39-41
30: 41-42
31: 42-43
32: 43
""",
    fills=[dict(cells='all')],
)

# The near upper arm: the navy under-suit and a brown strap between the pauldron and the elbow cop,
# and the dark of the armpit; it runs on under the pauldron round the shoulder joint (not under the
# mantle: only under his pauldron), and under the elbow cop.
PIECES['A'] = dict(
    joint='shoulderN', angle=('shoulderN', 'elbowN'),
    own="""
36: 40-42
37: 41-42
38: 40-42
39: 39-42
40: 39-42
41: 35-41
42: 35-41
43: 35-40
44: 35-40
45: 35-39
""",
    extra="""
29: 35-38
30: 35-40
31: 35-41
32: 35-42
33: 35-43
34: 35-43
35: 35-43
36: 35-39
37: 35-40
38: 35-39
39: 35-38
40: 33-38
41: 31-34
42: 30-34
43: 30-34
44: 30-34
45: 31-34
46: 32-34
""",
    fills=[dict(cells='all', donors='cls=n')],
)

# The near elbow cop: steel with a gold edge.
PIECES['E'] = dict(
    joint='elbowN', angle=('shoulderN', 'elbowN', 'wristN'),
    own="""
40: 31-33
41: 30-34
42: 29-35
43: 29-34
44: 29-35
45: 29-34
""",
    extra='',
    fills=[],
)

# The near vambrace: steel between a gold cuff at each end, a gold strip and dark steel on its inner
# side; it runs up under the elbow cop in the navy of the under-suit.
PIECES['F'] = dict(
    joint='elbowN', angle=('elbowN', 'wristN'),
    own="""
46: 30-39
47: 29-38
48: 29-39
49: 29-39
50: 28-39
51: 30-38
52: 30-38
53: 30-37
54: 29-37
55: 30-37
""",
    extra="""
40: 31-33
41: 31-34
42: 30-34
43: 30-34
44: 30-34
45: 30-34
""",
    fills=[dict(cells='all', donors='piece=A cls=n')],
)

# The far pauldron: in shadow, a little steel and a gold edge; its top runs on under the mantle.
PIECES['Q'] = dict(
    joint='shoulderF', angle=('shoulderF', 'elbowF'),
    own="""
31: 64-65
32: 60-65
33: 60-66
34: 60-66
35: 60-67
36: 61-67
37: 61-66
38: 63-65
""",
    extra="""
28: 60-62
29: 59-63
30: 59-64
31: 59-63
""",
    fills=[dict(cells='all')],
)

# The far upper arm: the navy under-suit with a brown strap, and the edge of a steel plate on its
# outer side; it runs on under the pauldron round the shoulder joint.
PIECES['B'] = dict(
    joint='shoulderF', angle=('shoulderF', 'elbowF'),
    own="""
38: 62
39: 62-66
40: 62-66
41: 62-66
42: 62-67
43: 61-67
44: 61-67
45: 61-68
46: 61-66
""",
    extra="""
29: 57-62
30: 57-63
31: 57-64
32: 57-65
33: 57-65
34: 58-65
35: 58-65
36: 59-65
37: 60-65
38: 61 63-65
""",
    fills=[dict(cells='all', donors='cls=n')],
)

# The far vambrace: dark steel, gold strips; it runs up under the upper arm.
PIECES['G'] = dict(
    joint='elbowF', angle=('elbowF', 'wristF'),
    own="""
46: 67-68
47: 62-68
48: 61-69
49: 62-69
50: 62-69
51: 63-69
52: 63-70
53: 63-70
54: 63-70
55: 64-68
""",
    extra="""
42: 61-66
43: 61-66
44: 61-66
45: 61-66
46: 61-66
""",
    fills=[dict(cells='all', donors='cls=n')],
)

# The near thigh: the navy under-suit, seen between the hip tasset and the tasset in front; the
# sword hides the rest, so it is his navy carried down to the knee.
PIECES['H'] = dict(
    joint='hipN', angle=('hipN', 'kneeN'),
    own="""
60: 49
61: 49
62: 49
63: 47-49
64: 46-50
65: 47-50
66: 39 49-51
67: 39 50-51
68: 39
69: 39-40
""",
    extra="""
51: 43-50
52: 42-51
53: 42-51
54: 42-51
55: 41-51
56: 41-51
57: 41-51
58: 41-51
59: 41-51
60: 41-48 50-51
61: 41-48 50-51
62: 40-48 50-51
63: 40-46 50-51
64: 40-45 51
65: 40-46 51
66: 40-48
67: 40-49
68: 40-49
69: 41-48
70: 40-47
71: 41-46
""",
    fills=[dict(cells='all', donors='cls=n')],
)

# The near knee cop: a round steel cop rimmed in gold and a lame below it with a gold edge; the
# blade hides its top corner.
PIECES['K'] = dict(
    joint='kneeN', angle=('hipN', 'kneeN', 'ankleN'),
    own="""
69: 41-42
70: 39-44
71: 39-46
72: 38-47
73: 38-48
74: 38-48
75: 37-48
76: 37-47
77: 39-47
78: 40-46
79: 41-44
""",
    extra="""
69: 43-45
70: 45-46
""",
    fills=[dict(cells='all')],
)

# The near greave: a lit steel shin plate in his line; it runs up under the knee cop.
PIECES['S'] = dict(
    joint='kneeN', angle=('kneeN', 'ankleN'),
    own="""
77: 37-38
78: 36-39
79: 36-40 45-46
80: 36-46
81: 36-46
82: 36-45
83: 36-45
84: 36-44
85: 36-44
86: 36-43
87: 36-43
""",
    extra="""
71: 39-45
72: 38-46
73: 38-46
74: 38-46
75: 37-46
76: 37-46
77: 39-46
78: 40-46
79: 41-44
""",
    fills=[dict(cells='all', dir=(0, 1))],
)

# The far thigh: the navy under-suit below the tasset; it runs up under the tassets to the hip.
PIECES['I'] = dict(
    joint='hipF', angle=('hipF', 'kneeF'),
    own="""
65: 60-63
66: 54-63
67: 54-63
68: 54-61
69: 55-60
70: 54-59
71: 56-58
72: 57-58
""",
    extra="""
51: 54-61
52: 53-62
53: 53-62
54: 53-62
55: 53-63
56: 53-64
57: 53-64
58: 53-64
59: 53-64
60: 53-64
61: 53-64
62: 53-64
63: 53-64
64: 53-64
65: 53-59
68: 62
69: 61
70: 60
71: 59-60
72: 59-60
73: 58-60
""",
    fills=[dict(cells='all', donors='cls=n')],
)

# The far knee cop: steel rimmed in gold, in the shadow of the near leg.
PIECES['L'] = dict(
    joint='kneeF', angle=('hipF', 'kneeF', 'ankleF'),
    own="""
68: 62-65
69: 61-65
70: 60-66
71: 59-66
72: 59-66
73: 58-66
74: 60-66
75: 61-65
76: 63-65
""",
    extra="""
74: 59
75: 60
76: 61-62
""",
    fills=[dict(cells='all')],
)

# The far greave: the blade crosses its top; his lower rows carried up under it and the knee cop.
PIECES['R'] = dict(
    joint='kneeF', angle=('kneeF', 'ankleF'),
    own="""
78: 55-56
79: 55-56
80: 55-57
81: 55-58
82: 56-60
83: 56-61
84: 57-63
85: 57-63
86: 57-63
87: 56-61
""",
    extra="""
71: 59-63
72: 59-64
73: 58-64
74: 58-64
75: 57-63
76: 56-63
77: 55-63
78: 57-63
79: 57-63
80: 58-63
81: 59-63
82: 61-63
83: 62-63
""",
    fills=[dict(cells='all', dir=(0, 1), edge=False)],
)

ORDER = 'TWPAEFQBGHKSILR'
NAMES = {
    'T': ('PLATE_CHEST', 'The chest: gorget with its gold chain, breastplate (pivot: the base of the neck).'),
    'W': ('PLATE_WAIST', 'The waist: belt, faulds, hip tassets and the navy tasset in front (pivot: the pelvis).'),
    'P': ('PLATE_PAULDRON_N', 'The near pauldron (pivot: the near shoulder).'),
    'A': ('PLATE_UPPER_ARM_N', 'The near upper arm, its under-suit round the shoulder joint (pivot: the near shoulder).'),
    'E': ('PLATE_ELBOW_N', 'The near elbow cop (pivot: the near elbow, at the angle halfway between the arm and the forearm).'),
    'F': ('PLATE_VAMBRACE_N', 'The near vambrace (pivot: the near elbow).'),
    'Q': ('PLATE_PAULDRON_F', 'The far pauldron (pivot: the far shoulder).'),
    'B': ('PLATE_UPPER_ARM_F', 'The far upper arm (pivot: the far shoulder).'),
    'G': ('PLATE_VAMBRACE_F', 'The far vambrace (pivot: the far elbow).'),
    'H': ('PLATE_THIGH_N', 'The near thigh, in the navy under-suit (pivot: the near hip).'),
    'K': ('PLATE_KNEE_N', 'The near knee cop (pivot: the near knee, halfway between the thigh and the shin).'),
    'S': ('PLATE_GREAVE_N', 'The near greave (pivot: the near knee).'),
    'I': ('PLATE_THIGH_F', 'The far thigh, in the navy under-suit (pivot: the far hip).'),
    'L': ('PLATE_KNEE_F', 'The far knee cop (pivot: the far knee, halfway between the thigh and the shin).'),
    'R': ('PLATE_GREAVE_F', 'The far greave (pivot: the far knee).'),
}


def classes(a, bg):
    """One letter per cell: K his black line, n navy under-suit, d dark steel, s steel, S light
    steel, w brown leather, g gold, G light gold, R / m the cape's red and maroon, O the blade."""
    r, g, b = [a[..., i].astype(float) for i in range(3)]
    L = R.luma(a)
    c = np.full(a.shape[:2], '?', dtype='<U1')
    cool = b >= r - 8
    c[cool & (L >= 150)] = 'S'
    c[cool & (L >= 100) & (L < 150)] = 's'
    c[(b > r + 4) & (L >= 55) & (L < 100)] = 'd'
    c[(b > r + 6) & (L >= 28) & (L < 55)] = 'n'
    warm = r > b + 8
    c[warm & (r - g < 48) & (L < 100) & (L >= 28)] = 'w'
    gold = (r > b + 55) & (g > b + 22) & (r - g < 80) & (L > 70)
    c[gold & (L < 170)] = 'g'
    c[gold & (L >= 170)] = 'G'
    red = (r > g + 60) & ~gold
    c[red & (L < 105)] = 'R'
    c[(r > g + 18) & (r > b + 4) & (L < 55) & (L >= 18) & ~gold & (c != 'w')] = 'm'
    c[(r > 200) & (g < 200) & (r - g > 50) & ~gold] = 'O'
    c[L < 28] = 'K'
    c[bg] = '.'
    return c


def cond(expr, x, y, cls, piece):
    """A tiny filter: space-separated terms like x<=43, y>=36, cls=nd, piece=A, all."""
    for t in expr.split():
        if t == 'all':
            continue
        if t.startswith('cls='):
            if cls not in t[4:]:
                return False
            continue
        if t.startswith('piece='):
            if piece != t[6:]:
                return False
            continue
        for op in ('<=', '>='):
            if op in t:
                k, v = t.split(op)
                val = x if k == 'x' else y
                if (op == '<=' and not val <= int(v)) or (op == '>=' and not val >= int(v)):
                    return False
                break
    return True


def build(a):
    bg = R.background(a)
    cls = classes(a, bg)
    H, W, _ = a.shape
    out = {}
    visible = {}
    for p in ORDER:
        d = PIECES[p]
        own = spans(d['own'])
        full = own | spans(d['extra']) if d['extra'] else set(own)
        vis = {(x, y) for (x, y) in own if cls[y, x] not in '.RmO' and (x, y) not in SWORD}
        visible[p] = vis
        out[p] = dict(full=full, vis=vis)
    line = np.array([0x07, 0x06, 0x0b])
    for p in ORDER:
        d = PIECES[p]
        full, vis = out[p]['full'], out[p]['vis']
        col = {c: a[c[1], c[0]].copy() for c in vis}
        holes = sorted(full - vis, key=lambda c: (c[1], c[0]))
        # The piece's black line where it meets what is not the piece.
        edge = {c for c in holes if any((c[0] + dx, c[1] + dy) not in full for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}

        def edge_colour(c):
            # his own black where his line already runs there, else his line's colour
            return a[c[1], c[0]].copy() if cls[c[1], c[0]] == 'K' else line
        for f in d['fills']:
            mine = [c for c in holes if c not in col and cond(f['cells'], c[0], c[1], '', p)]
            # With `edge` (the default) the cells on the piece's edge take his line and only his
            # colours, not his black, are carried in; without it everything is carried as it is.
            lined = f.get('edge', True)
            if 'donors' in f:
                spec = f['donors']
                src = [c for q in ORDER for c in visible[q] if cond(spec, c[0], c[1], cls[c[1], c[0]], q) and ('piece=' in spec or q == p)]
            else:
                src = [c for c in vis if cls[c[1], c[0]] != 'K']
            for c in mine:
                if lined and c in edge:
                    col[c] = edge_colour(c)
                    continue
                got = None
                if 'dir' in f:
                    # the first of his pixels of the piece along `dir`
                    dx, dy = f['dir']
                    for k in range(1, 40):
                        q = (c[0] + dx * k, c[1] + dy * k)
                        if q in vis and not (lined and cls[q[1], q[0]] == 'K'):
                            got = q
                            break
                        if q not in full:
                            break
                if got is None:
                    # the nearest of the donors, his black aside (ties: the higher, then the further left)
                    got = min(src, key=lambda s: ((s[0] - c[0]) ** 2 + (s[1] - c[1]) ** 2, s[1], s[0]))
                col[c] = a[got[1], got[0]].copy()
        missing = [c for c in full if c not in col]
        if missing:
            raise SystemExit(f'{p}: {len(missing)} cells without a colour, e.g. {missing[:5]}')
        img = np.zeros((H, W, 3), np.int32)
        mask = np.zeros((H, W), bool)
        for (x, y), v in col.items():
            img[y, x] = v
            mask[y, x] = True
        out[p].update(img=img, mask=mask)
    return out, cls


# How the pieces stack in the game (src/sprite/ctx.ts DEPTHS, and the drawing order within a depth),
# and what of his covers a cell where no piece shows: the far hand (farArm.body) is under them all;
# the cape's mantle over the far shoulder (capeFront) is over the torso and the far arm, the one over
# the near shoulder (nearArm.over) over everything; the head over the torso; the sword
# (nearArm.held) over the torso and the legs; the near hand (nearArm.body) under the near arm only.
STACK = {'G': (1, 0), 'B': (1, 1), 'Q': (1, 2), 'I': (2, 0), 'R': (2, 1), 'L': (2, 2), 'H': (3, 0), 'S': (3, 1), 'K': (3, 2),
         'T': (4, 0), 'W': (4, 1), 'A': (9, 0), 'F': (9, 1), 'E': (9, 2), 'P': (9, 3)}
HAND_N = spans('''
55: 29-38
56: 29-38
57: 29-38
58: 29-38
59: 29-38
60: 29-38
61: 29-38
62: 29-38
''')
HAND_F = spans('''
54: 64-73
55: 64-73
56: 64-73
57: 64-73
58: 64-73
59: 64-73
60: 64-73
61: 64-73
62: 64-73
63: 64-73
''')


def cover(c, cls):
    """The depth rank of what of his is at a cell no piece shows (-1: nothing that covers)."""
    x, y = c
    k = cls[y, x]
    if c in HAND_F:
        return 0
    if c in SWORD or k == 'O':
        return 7
    if c in HAND_N:
        return 8
    if y <= 28 and 47 <= x <= 57:
        return 6
    if y <= 33 and k in 'RmK':
        return 10 if x <= 46 else 5
    return -1


def check(out, cls):
    """Every cell a piece fills must lie under something drawn over it in our idle pose, so his
    picture stays his: returns the cells where a fill would show."""
    bad = []
    for p in ORDER:
        for c in out[p]['full'] - out[p]['vis']:
            over = [q for q in ORDER if q != p and c in out[q]['vis'] and STACK[q] > STACK[p]]
            if over:
                continue
            if any(c in out[q]['vis'] for q in ORDER if q != p):
                bad.append((p, c, 'over ' + ''.join(q for q in ORDER if q != p and c in out[q]['vis'])))
                continue
            if cover(c, cls) <= STACK[p][0]:
                bad.append((p, c, 'shows (his %s)' % cls[c[1], c[0]]))
    return bad


def angle_of(names):
    def seg(a_, b_):
        return float(np.degrees(np.arctan2(J[b_][1] - J[a_][1], J[b_][0] - J[a_][0])))
    if len(names) == 2:
        return seg(*names)
    # halfway between the two segments (a cop over the joint)
    a1, a2 = seg(names[0], names[1]), seg(names[1], names[2])
    d = (a2 - a1 + 540) % 360 - 180
    return a1 + d / 2


# One character per colour of his: the chest alone has more colours than ASCII has characters, so
# Latin-1 letters follow the usual ones.
CHARS = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-/:;<=>?@[]^_{|}~' + ''.join(
    chr(c) for c in range(0xC0, 0x100) if c not in (0xD7, 0xF7))


def pack(p, out):
    return R.pack(out[p]['img'], out[p]['mask'], CHARS)


def write_ts(out, path):
    parts = [
        "// The owner's plate armour, his pixels (tools/refs/crimson-plate-from-ref.py from",
        '// docs/reference/aiden-owner-reference.jpg): one piece per segment of the rig, pivot on its',
        '// joint, angle the segment\'s in his picture. Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
    ]
    for p in ORDER:
        name, doc = NAMES[p]
        d = PIECES[p]
        rows, origin, pal = pack(p, out)
        parts.append(R.ts_piece(name, doc, rows, origin, pal, J[d['joint']], angle_of(d['angle'])))
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts))
    os.replace(tmp, path)


def main():
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)
    a = R.native()
    out, cls = build(a)
    H, W, _ = a.shape
    # Study: his pixels of the armour and the fills, each piece on its own, and the pieces stacked
    # in their drawing order (the fills hidden under what covers them).
    order = 'QBGILRHSKTWAFEP'
    stack = np.zeros((H, W, 4), np.uint8)
    for p in order:
        m = out[p]['mask']
        stack[m, :3] = out[p]['img'][m]
        stack[m, 3] = 255
    R.save(stack[20:96, 22:78], os.path.join(out_dir, 'plate@8.png'))
    R.save(np.where(R.background(a)[..., None], 255, a)[20:96, 22:78], os.path.join(out_dir, 'his@8.png'))
    sheet = np.full((H, 15 * 40, 4), 0, np.uint8)
    for i, p in enumerate(ORDER):
        yy, xx = np.nonzero(out[p]['mask'])
        x0, y0 = xx.min(), yy.min()
        tile = np.zeros((H, 40, 4), np.uint8)
        for y, x in zip(yy, xx):
            if y - y0 < H and x - x0 < 40:
                tile[y - y0, x - x0, :3] = out[p]['img'][y, x]
                tile[y - y0, x - x0, 3] = 255
        sheet[:, i * 40:(i + 1) * 40] = tile
    R.save(sheet[:70], os.path.join(out_dir, 'pieces@8.png'))
    bad = check(out, cls)
    for p, c, why in bad:
        print('fill shows at idle:', p, c, why)
    for p in ORDER:
        n = len(pack(p, out)[2])
        print(p, NAMES[p][0], 'cells', int(out[p]['mask'].sum()), 'his', len(out[p]['vis']), 'colours', n)
    if bad:
        raise SystemExit('fills would show over his picture')
    if len(sys.argv) > 2:
        write_ts(out, sys.argv[2])


if __name__ == '__main__':
    main()
