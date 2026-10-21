# Builds a 48x22 skeleton map from segment specs and prints it, to paste into the TS source.
W, H = 48, 22
g = [['.'] * W for _ in range(H)]
def put(x, y, c='#'):
    if 0 <= x < W and 0 <= y < H: g[y][x] = c
def run(y, x0, x1, c='#'):
    for x in range(x0, x1 + 1): put(x, y, c)
# mound outer C
run(0, 34, 41); run(1, 32, 43)
run(2, 31, 32); run(2, 43, 44)
run(3, 30, 31); run(3, 44, 45)
run(4, 29, 30); run(4, 45, 46)
run(5, 29, 30); run(5, 46, 47)
for y in range(6, 9): run(y, 29, 30)
# inner curl 1 (x 33..37, y 2..6)
for dy, row in enumerate(['.###.', '#...#', '#.#.#', '#..#.', '.##..']):
    for dx, ch in enumerate(row):
        if ch == '#': put(33 + dx, 2 + dy)
# inner curl 2 (x 39..42, y 2..5), mirrored
for dy, row in enumerate(['.##.', '#..#', '#.#.', '.#..']):
    for dx, ch in enumerate(row):
        if ch == '#': put(39 + dx, 2 + dy)
# leaf off the mound top-left
run(2, 27, 29); run(3, 25, 26); run(4, 24, 25); put(24, 5)
# arm, 2 px thick, from the C's back down to the tip
for (x0, x1, y) in [(26, 28, 8), (22, 25, 9), (18, 21, 10), (15, 17, 11), (12, 14, 12), (9, 11, 13), (6, 8, 14), (4, 5, 15)]:
    run(y, x0, x1); run(y + 1, x0, x1)
# knob A at the tip
put(2, 16); run(17, 1, 3); run(18, 1, 3); put(2, 19)
# big curl (ring about (27, 15)), open at the lower left into the lower arm
run(11, 26, 28); run(12, 24, 25); run(12, 29, 30)
for y in (13, 14, 15, 16): put(23, y); put(31, y)
run(17, 29, 30); run(18, 26, 28); put(25, 17)
# lower arm to knob B
run(17, 20, 23); run(18, 16, 20); run(19, 13, 16)
# knob B curl
run(16, 10, 11); put(9, 17); put(12, 17); put(9, 18); put(11, 18); put(10, 19); put(12, 19)
# small curls near the trough
run(10, 33, 34); put(32, 11); put(35, 11); put(33, 12); put(35, 12); put(34, 13)
run(14, 33, 35); put(32, 15); put(36, 15); put(32, 16); put(34, 16); put(36, 16); put(33, 17); put(36, 17); run(18, 34, 35)
# base on the rail
run(20, 1, 39)
# bead
for (x, y) in [(26, 14), (27, 14), (26, 15), (27, 15), (28, 15), (27, 16), (26, 16), (28, 14), (28, 16), (27, 13)]:
    put(x, y, 'b')
for r in g: print("    '" + ''.join(r) + "',")
