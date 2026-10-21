# Open grimoire template: gen.py out.png -> prints rows. Pages face the viewer, tipped back.
from PIL import Image
W = 26  # cols 0 and 25: cover overhang
top_l = [4, 3, 3, 2, 2, 1, 1, 1, 0, 0, 0, 1]      # page top row per column, left page (cols 1..12)
top = [None] + top_l + top_l[::-1] + [None]
PH = 8                                            # page height
H = max(t for t in top if t is not None) + PH + 3
g = [['.'] * W for _ in range(H)]
for x in range(1, W - 1):
    t = top[x]
    left = x <= 12
    gx = 12.5 - x if left else x - 12.5            # distance from the gutter
    for y in range(t, t + PH):
        r = y - t
        if gx < 1:
            ch = 'Q'
        elif gx < 2:
            ch = 'q'
        elif left:
            ch = 'P' if r < 5 and gx < 9 else 'p'
        else:
            ch = 'p' if gx < 9 else 'q'
        g[y][x] = ch
    # page-block edge (stacked pages) under the page faces, then the cover
    g[t + PH][x] = 'e'
    g[t + PH + 1][x] = 'c' if left else 'k'
# cover overhang at the outer edges, following the corners
for x, xx in ((0, 1), (W - 1, W - 2)):
    t = top[xx]
    for y in range(t + 2, t + PH + 2):
        g[y][x] = 'c' if x == 0 else 'k'
# spine dips one row at the gutter
for x in (12, 13):
    g[top[x] + PH + 2][x] = 'k'
# text lines on the left page, a glowing sigil on the right page
for x in range(3, 11):
    t = top[x]
    for k, y in enumerate((t + 2, t + 4, t + 6)):
        if (x + k * 3) % 6 != 0:
            g[y][x] = 'i'
cx, cy = 18.5, 4.5
for x in range(14, 24):
    for y in range(H):
        if g[y][x] in 'pqP':
            d = ((x - cx) ** 2 + ((y - cy) * 1.15) ** 2) ** 0.5
            if 2.3 < d < 3.4:
                g[y][x] = 'w'
            elif d < 1.1:
                g[y][x] = 'W'
# gold corners
for x, y in ((0, top[1] + PH + 1), (1, top[1] + PH + 1), (W - 1, top[W - 2] + PH + 1), (W - 2, top[W - 2] + PH + 1)):
    g[y][x] = 'g'
# ribbon bookmark from the gutter
for y, x in ((top[12] + PH + 1, 12), (top[12] + PH + 2, 11), (top[12] + PH + 3, 11), (top[12] + PH + 4, 10)):
    if y < H:
        g[y][x] = 'r'
    else:
        g.append(['.'] * W); g[y][x] = 'r'
rows = [''.join(r) for r in g]
for r in rows:
    print("    '%s'," % r)
pal = {'P': (250, 244, 222), 'p': (232, 222, 196), 'q': (200, 188, 160), 'Q': (150, 136, 112), 'e': (214, 200, 168),
       'c': (122, 62, 40), 'k': (92, 44, 30), 'i': (90, 74, 58), 'w': (120, 190, 255), 'W': (220, 240, 255),
       'g': (230, 190, 80), 'r': (200, 32, 44), '.': (40, 40, 52)}
k = 16
im = Image.new('RGB', (W * k, len(rows) * k))
for y, r in enumerate(rows):
    for x, ch in enumerate(r):
        for j in range(k):
            for q in range(k):
                im.putpixel((x * k + q, y * k + j), pal[ch])
im.save(__import__('sys').argv[1])
