"""Draft the hand-drawn hilt rows (x 96..121, y 170..190) and print them."""
W, X0, Y0, H = 26, 96, 170, 21
g = [['.'] * W for _ in range(H)]


def put(x, y, c):
    if 0 <= x - X0 < W and 0 <= y - Y0 < H:
        g[y - Y0][x - X0] = c


# pommel: steel cap, red gem with his pink glint, dark ring
for x, y, c in [(97, 171, 'a'), (98, 171, 'a'), (99, 171, 'a'),
                (96, 172, 'a'), (97, 172, 'H'), (98, 172, 'B'), (99, 172, 't'), (100, 172, 'a'),
                (96, 173, 'a'), (97, 173, 't'), (98, 173, '1'), (99, 173, 'K'), (100, 173, 'a'),
                (97, 174, 'a'), (98, 174, 'C'), (99, 174, 's'), (100, 174, 'r'), (101, 174, 'a'),
                (98, 175, 'a'), (99, 175, 'a'), (100, 175, 'i'), (101, 175, 'B'), (102, 175, 'a')]:
    put(x, y, c)
# grip, to the guard (under the fist): his dark steel with a lighter glint, his black line
core = [(102, 175, 'B'), (103, 176, 't'), (104, 176, 'B'), (105, 177, 't'), (106, 177, 'B'), (107, 178, 't'),
        (108, 179, 'B'), (109, 179, 't'), (110, 180, 'B')]
for x, y, c in core:
    put(x, y - 1, 'a')
    put(x, y + 1, 'a')
for x, y, c in core:
    put(x, y, c)
# cross-guard: light steel on its upper-left side, dark on the other, his black line round it; his
# red gem in its middle
put(118, 173, 'a')
put(119, 173, 'a')
light = 'RRNRNRN'
for i, y in enumerate(range(174, 189)):
    xl = 292 - y
    put(xl - 1, y, 'a')
    put(xl, y, 'NR'[i % 2])
    put(xl + 1, y, 'tB'[i % 2])
    put(xl + 2, y, 'a')
put(111, 181, 'K')
put(112, 181, 'C')
put(110, 182, 'N')
put(111, 182, 's')
put(104, 188, 'V')
for x in (103, 104, 105):
    put(x, 189, 'a')
for row in g:
    print("        '" + ''.join(row) + "',")
