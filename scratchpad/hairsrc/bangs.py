import json
D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/hairsrc/'
t = json.load(open(D + 'tpl.json'))
W = 30
rows = [list(r.ljust(W, '.')) for r in t['rows']]
while len(rows) < 21: rows.append(['.'] * W)
# clear the old fringe/sideburn area below row 12
for y in range(13, 21):
    for x in range(W):
        rows[y][x] = '.'
def inside(poly, x, y):
    c = False
    for i in range(len(poly)):
        (x1, y1), (x2, y2) = poly[i], poly[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c
# clumps: polygons in template coords (x right, y down); root at row 12.5, tip at the bottom
clumps = [
    [(0.5, 12.5), (8.5, 12.5), (7.0, 16.0), (4.5, 19.5), (3.0, 16.5), (1.0, 15.5)],   # sideburn above the ear
    [(6.5, 12.5), (12.0, 12.5), (10.5, 15.0), (9.0, 17.6), (7.5, 15.0)],              # temple clump
    [(10.5, 12.5), (16.0, 12.5), (15.0, 14.5), (13.0, 17.6), (11.8, 14.8)],           # over the near brow
    [(15.5, 12.5), (18.5, 12.5), (18.0, 15.0), (17.0, 17.8), (16.2, 14.5)],           # thin strand between the eyes
    [(18.0, 12.5), (25.0, 12.5), (24.0, 14.5), (21.5, 16.6), (19.5, 14.0)],           # sweep over the far brow
    [(23.0, 12.0), (28.5, 12.0), (28.0, 15.5), (26.5, 19.5), (25.0, 16.0)],           # far side lock
]
for poly in clumps:
    xs = [p[0] for p in poly]; mn, mx = min(xs), max(xs)
    for y in range(12, 21):
        for x in range(W):
            if not inside(poly, x + 0.5, y + 0.5): continue
            u = (x + 0.5 - mn) / max(1, mx - mn)       # 0 left (lit) .. 1 right
            v = (y - 12) / 7.0
            s = 3 if u < 0.35 else 2 if u < 0.7 else 1
            if v > 0.55 and s > 1: s -= 1              # tips darker
            if y <= 13 and u < 0.5: s = 4 if s >= 3 else s
            rows[y][x] = str(s)
# outline: hair pixels at row >= 13 whose neighbor below/left/right is empty become 0 (tips and clump edges)
out = [r[:] for r in rows]
for y in range(13, 21):
    for x in range(W):
        if rows[y][x] in '12345':
            nb = [(x - 1, y), (x + 1, y), (x, y + 1)]
            if any(not (0 <= xx < W and 0 <= yy < len(rows)) or rows[yy][xx] == '.' for xx, yy in nb): out[y][x] = '0'
rows = [''.join(r).rstrip('.') for r in out]
while rows and not rows[-1]: rows.pop()
w = max(len(r) for r in rows); rows = [r.ljust(w, '.') for r in rows]
json.dump({'rows': rows, 'anchor': t['anchor']}, open(D + 'tpl2.json', 'w'))
print('\n'.join(rows))
