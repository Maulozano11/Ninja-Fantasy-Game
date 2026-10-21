# Kirin 44 head composer: writes khead.json ({x0, y0, rows}) for UI_KHEAD and prints the TS rows.
import json, sys
H = {}
def run(x, y, s):
    for i, c in enumerate(s):
        if c != '.': H[(x + i, y)] = c
def put(pts, c):
    for x, y in pts: H[(x, y)] = c
# --- horn: a curved hook two pixels wide rising from the snout top behind the nose, bowing back and
# turning up to its white tip, as his reads at this size; lit on its front edge
run(38, 8, 'bqsb')
run(37, 9, 'boqb')
run(36, 10, 'boqb')
run(36, 11, 'boqb')
run(37, 12, 'boqb')
run(37, 13, 'boqb')
run(38, 14, 'boqb')
# --- the back of the skull where his crest rises, the brow ridge, the snout top sloping to the nose
run(26, 13, 'cbbbbbb')
run(25, 14, 'c.oqqqqqbb')
run(24, 15, 'c.noqqqqqqqbbbboqb')
run(24, 16, 'c.mnooo' + 'q' * 10 + 'b')
# --- the dark brow, the eye a bright slit under it; the nose with its nostril
run(23, 17, 'c..kmnnnnncbbcooooqb')
run(22, 18, 'c..kmnnnnnnbrrbooobob')
run(22, 19, 'c.kmmmmmmmmmooonnnnnb')
run(24, 20, 'kkkkkkmmmmmmmmmmmmb')
# --- mouth: four fangs on the gum, the lower jaw (navy under it, a lit band) with three teeth on its
# inner edge; M is the open mouth, coloured below (his glow at the back, the dark wedge to the right)
run(23, 21, 'bbbbbkkkkkkkkkkkkkb')
run(21, 22, 'bbMMMMMbbbbbbbjjjjjjb')
run(21, 23, 'bkMMMMMcrrcrrcbbbbbb')
run(21, 24, 'bkmMMMMMsscsMcrrcrrc')
run(22, 25, 'bkmMMMMsMMMMMsscsM')
run(22, 26, 'bkmMMMMMMMMMMsMMM')
run(23, 27, 'bkmMMMMMMMMMMM')
run(23, 28, 'bkmnMMMMMMMMM')
run(24, 29, 'bkmnsMMMsM')
run(24, 30, 'bkmmnMsMnb')
run(25, 31, 'bkmmnnMmb')
run(26, 32, 'bkmmmmkb')
run(27, 33, 'bkkkkkb')
run(28, 34, 'bkkkb')
run(29, 35, 'bbb')
import math
G = (25.4, 24.4)
for (x, y), c in list(H.items()):
    if c != 'M': continue
    e = math.hypot(x - G[0], (y - G[1]) / 1.15)
    H[(x, y)] = 's' if e < 1.8 else 'r' if e < 2.8 else 'q' if e < 3.5 else 'd' if x < 33 else 'c'
# his brightest light along the brow ridge and the snout top, so the head is the brightest form
put([(29, 14), (30, 14), (31, 14), (35, 16), (36, 16), (37, 16)], 'r')
# the bolt leaving the mouth, thin
put([(29, 27), (30, 27), (31, 27), (32, 28), (33, 28)], 'q')
xs = [x for x, _ in H]; ys = [y for _, y in H]
X0, Y0, X1, Y1 = min(xs), min(ys), max(xs), max(ys)
rows = []
for y in range(Y0, Y1 + 1):
    rows.append(''.join(H.get((x, y), '.') for x in range(X0, X1 + 1)).rstrip('.'))
json.dump({'x0': X0, 'y0': Y0, 'rows': rows}, open(sys.argv[1], 'w'))
for y, r in zip(range(Y0, Y1 + 1), rows):
    print("    '%s', // %d" % (r, y))
print('x0', X0, 'y0', Y0)
