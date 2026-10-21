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
#   python3 -I <art2>/vfx-a-extract.py <art2> <repo>/tools/world-sprites/vfx-a-fire-refdata.ts [preview.png]

import base64, json, math, os, sys
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
ART2, OUT = sys.argv[1], sys.argv[2]
PREVIEW = sys.argv[3] if len(sys.argv) > 3 else None

S_REF = os.path.join(ART2, 'REF-s-tier-fire-annihilation.jpg')
SET_REF = os.path.join(ART2, 'REF-fire-set-owner.jpg')

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

PIECES = [
    # name, source, scale, mapper, mode, polygon (source px)
    ('s_tail', S_REF, SK, s_map, 'dragon', [(196, 518), (242, 522), (268, 560), (262, 600), (300, 604), (348, 610), (352, 642), (346, 664), (336, 692), (312, 722), (292, 760), (288, 800), (236, 800), (238, 758), (248, 720), (268, 690), (296, 660), (316, 642), (298, 632), (254, 636), (222, 626), (198, 600), (192, 560)]),
    ('s_hump', S_REF, SK, s_map, 'dragon', [(386, 704), (392, 650), (418, 612), (448, 592), (468, 566), (500, 560), (532, 566), (562, 580), (590, 596), (614, 612), (630, 650), (646, 700), (664, 760), (676, 800), (606, 800), (588, 752), (568, 712), (544, 684), (518, 668), (490, 664), (462, 672), (442, 692), (428, 722), (398, 744)]),
    ('s_head', S_REF, SK, s_map, 'dragon', [(686, 560), (698, 518), (738, 498), (768, 482), (820, 476), (862, 486), (902, 516), (932, 546), (968, 576), (972, 602), (962, 612), (946, 612), (944, 640), (936, 664), (926, 690), (900, 706), (862, 702), (842, 692), (834, 704), (842, 760), (846, 790), (712, 790), (696, 740), (690, 700), (682, 640)]),
    ('s_claw', S_REF, SK, s_map, 'keep', [(830, 814), (848, 816), (866, 824), (886, 816), (900, 810), (916, 816), (931, 825), (941, 838), (943, 863), (935, 876), (925, 873), (918, 869), (910, 877), (900, 881), (886, 877), (877, 872), (871, 860), (865, 848), (857, 841), (845, 839), (832, 833)]),
    ('s_smoke', S_REF, SK, s_map, 'smoke', [(170, 810), (176, 700), (200, 620), (260, 520), (330, 480), (420, 440), (470, 380), (540, 320), (560, 262), (620, 222), (700, 212), (800, 212), (900, 212), (990, 214), (990, 340), (970, 396), (930, 420), (860, 450), (790, 470), (740, 500), (700, 560), (640, 600), (600, 640), (560, 700), (520, 760), (470, 790), (380, 790), (330, 800), (300, 810)]),
    ('s_breath', S_REF, SK, s_map, 'keep', [(946, 604), (980, 570), (1024, 560), (1024, 730), (960, 720), (930, 690), (942, 650)]),
    ('b_ground', SET_REF, FK, blast_map, 'ground', arc(1356, 756, 256, 68, 0, 2 * math.pi, 48)),
    ('b_ring_back', SET_REF, FK, blast_map, 'fire', RING_BACK, [STEM_ROOT]),
    ('b_stem', SET_REF, FK, blast_map, 'fire', [(1330, 612), (1400, 612), (1410, 660), (1415, 700), (1450, 732), (1452, 768), (1258, 768), (1262, 732), (1318, 700), (1322, 660)]),
    ('b_cap', SET_REF, FK, blast_map, 'fire', [(1176, 520), (1230, 486), (1300, 466), (1400, 464), (1474, 482), (1534, 518), (1540, 600), (1502, 642), (1420, 654), (1400, 640), (1340, 640), (1300, 654), (1208, 642), (1176, 600)]),
    ('b_ring_front', SET_REF, FK, blast_map, 'fire', RING_FRONT),
]

def lum(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]

def is_bg(c):
    # The night sky / panel background: dark and bluish.
    r, g, b = c
    return lum(c) < 75 and b >= r - 6

def is_dragon(c):
    # Saturated warm colours or bright highlights; smoke and sky are unsaturated.
    r, g, b = c
    mx, mn = max(c), min(c)
    s = (mx - mn) / mx if mx else 0
    return (s >= 0.55 and r > b + 20) or (lum(c) > 150 and r > b + 25) or lum(c) > 205

def is_fire(c):
    r, g, b = c
    return (r > 110 and r > b + 50) or lum(c) > 160

def cut(name, src, k, mapper, mode, poly, excl=()):
    im = Image.open(src).convert('RGB')
    xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
    x0, y0, x1, y1 = max(0, min(xs) - 2), max(0, min(ys) - 2), min(im.width, max(xs) + 3), min(im.height, max(ys) + 3)
    crop = im.crop((x0, y0, x1, y1))
    pm = Image.new('L', crop.size, 0)
    ImageDraw.Draw(pm).polygon([(x - x0, y - y0) for x, y in poly], fill=255)
    for e in excl:
        ImageDraw.Draw(pm).polygon([(x - x0, y - y0) for x, y in e], fill=0)
    px = crop.load(); pmk = pm.load()
    mask = Image.new('L', crop.size, 0); mk = mask.load()
    fill = []
    for y in range(crop.height):
        for x in range(crop.width):
            if not pmk[x, y]: continue
            c = px[x, y]
            if is_bg(c): continue
            if mode == 'fire' and not is_fire(c): continue
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
    if mode in ('smoke', 'ground') and fill:
        # Fill the holes left by what was in front of the smoke with the smoke around them,
        # smoothly (a normalized blur of the smoke's own colours).
        from PIL import ImageFilter, ImageChops
        sm = Image.new('RGB', crop.size, (0, 0, 0)); sm.paste(crop, (0, 0), mask)
        num = sm.filter(ImageFilter.GaussianBlur(10)); den = mask.filter(ImageFilter.GaussianBlur(10))
        nb, db = num.load(), den.load()
        for (x, y) in fill:
            d = db[x, y]
            if d < 8: continue
            r, g, b = nb[x, y]
            px[x, y] = (min(255, r * 255 // d), min(255, g * 255 // d), min(255, b * 255 // d)); mk[x, y] = 255
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
            edge = any((0 <= x + dx < W and 0 <= y + dy < H) and not idx[y + dy][x + dx] and inpoly[x + dx, y + dy] >= 200 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
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
    d, idx, pal = cut(name, src, k, mapper, mode, poly, excl)
    data[name] = d
    previews.append((name, d, idx, pal))
    print(name, d['w'], 'x', d['h'], 'at', d['x'], d['y'], len(d['pal']), 'colours', len(d['rle']), 'b64 chars')

ts = ['// GENERATED by art2/vfx-a-extract.py from the owner\'s reference images: do not edit by hand.',
      '// Each piece: size, placement in its sprite\'s frame, palette (index 1 = outline; 0 = clear) and',
      '// base64 run-length data as (run, palette index + 1) byte pairs.', '',
      'export interface RefPiece { w: number; h: number; x: number; y: number; pal: string[]; rle: string }',
      'export const REF_PIECES: Record<string, RefPiece> = ' + json.dumps(data, indent=1) + ';', '']
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
