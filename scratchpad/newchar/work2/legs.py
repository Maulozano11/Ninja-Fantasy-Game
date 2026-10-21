"""Draft both legs (trousers with his pinstripes, boots with his strap, shine and sole) and print
rows: legN x 110..127, y 174..218; legF x 126..147, y 172..210."""
import numpy as np

NEAR = (110, 174, 18, 45)
FAR = (126, 172, 22, 39)


def grid(box):
    return [['_'] * box[2] for _ in range(box[3])]


def put(g, box, x, y, c):
    x0, y0, w, h = box
    if 0 <= x - x0 < w and 0 <= y - y0 < h:
        g[y - y0][x - x0] = c


def rows(g, box, at):
    x0, y0, w, h = box
    out = []
    for i, r in enumerate(g):
        out.append(''.join(r))
    return out


# --- near leg -------------------------------------------------------------------------------
gN = grid(NEAR)
# trousers: (left, right) per row; his pinstripes every other column, lit on the left
for y in range(174, 197):
    l = 118 if y < 186 else 117 if y < 193 else 116
    r = 127 if y < 186 else 126 if y < 190 else 124
    for x in range(l, r + 1):
        t = (x - l) / max(r - l, 1)
        lit, mid, shade = ('t', 'j'), ('n', 'f'), ('j', 'd')
        pair = lit if t < 0.35 else mid if t < 0.7 else shade
        c = pair[0] if x % 2 == 0 else pair[1]
        if x == r:
            c = 'a' if y < 186 else 'b'
        put(gN, NEAR, x, y, c)
# the knee's fold: a darker break across the shin above the boot
for x in range(116, 125):
    put(gN, NEAR, x, 193, 'f' if x % 2 else 'd')
# boot
boot = [
    (196, 116, 'aaaaaaaaa'),
    (197, 116, 'ajntnjfda'),
    (198, 116, 'aBHNHBtna'),
    (199, 116, 'afjnjfdda'),
    (200, 116, 'ajnBnfda'),
    (201, 116, 'afnHnfda'),
    (202, 116, 'afjBnfda'),
    (203, 116, 'afjHjfda'),
    (204, 116, 'adjBjfda'),
    (205, 116, 'adnBjdda'),
    (206, 116, 'afnHjdda'),
    (207, 114, 'adfjBtfda'),
    (208, 114, 'afjnHjfda'),
    (209, 114, 'afjBtjfda'),
    (210, 113, 'aajnHjffdda'),
    (211, 113, 'afnBtjfddda'),
    (212, 113, 'ajBHnjfddda'),
    (213, 112, 'afnHVnjffdda'),
    (214, 112, 'ajBVHtjffdda'),
    (215, 112, 'anHBtjffddda'),
    (216, 112, 'atBtjffddda'),
    (217, 112, 'ajtjffdddba'),
    (218, 113, 'aaaaaaaaaa'),
]
for y, x, s in boot:
    for i, c in enumerate(s):
        put(gN, NEAR, x + i, y, c)

# --- far leg --------------------------------------------------------------------------------
gF = grid(FAR)
for y in range(172, 190):
    l = 127 if y < 178 else 128 if y < 184 else 131
    r = 137 if y < 180 else 139 if y < 186 else 140
    for x in range(l, r + 1):
        t = (x - l) / max(r - l, 1)
        pair = ('n', 'f') if t < 0.4 else ('j', 'd') if t < 0.75 else ('f', 'b')
        c = pair[0] if x % 2 == 1 else pair[1]
        if x == l:
            c = 'a' if y >= 184 else c
        put(gF, FAR, x, y, c)
fboot = [
    (189, 132, 'aaaaaaaaa'),
    (190, 132, 'afjntnjfa'),
    (191, 132, 'atBHNHBta'),
    (192, 132, 'adfjnjfda'),
    (193, 133, 'afjBnfda'),
    (194, 133, 'afjHnfda'),
    (195, 133, 'adjBjfda'),
    (196, 133, 'adjHjfda'),
    (197, 133, 'adjBjfda'),
    (198, 133, 'adnHjfda'),
    (199, 133, 'adnBjfda'),
    (200, 133, 'adnHjfda'),
    (201, 133, 'adjBjfdda'),
    (202, 133, 'adjtBjfdda'),
    (203, 132, 'addjjtBjfdaa'),
    (204, 132, 'addjjntBHjfda'),
    (205, 132, 'addfjjntBHjfdda'),
    (206, 132, 'addfjjnntBVHjfda'),
    (207, 132, 'addffjjnntBVHjda'),
    (208, 132, 'abddffjjnntBHjda'),
    (209, 132, 'aabddffjjjnttjda'),
    (210, 136, 'aaaaaaaaaa'),
]
for y, x, s in fboot:
    for i, c in enumerate(s):
        put(gF, FAR, x + i, y, c)

print('NEAR')
for r in gN:
    print("        '" + ''.join(r) + "',")
print('FAR')
for r in gF:
    print("        '" + ''.join(r) + "',")
