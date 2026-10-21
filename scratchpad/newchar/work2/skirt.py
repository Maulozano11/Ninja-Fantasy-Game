"""Draft the coat's skirts below the belt (torso layer), x 104..147, y 176..205, and print rows.
'_' clears the auto pixel, '.' keeps it."""
X0, Y0, W, H = 104, 176, 44, 30
g = [['_'] * W for _ in range(H)]


def put(x, y, c):
    if 0 <= x - X0 < W and 0 <= y - Y0 < H:
        g[y - Y0][x - X0] = c


# near skirt: (outer edge x, front edge x) per row; the front edge his dark gold trim, the black
# shadow it throws on the trousers, the cloth lit toward the front, his dark gold trim on the outer edge
near = {}
for y in range(176, 198):
    front = 119 if y < 181 else 118 if y < 186 else 117 if y < 191 else 116
    outer = 111 if y < 186 else 110 if y < 190 else 109 if y < 194 else 108
    near[y] = (outer, front)
for y, (o, f) in near.items():
    for x in range(o, f + 1):
        k = x - o
        c = 'v' if k == 0 and y >= 186 else 'd' if k <= 1 else 'f' if k <= 3 else 'j'
        if x == f:
            c = 'y' if y % 3 else 'v'
        put(x, y, c)
    put(f + 1, y, 'a')
    # a fold down the panel
    if y >= 184:
        put(o + 4, y, 'f')
# the tattered hem: his points hang from it
for x, y, c in [(108, 198, 'v'), (109, 198, 'd'), (110, 198, 'f'), (113, 198, 'f'), (114, 198, 'j'), (115, 198, 'j'),
                (116, 198, 'y'), (108, 199, 'v'), (109, 199, 'd'), (114, 199, 'j'), (115, 199, 'y'), (108, 200, 'd'),
                (115, 200, 'v'), (111, 198, 'd')]:
    put(x, y, c)
# far skirt: the purple lining inside its front edge, his dark gold trim, the shaded cloth, the edge
for y in range(176, 200):
    f = 137 if y < 183 else 138 if y < 188 else 139 if y < 193 else 140
    o = 142 if y < 180 else 143 if y < 185 else 144 if y < 190 else 145 if y < 195 else 146
    if y >= 183:
        put(f - 2, y, 'e')
        put(f - 1, y, 'h')
    put(f, y, 'v' if y % 3 else 'y')
    for x in range(f + 1, o + 1):
        put(x, y, 'd' if x >= o - 1 else 'f')
for x, y, c in [(140, 200, 'v'), (141, 200, 'f'), (142, 200, 'f'), (144, 200, 'd'), (145, 200, 'd'), (146, 200, 'd'),
                (141, 201, 'f'), (142, 201, 'd'), (145, 201, 'd'), (141, 202, 'd'), (145, 202, 'd'), (139, 200, 'h')]:
    put(x, y, c)
# his belt's gold cross over the near thigh, the small gold piece beside it, his red tassel at the
# far hip
for x, y, c in [(126, 176, 'J'), (125, 177, 'J'), (126, 177, 'S'), (127, 177, 'J'), (124, 178, 'J'), (125, 178, 'O'),
                (126, 178, 'S'), (127, 178, 'O'), (128, 178, 'J'), (125, 179, 'a'), (126, 179, 'O'), (127, 179, 'a'),
                (126, 180, 'J'), (126, 181, 'O'), (126, 182, 'J'), (126, 183, 'F'),
                (122, 182, 'F'), (123, 182, 'J'), (122, 183, 'J'), (123, 183, 'O'),
                (134, 176, 'J'), (134, 177, 'k'), (134, 178, 's'), (134, 179, 'k'), (134, 180, 's'), (134, 181, 'k')]:
    put(x, y, c)
for r in g:
    print("        '" + ''.join(r) + "',")
