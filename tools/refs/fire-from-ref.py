# Cuts the owner's reference art into game-scale sprite pieces for the fire set (vfx-a).
#
# The owner wants his reference images copied as exactly as possible, so key frames are built
# FROM his pixels: each piece is cropped from his image inside a hand-traced polygon, the panel
# background (and smoke, for pieces that should not carry it) is removed by colour, the rest is
# box-resampled to game scale, quantized to a palette sampled from his own pixels, cleaned of
# specks, and its silhouette edge set to a 1 px dark outline. The pieces are written as
# palette + RLE data into tools/world-sprites/vfx-a-fire-refdata.ts, which the generator
# animates (vfx-a-fire-s.ts, vfx-a-fire-v3.ts).
#
# Usage (from the repo root):
#
#   python3 -I tools/refs/fire-from-ref.py docs/reference/s-tier-jutsu-standard.jpg docs/reference/fire-set-owner-reference.jpg tools/world-sprites/vfx-a-fire-refdata.ts [preview.png]
#
# The first image is the S-rank Great Fire Annihilation (annihilation_enh), the second the fire
# set sheet (every other fire sprite but the phoenix). The output is deterministic.

import base64, json, math, os, sys
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
S_REF, SET_REF, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
PREVIEW = sys.argv[4] if len(sys.argv) > 4 else None

# --- the S-rank annihilation: his caster's feet (57, 922) go on our anchor's caster spot -----------
# Our annihilation_enh frame: the caster stands at x = 12 - 14 = -2 with feet on y = 780; his
# character is 88 px tall and ours 95, so 1.08 of his pixels per game pixel.
SK = 1.08
def s_map(x, y):
    return (-2 + (x - 57) * SK, 780 + (y - 922) * SK)

# --- the fire set panels (REF-fire-set-owner.jpg): his character is 237 px tall, ours 95 -------
FK = 0.40
def blast_map(x, y):
    # The blast frame (220 x 170) with its anchor, the ring's centre on the ground, at (110, 128).
    return (110 + (x - 1354) * FK, 128 + (y - 758) * FK)

