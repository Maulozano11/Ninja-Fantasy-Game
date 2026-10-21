p = 'tools/refs/scarlet_ref.py'
s = open(p).read()
rep = [
    ("""    'legN': {'kind': 'column', 'knots': [(104.0, 175.5, 72.0, 122.0, 0.6), (150.0, 198.5, 64.0, 120.0, 0.7),
                                         (191.0, 219.1, 62.5, 118.0, 0.8)]},
    'legF': {'kind': 'column', 'knots': [(104.0, 174.0, 89.0, 132.0, 0.6), (147.0, 192.0, 91.0, 137.0, 0.68),
                                         (186.0, 211.1, 92.5, 139.0, 0.76)]},""",
     """    'legN': {'kind': 'column', 'knots': [(104.0, 175.5, 73.5, 122.0, 0.6), (150.0, 198.5, 67.5, 120.0, 0.72),
                                         (191.0, 219.1, 62.0, 118.0, 0.8)]},
    'legF': {'kind': 'column', 'knots': [(104.0, 174.0, 89.0, 132.0, 0.6), (147.0, 192.0, 89.5, 136.5, 0.7),
                                         (186.0, 211.1, 94.0, 139.5, 0.76)]},"""),
]
for a, b in rep:
    assert a in s, a
    s = s.replace(a, b)
open(p, 'w').write(s)

p = 'tools/refs/scarlet-study.py'
s = open(p).read()
rep = [
    ("""# Where his coat is hidden in his picture and ours shows (our arms hang clear of the body, our far
# hand further out): the coat's layer carried on outward under them, row by row, in its own cloth
# (the colour two pixels in from its edge): (side, first row, last row + 1, pixels).
UNDER = {'torso': [('L', 148, 177, 4), ('R', 150, 194, 4)]}""",
     """# Where his coat is hidden in his picture and ours shows (our arms hang clear of the body, our far
# hand further out): the coat's layer carried on outward under them, row by row, in his coat's
# cloth (side, first row, last row + 1, pixels, colour).
UNDER = {'torso': [('L', 148, 177, 4, '#252328'), ('R', 172, 194, 4, '#1a191e')]}"""),
    ("""        for side, ya, yb, n in UNDER.get(name, []):
            r = extend(r, box, side, ya, yb, n)""",
     """        for side, ya, yb, n, c in UNDER.get(name, []):
            r = extend(r, box, side, ya, yb, n, ci(c))"""),
    ("""def extend(r, box, side, ya, yb, n):
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
        for k in range(1, n + 1):""",
     """def extend(r, box, side, ya, yb, n, c):
    \"\"\"A layer carried on outward (side 'L' or 'R') by n pixels of colour c on rows ya..yb-1.\"\"\"
    r = r.copy()
    y0 = box[1]
    for y in range(ya, yb):
        row = r[y - y0]
        xs = np.nonzero(row >= 0)[0]
        if not len(xs):
            continue
        e, d = (xs[0], -1) if side == 'L' else (xs[-1], 1)
        for k in range(1, n + 1):"""),
]
for a, b in rep:
    assert a in s, a
    s = s.replace(a, b)
open(p, 'w').write(s)
