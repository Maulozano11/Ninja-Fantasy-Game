p = 'tools/refs/scarlet_ref.py'
s = open(p).read()
rep = [
    ("""    'legN': {'kind': 'column', 'knots': [(104.0, 175.5, 72.0, 122.0, 0.6), (150.0, 198.5, 64.0, 120.0, 0.68),
                                         (191.0, 218.6, 62.5, 118.0, 0.74)]},
    'legF': {'kind': 'column', 'knots': [(104.0, 174.0, 89.0, 132.0, 0.6), (147.0, 192.0, 91.0, 137.0, 0.66),
                                         (186.0, 210.6, 92.5, 139.0, 0.72)]},""",
     """    'legN': {'kind': 'column', 'knots': [(104.0, 175.5, 72.0, 122.0, 0.6), (150.0, 198.5, 64.0, 120.0, 0.7),
                                         (191.0, 219.1, 62.5, 118.0, 0.8)]},
    'legF': {'kind': 'column', 'knots': [(104.0, 174.0, 89.0, 132.0, 0.6), (147.0, 192.0, 91.0, 137.0, 0.68),
                                         (186.0, 211.1, 92.5, 139.0, 0.76)]},"""),
    ("""    # each leg (his trousers in the coat's opening, his boot) on ours: 0.5 down from his belt to his
    # sole (his near sole on our near sole, 218.6; his far one on our far one, 210.6); across 0.6 at the
    # trousers widening to 0.74 at the boot's foot, so his boots cover our bigger feet; the middle line
    # follows our leg""",
     """    # each leg (his trousers in the coat's opening, his boot) on ours: 0.5 down from his belt to his
    # sole (his near sole on our near sole's bottom row, 218; his far one on our far one's, 210); across
    # 0.6 at the trousers widening to 0.8 at the boot's foot, so his boots cover our bigger feet; the
    # middle line follows our leg"""),
    ("""    # the coat's near shoulder, the sleeve and its cuff along our arm (0.61 along the upper arm, 0.52 the
    # forearm, 0.66 across so it covers our arm); his fingerless glove about the wrist at 0.6
    'armN': {'kind': 'chain', 'his': [JOINTS[j] for j in ('shoulderN', 'elbowN', 'wristN')],
             'our': [OUR_JOINTS[j] for j in ('shoulderN', 'elbowN', 'wristN')], 'width': 0.66,""",
     """    # the coat's near shoulder, the sleeve and its cuff along our arm (0.61 along the upper arm, 0.52 the
    # forearm, 0.7 across so it covers our arm and its broad shoulder); his fingerless glove about the
    # wrist at 0.6
    'armN': {'kind': 'chain', 'his': [JOINTS[j] for j in ('shoulderN', 'elbowN', 'wristN')],
             'our': [OUR_JOINTS[j] for j in ('shoulderN', 'elbowN', 'wristN')], 'width': 0.7,"""),
    ("""             'our': [OUR_JOINTS[j] for j in ('shoulderF', 'elbowF', 'wristF')], 'width': 0.66},""",
     """             'our': [OUR_JOINTS[j] for j in ('shoulderF', 'elbowF', 'wristF')], 'width': 0.7},"""),
]
for a, b in rep:
    assert a in s, a
    s = s.replace(a, b)
open(p, 'w').write(s)

p = 'tools/refs/scarlet-study.py'
s = open(p).read()
a = """# Mends by hand, in our frame:"""
b = """# Where his coat is hidden in his picture and ours shows (our arms hang clear of the body, our far
# hand further out): the coat's layer carried on outward under them, row by row, in its own cloth
# (the colour two pixels in from its edge): (side, first row, last row + 1, pixels).
UNDER = {'torso': [('L', 148, 177, 4), ('R', 150, 194, 4)]}

# Mends by hand, in our frame:"""
assert a in s
s = s.replace(a, b, 1)
a = """        out[name] = patch(r, box, LAYER_PATCHES.get(name, []))
    return out"""
b = """        for side, ya, yb, n in UNDER.get(name, []):
            r = extend(r, box, side, ya, yb, n)
        out[name] = patch(r, box, LAYER_PATCHES.get(name, []))
    return out


def extend(r, box, side, ya, yb, n):
    \"\"\"A layer carried on outward (side 'L' or 'R') by n pixels on rows ya..yb-1, in the colour two
    pixels in from its edge.\"\"\"
    r = r.copy()
    y0 = box[1]
    for y in range(ya, yb):
        row = r[y - y0]
        xs = np.nonzero(row >= 0)[0]
        if not len(xs):
            continue
        e, d = (xs[0], -1) if side == 'L' else (xs[-1], 1)
        inner = e - 2 * d
        c = row[inner] if 0 <= inner < len(row) and row[inner] >= 0 else row[e]
        for k in range(1, n + 1):
            if 0 <= e + d * k < len(row) and row[e + d * k] < 0:
                row[e + d * k] = c
    return r"""
assert a in s
s = s.replace(a, b)
open(p, 'w').write(s)
