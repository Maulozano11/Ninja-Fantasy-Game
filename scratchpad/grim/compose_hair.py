"""Builds the final template: converted top (h0.7.json) + hand-drawn side hair. compose_hair.py out.json"""
import json, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
base = json.load(open(os.path.join(HERE, 'h0.7.json')))
rows = [list(r) for r in base['f']]
fa = base['fa']
W = len(rows[0])
# room below for the nape
while len(rows) < 33:
    rows.append(['.'] * W)


def put(r, c, ch):
    if 0 <= r < len(rows) and 0 <= c < W:
        rows[r][c] = ch


# drop the converted strands below the ear (the collar in the example); redrawn below
for r in range(23, len(rows)):
    for c in range(0, 13):
        rows[r][c] = '.'
# Near side: hair hugging the back of the head down past the ear to the nape,
# in clumps ending in points; '.' leaves what is there.
NEAR = {
    19: '..01331333200',
    20: '.01331333310.',
    21: '0113313331...',
    22: '.001313331...',
    23: '..01313310...',
    24: '..013133100..',
    25: '.0131331310..',
    26: '.013133.310..',
    27: '..01310.0310.',
    28: '..0110..0130.',
    29: '...00....00..',
}
for r, s in NEAR.items():
    for c, ch in enumerate(s):
        if ch != '.':
            put(r, c, ch)
        elif r >= 21 and rows[r][c] in '0123':
            rows[r][c] = '.'
# Far side: a lock framing the far cheek down to the jaw.
FAR = {
    20: (23, '0330'),
    21: (24, '0330'),
    22: (24, '0310'),
    23: (24, '010'),
    24: (25, '00'),
}
for r, (c0, s) in FAR.items():
    for i, ch in enumerate(s):
        put(r, c0 + i, ch)
# trim empty rows
out = [''.join(r) for r in rows]
while out and set(out[-1]) == {'.'}:
    out.pop()
for i, r in enumerate(out):
    print('%2d %s%s' % (i, r, '  <- eye' if i == fa[1] else ''))
json.dump({'g07h': {'f': out, 'fa': fa, 'color': '#23232f'}}, open(sys.argv[1], 'w'))