def arc(cx, cy, rx, ry, a0, a1, n=24):
    return [(cx + rx * math.cos(a0 + (a1 - a0) * i / n), cy + ry * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]

# Ring of fire: centre (1354, 758), radii 196 x 37; the far half's flames stand 22 px above it.
RING_BACK = arc(1354, 758, 206, -59, math.pi, 0) + arc(1354, 758, 172, -23, 0, math.pi)
RING_FRONT = arc(1354, 758, 206, 45, math.pi, 0) + arc(1354, 758, 170, 8, 0, math.pi)
STEM_ROOT = [(1258, 726), (1452, 726), (1452, 770), (1258, 770)]

# Frames built around his panels: each maps his panel's box to our frame at scale k with `pad`
# px of room, and names the anchor (his point) for the sprite. FRAMES records each frame's size
# and anchor for the generator.
FRAMES = {}
def panel_frame(name, box, k, anchor, pad=6):
    x0, y0, x1, y1 = box
    W, H = round((x1 - x0) * k) + 2 * pad, round((y1 - y0) * k) + 2 * pad
    mp = lambda x, y: (pad + (x - x0) * k, pad + (y - y0) * k)
    ax, ay = mp(*anchor)
    FRAMES[name] = {'w': W, 'h': H, 'ax': round(ax), 'ay': round(ay)}
    return mp

# The aura: his character (238 px) engulfed; the fire in front of his body is the front layer.
AK = 0.40
aura_map = panel_frame('aura', (412, 1400, 660, 1760), AK, (530, 1728), 8)
AURA_BODY = [(500, 1480), (570, 1480), (578, 1540), (590, 1560), (594, 1615), (582, 1627), (575, 1650), (572, 1690), (498, 1690), (494, 1650), (468, 1626), (466, 1600), (480, 1560), (495, 1540)]
AURA_ALL = [(412, 1400), (660, 1400), (660, 1760), (412, 1760)]
AURA_LOW = [(412, 1690), (660, 1690), (660, 1760), (412, 1760)]
# The walls: his straight wall (character 245 px), his 3/4 wall and his end-on column (235 px).
wall_map = panel_frame('wall', (18, 916, 846, 1288), 0.39, (415, 1236), 8)
diag_map = panel_frame('wall_diag', (1084, 884, 1746, 1324), 0.40, (1425, 1140), 10)
depth_map = panel_frame('wall_depth', (12, 1390, 312, 1978), 0.40, (70, 1830), 10)
WALL_CHAR = [(850, 990), (1000, 990), (1000, 1250), (850, 1250)]
DIAG_CHAR = [(1576, 1000), (1640, 994), (1706, 1020), (1734, 1110), (1738, 1272), (1572, 1276), (1564, 1150)]
DEPTH_CHAR = [(160, 1668), (310, 1668), (310, 1936), (160, 1936)]

# Projectile panels: each panel's drawing mapped into our frame (k = our frame / his panel),
# anchored on his point (the ball's centre, the origin, ...).
def box(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
def fixed_map(hx, hy, ax, ay, k):
    return lambda x, y: (ax + (x - hx) * k, ay + (y - hy) * k)
PK = 0.28
bolt_map = panel_frame('bolt', (22, 104, 246, 322), PK, (186, 200), 6)
breath_map = panel_frame('breath', (1366, 104, 1676, 322), 0.29, (1540, 200), 6)
sphere_map = panel_frame('sphere', (1712, 104, 1936, 322), PK, (1823, 200), 6)
slash_map = panel_frame('slash', (22, 458, 246, 688), PK, (133, 571), 6)
multi_map = panel_frame('multi', (330, 458, 554, 688), PK, (441, 571), 6)
hit_map = panel_frame('hit', (700, 458, 1012, 708), 0.27, (845, 585), 6)
fb_map = panel_frame('fireball_fly', (748, 1394, 1256, 1766), 0.39, (1195, 1612), 6)
fbg_map = panel_frame('fireball_great_fly', (1324, 1394, 1976, 1976), 0.45, (1680, 1715), 6)
# The stream: a tile-and-a-bit of his jet (the generator wraps it into a seamless 64 px tile), and his head.
FRAMES['stream_seg'] = {'w': 80, 'h': 64, 'ax': 32, 'ay': 32}
stream_map = fixed_map(854, 200, 32, 32, PK)
FRAMES['stream_head'] = {'w': 74, 'h': 64, 'ax': 32, 'ay': 32}
head_map = fixed_map(1185, 200, 32, 32, PK)

PIECES = [
    # name, source, scale, mapper, mode, polygon (source px)
    ('s_tail', S_REF, SK, s_map, 'dragon', [(196, 518), (242, 522), (268, 560), (262, 600), (300, 604), (348, 610), (352, 642), (346, 664), (336, 692), (312, 722), (292, 760), (288, 800), (236, 800), (238, 758), (248, 720), (268, 690), (296, 660), (316, 642), (298, 632), (254, 636), (222, 626), (198, 600), (192, 560)]),
    ('s_hump', S_REF, SK, s_map, 'dragon', [(386, 704), (392, 650), (418, 612), (448, 592), (468, 566), (500, 560), (532, 566), (562, 580), (590, 596), (614, 612), (630, 650), (646, 700), (664, 760), (676, 800), (606, 800), (588, 752), (568, 712), (544, 684), (518, 668), (490, 664), (462, 672), (442, 692), (428, 722), (398, 744)]),
    ('s_head', S_REF, SK, s_map, 'dragon', [(686, 560), (698, 518), (738, 498), (768, 482), (820, 476), (862, 486), (902, 516), (932, 546), (968, 576), (972, 602), (962, 612), (946, 612), (944, 640), (936, 664), (926, 690), (900, 706), (862, 702), (842, 692), (834, 704), (842, 760), (846, 790), (712, 790), (696, 740), (690, 700), (682, 640)]),
    ('s_claw', S_REF, SK, s_map, 'keep', [(830, 814), (848, 816), (866, 824), (886, 816), (900, 810), (916, 816), (931, 825), (941, 838), (943, 863), (935, 876), (925, 873), (918, 869), (910, 877), (900, 881), (886, 877), (877, 872), (871, 860), (865, 848), (857, 841), (845, 839), (832, 833)]),
    # His whole fire wall, from the flame tips down to his glowing ground, as one opaque mass:
    # only the night sky (between the tips and above) is keyed out; his character is left out.
    ('s_wall', S_REF, SK, s_map, 'wallfire', [(96, 862), (100, 850), (160, 818), (220, 788), (280, 756), (340, 716), (400, 694), (460, 672), (520, 646), (580, 634), (640, 650), (690, 694), (700, 706), (812, 712), (826, 646), (880, 640), (905, 734), (944, 744), (936, 880), (904, 950), (884, 1012), (40, 1012), (40, 938), (96, 934)]),
    # His backdrop under the dragon: everything that is not night sky (dark smoke, shadows, fire,
    # dragon), drawn behind it all so no gap between his flames and his dragon is ever see-through.
    ('s_back', S_REF, SK, s_map, 'keep', [(150, 640), (230, 600), (330, 590), (420, 600), (470, 580), (530, 575), (600, 600), (650, 640), (700, 620), (760, 560), (840, 560), (900, 620), (944, 700), (944, 880), (884, 1012), (40, 1012), (40, 938), (96, 934), (100, 850)]),
    ('s_smoke', S_REF, SK, s_map, 'smoke', [(170, 810), (176, 700), (200, 620), (260, 520), (330, 480), (420, 440), (470, 380), (540, 320), (560, 262), (620, 222), (700, 212), (800, 212), (900, 212), (990, 214), (990, 340), (970, 396), (930, 420), (860, 450), (790, 470), (740, 500), (700, 560), (640, 600), (600, 640), (560, 700), (520, 760), (470, 790), (380, 790), (330, 800), (300, 810)]),
    ('s_breath', S_REF, SK, s_map, 'keep', [(946, 604), (980, 570), (1024, 560), (1024, 730), (960, 720), (930, 690), (942, 650)]),
    ('b_ground', SET_REF, FK, blast_map, 'ground', arc(1356, 756, 256, 68, 0, 2 * math.pi, 48)),
    ('b_ring_back', SET_REF, FK, blast_map, 'fire', RING_BACK, [STEM_ROOT]),
    ('b_stem', SET_REF, FK, blast_map, 'fire', [(1330, 612), (1400, 612), (1410, 660), (1415, 700), (1450, 732), (1452, 768), (1258, 768), (1262, 732), (1318, 700), (1322, 660)]),
    ('b_cap', SET_REF, FK, blast_map, 'fire', [(1176, 520), (1230, 486), (1300, 466), (1400, 464), (1474, 482), (1534, 518), (1540, 600), (1502, 642), (1420, 654), (1400, 640), (1340, 640), (1300, 654), (1208, 642), (1176, 600)]),
    ('b_ring_front', SET_REF, FK, blast_map, 'fire', RING_FRONT),
    ('a_back', SET_REF, AK, aura_map, 'fire', AURA_ALL, [], [AURA_BODY]),
    ('a_front', SET_REF, AK, aura_map, 'hotfire', AURA_BODY),
    ('a_low', SET_REF, AK, aura_map, 'fire', AURA_LOW),
    ('p_bolt', SET_REF, PK, bolt_map, 'keep', box(22, 104, 246, 322)),
    ('p_breath', SET_REF, 0.29, breath_map, 'keep', box(1366, 104, 1676, 322)),
    ('p_sphere', SET_REF, PK, sphere_map, 'keep', box(1712, 104, 1936, 322)),
    ('p_slash', SET_REF, PK, slash_map, 'keep', box(22, 458, 246, 688)),
    ('p_multi', SET_REF, PK, multi_map, 'keep', box(330, 458, 554, 688)),
    ('p_hit', SET_REF, 0.27, hit_map, 'keep', box(700, 458, 1012, 708)),
    ('p_fireball', SET_REF, 0.39, fb_map, 'keep', box(748, 1394, 1256, 1766)),
    ('p_fireball_great', SET_REF, 0.45, fbg_map, 'keep', box(1324, 1394, 1976, 1976)),
    ('p_stream', SET_REF, PK, stream_map, 'keep', box(740, 104, 740 + 80 / PK, 322)),
    ('p_stream_head', SET_REF, PK, head_map, 'keep', box(1185 - 32 / PK, 104, 1336, 322)),
    ('w_wall', SET_REF, 0.39, wall_map, 'keep', [(18, 916), (846, 916), (846, 1288), (18, 1288)]),
    # (his character stands on the glowing ground: the strip is cut off before him)
    ('w_diag', SET_REF, 0.40, diag_map, 'keep', [(1084, 884), (1746, 884), (1746, 1324), (1084, 1324)], [[(1556, 1082), (1746, 1004), (1746, 1324), (1540, 1324)]], [[(1572, 996), (1652, 990), (1660, 1080), (1572, 1086)]]),
    ('w_depth', SET_REF, 0.40, depth_map, 'keep', [(12, 1390), (312, 1390), (312, 1978), (12, 1978)], [[(150, 1640), (312, 1640), (312, 1978), (140, 1978)]]),
]

def lum(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]

def is_bg(c):
    # The night sky / panel background: dark and bluish.
    r, g, b = c
    return lum(c) < 75 and b >= r - 6

def is_panel_bg(c):
    # His fire sheet's panel background is a flat (32, 30, 42); his darkest smoke is redder.
    return (c[0] - 32) ** 2 + (c[1] - 30) ** 2 + (c[2] - 42) ** 2 < 13 ** 2

def is_dragon(c):
    # Saturated warm colours or bright highlights; smoke and sky are unsaturated.
    r, g, b = c
    mx, mn = max(c), min(c)
    s = (mx - mn) / mx if mx else 0
    return (s >= 0.55 and r > b + 20) or (lum(c) > 150 and r > b + 25) or lum(c) > 205

def is_fire(c):
    r, g, b = c
    return (r > 110 and r > b + 50) or lum(c) > 160

def is_hot(c):
    r, g, b = c
    return r > 180 and b < 100 and r > b + 100

def cut(name, src, k, mapper, mode, poly, excl=(), fills=()):
    im = Image.open(src).convert('RGB')
    xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
    x0, y0, x1, y1 = max(0, min(xs) - 2), max(0, min(ys) - 2), min(im.width, max(xs) + 3), min(im.height, max(ys) + 3)
    crop = im.crop((x0, y0, x1, y1))
    pm = Image.new('L', crop.size, 0)
    ImageDraw.Draw(pm).polygon([(x - x0, y - y0) for x, y in poly], fill=255)
    for e in excl:
        ImageDraw.Draw(pm).polygon([(x - x0, y - y0) for x, y in e], fill=0)
    fm = Image.new('L', crop.size, 0)
    for f in fills:
        ImageDraw.Draw(fm).polygon([(x - x0, y - y0) for x, y in f], fill=255)
    fmk = fm.load()
    px = crop.load(); pmk = pm.load()
    mask = Image.new('L', crop.size, 0); mk = mask.load()
    fill = []
    for y in range(crop.height):
        for x in range(crop.width):
            if not pmk[x, y]: continue
            c = px[x, y]
            if fmk[x, y]:
                # His character: replaced by what is around it (the glowing ground).
                fill.append((x, y)); continue
            if (is_panel_bg(c) if src == SET_REF else is_bg(c)): continue
            if mode == 'fire' and not is_fire(c): continue
            # His wall: fire and its dark-red shadows only (no smoke, which would sink with it).
            if mode == 'wallfire' and not (is_fire(c) or (c[0] > 2.0 * c[1] and c[0] > 2.0 * c[2] and c[0] > 40)): continue
            if mode == 'hotfire' and not is_hot(c): continue
            if mode == 'ground' and lum(c) > 105:
                # Fire standing on the ground: filled with the ground around it below.
                fill.append((x, y)); continue
            if mode == 'smoke' and (is_dragon(c) or lum(c) > 150):
                # Fire, dragon or kanji in front of the smoke: filled with the smoke around it below.
                fill.append((x, y)); continue
            if mode == 'dragon' and not is_dragon(c): continue
            # The claw: drop the bright yellow flame behind it (the talons are darker and redder).
            if mode == 'claw' and (not is_dragon(c) or (lum(c) > 175 and c[2] < 120 and c[1] > 150)): continue
            mk[x, y] = 255
    if fill:
        # Fill the holes left by what was in front of the smoke with the smoke around them,
        # smoothly (a normalized blur of the smoke's own colours).
        from PIL import ImageFilter, ImageChops
        sm = Image.new('RGB', crop.size, (0, 0, 0)); sm.paste(crop, (0, 0), mask)
        # Several blur radii, so big holes (his character) fill from far around them too.
        layers = []
        for rad in ((10, 40) if mode in ('smoke', 'ground') else (22, 60, 140)):
            num = sm.filter(ImageFilter.GaussianBlur(rad)); den = mask.filter(ImageFilter.GaussianBlur(rad))
            layers.append((num.load(), den.load()))
        for (x, y) in fill:
            for nb, db in layers:
                d = db[x, y]
                if d < (8 if mode in ('smoke', 'ground') else 40): continue
                r, g, b = nb[x, y]
                px[x, y] = (min(255, r * 255 // d), min(255, g * 255 // d), min(255, b * 255 // d)); mk[x, y] = 255
                break
    # To game scale: colour and coverage box-resampled, then a hard alpha at half coverage.
    ox, oy = mapper(x0, y0)
    W, H = max(1, round(crop.width * k)), max(1, round(crop.height * k))
    # Premultiply so the removed background does not bleed into the edge colours.
    rgba = crop.convert('RGBA'); rgba.putalpha(mask)
    pre = Image.new('RGBA', crop.size); pre.paste(rgba, (0, 0))
    small = pre.resize((W, H), Image.BOX)
    sp = small.load()
    cov = [[sp[x, y][3] for x in range(W)] for y in range(H)]
    # Inside the traced polygon (at game scale): edges against the polygon are cuts between
    # pieces and get no outline; edges against removed colour (sky, smoke) do.
    inpoly = pm.resize((W, H), Image.BOX).load()
    on = [[cov[y][x] >= 128 for x in range(W)] for y in range(H)]
    # Remove islands and fill pinholes of up to 3 px.
    def flood(grid, val):
        seen = [[False] * W for _ in range(H)]
        for y in range(H):
            for x in range(W):
                if seen[y][x] or grid[y][x] != val: continue
                stack, comp = [(x, y)], []
                seen[y][x] = True
                while stack:
                    a, b = stack.pop(); comp.append((a, b))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        u, v = a + dx, b + dy
                        if 0 <= u < W and 0 <= v < H and not seen[v][u] and grid[v][u] == val:
                            seen[v][u] = True; stack.append((u, v))
                if len(comp) <= 3:
                    for a, b in comp: grid[b][a] = not val
    flood(on, True); flood(on, False)
    # Colours: un-premultiply (PIL's box keeps straight alpha; fine), then a palette from his pixels.
    cols = []
    for y in range(H):
        for x in range(W):
            if on[y][x]:
                r, g, b, a = sp[x, y]
                cols.append((r, g, b) if a else (60, 13, 13))
    strip = Image.new('RGB', (len(cols), 1)); strip.putdata(cols)
    ncol = 12 if mode in ('dragon', 'smoke') else 14
    q = strip.quantize(colors=ncol, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()[:ncol * 3]
    pal = [tuple(pal[i:i + 3]) for i in range(0, len(pal), 3)]
    # Darkest palette entry is the outline; order the palette by luminance.
    pal.sort(key=lum)
    outline = ((36, 20, 26) if mode in ('smoke', 'ground') else (60, 13, 13)) if lum(pal[0]) > 40 else pal[0]
    pal = [outline] + [c for c in pal if c != outline]
    def nearest(c):
        return min(range(1, len(pal)), key=lambda i: (pal[i][0] - c[0]) ** 2 + (pal[i][1] - c[1]) ** 2 + (pal[i][2] - c[2]) ** 2)
    idx = [[0] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            if on[y][x]:
                r, g, b, a = sp[x, y]
                idx[y][x] = nearest((r, g, b)) + 1
    # Speck clean-up: a pixel unlike all 4 neighbours takes the most common neighbour value.
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            v = idx[y][x]
            if not v: continue
            nb = [idx[y][x + 1], idx[y][x - 1], idx[y + 1][x], idx[y - 1][x]]
            if v not in nb and all(nb):
                idx[y][x] = max(set(nb), key=nb.count)
    # The silhouette edge becomes a 1 px dark outline.
    for y in range(H):
        for x in range(W):
            if not idx[y][x]: continue
            edge = mode != 'hotfire' and any((0 <= x + dx < W and 0 <= y + dy < H) and not idx[y + dy][x + dx] and inpoly[x + dx, y + dy] >= 200 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge: idx[y][x] = 1
    # RLE: (run, value) byte pairs, runs up to 255.
    flat = [v for row in idx for v in row]
    out = bytearray()
    i = 0
    while i < len(flat):
        v = flat[i]; n = 1
        while i + n < len(flat) and flat[i + n] == v and n < 255: n += 1
        out += bytes((n, v)); i += n
    return {
        'w': W, 'h': H, 'x': round(ox), 'y': round(oy),
        'pal': ['#%02x%02x%02x' % c for c in pal],
        'rle': base64.b64encode(bytes(out)).decode('ascii'),
    }, idx, pal

data, previews = {}, []
for spec in PIECES:
    name, src, k, mapper, mode, poly = spec[:6]
    excl = spec[6] if len(spec) > 6 else []
    fills = spec[7] if len(spec) > 7 else []
    d, idx, pal = cut(name, src, k, mapper, mode, poly, excl, fills)
    data[name] = d
    previews.append((name, d, idx, pal))
    print(name, d['w'], 'x', d['h'], 'at', d['x'], d['y'], len(d['pal']), 'colours', len(d['rle']), 'b64 chars')

ts = ['// GENERATED by tools/refs/fire-from-ref.py from the owner\'s reference images: do not edit by hand.',
      '// Each piece: size, placement in its sprite\'s frame, palette (index 1 = outline; 0 = clear) and',
      '// base64 run-length data as (run, palette index + 1) byte pairs.', '',
      'export interface RefPiece { w: number; h: number; x: number; y: number; pal: string[]; rle: string }',
      'export const REF_PIECES: Record<string, RefPiece> = ' + json.dumps(data, indent=1) + ';', '',
      '/** Frames built around his panels: size and anchor. */',
      'export const REF_FRAMES: Record<string, { w: number; h: number; ax: number; ay: number }> = ' + json.dumps(FRAMES, indent=1) + ';', '']
tmp = OUT + '.part'
open(tmp, 'w').write('\n'.join(ts))
os.replace(tmp, OUT)

if PREVIEW:
    k = 2
    Wp = sum(d['w'] for _, d, _, _ in previews) * k + 20 * len(previews)
    Hp = max(d['h'] for _, d, _, _ in previews) * k
    img = Image.new('RGB', (Wp, Hp), (20, 22, 33)); X = 0
    for name, d, idx, pal in previews:
        for y in range(d['h']):
            for x in range(d['w']):
                v = idx[y][x]
                if v:
                    img.paste(pal[v - 1], (X + x * k, y * k, X + x * k + k, y * k + k))
        X += d['w'] * k + 20
    img.save(PREVIEW)
