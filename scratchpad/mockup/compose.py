"""Battle mockups: stealth phase and a combat turn. python3 compose.py -> mock_stealth.png, mock_combat.png (1920x1080)."""
import heapq
import json
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import scene
import props16

D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/mockup/'
SPR = D + 'sprites/'
S = 2                       # output scale
W, H = scene.W, scene.H
PX_M, PZ_M = 22.0, 11.0     # px per meter across / in depth (native)
META = json.load(open(SPR + 'sprites.json'))
F = '/usr/share/fonts/opentype/inter/Inter-'


def font(weight, size):
    return ImageFont.truetype(F + weight + '.otf', size)


# ---------------------------------------------------------------- scene with props
def build_scene():
    img, _, info = scene.paint()
    props = []

    def prop(kind, *args):
        im, (ox, oy) = getattr(scene, kind)(*args)
        props.append({'img': Image.fromarray(im), 'x': ox, 'y': oy, 'base': args[1], 'kind': kind})

    prop('tree', 150, 300, 1.0, 1)
    prop('tree', 36, 252, 0.85, 2, True)
    prop('tree', 846, 262, 0.92, 3)
    prop('bush', 116, 404, 92, 38, 4)
    prop('bush', 228, 424, 74, 32, 5)
    prop('bush', 58, 360, 82, 34, 11)
    prop('bush', 668, 522, 70, 30, 12)
    prop('bush', 70, 528, 110, 40, 14)
    prop('bush', 300, 534, 90, 36, 15)
    prop('bush', 300, 268, 60, 26, 13)
    prop('rock', 554, 460, 46, 28, 6)
    prop('rock', 702, 300, 40, 24, 7)
    prop('tall_grass', 330, 508, 60, 8)
    prop('tall_grass', 780, 528, 56, 14)
    prop('tall_grass', 470, 286, 40, 16)
    prop('reeds', 398, 474, 6, 9)
    prop('reeds', 548, 302, 5, 10)
    prop('reeds', 470, 532, 7, 15)

    def p16(kind, *args, glow=None):
        im, (ox, oy) = getattr(props16, kind)(*args)
        props.append({'img': Image.fromarray(im), 'x': ox, 'y': oy, 'base': args[1], 'kind': kind, 'glow': glow})

    # enemy camp on the hill
    p16('tent', 915, 268)
    p16('campfire', 812, 302, glow=(255, 150, 60))
    p16('crate', 956, 300)
    p16('crate', 948, 286)
    p16('barrel', 776, 280, False)
    # explosive barrels by the brute's rock (fire jutsu bait)
    p16('barrel', 654, 438, True)
    p16('barrel', 668, 450, True, 2)
    # bridge lanterns, the signpost, a fence, a mossy log
    p16('stone_lantern', 402, 346, glow=(255, 190, 90))
    p16('stone_lantern', 622, 346, glow=(255, 190, 90))
    p16('signpost', 342, 374)
    p16('fence', 262, 338, 3)
    p16('log', 236, 316)
    # river life
    p16('lily', 452, 500, True)
    p16('lily', 474, 520)
    p16('lily', 440, 470)
    p16('lily', 506, 486)
    p16('river_rock', 498, 438, 16, 8)
    p16('river_rock', 524, 300, 12, 6, 9)
    # meadow life
    for (fx, fy, s) in [(330, 300, 21), (60, 300, 22), (200, 470, 23), (380, 460, 24), (720, 368, 25), (900, 380, 26), (560, 520, 27), (120, 250, 28)]:
        p16('flowers', fx, fy, 30, s)
    for (fx, fy, s) in [(276, 456, 31), (686, 404, 32), (840, 470, 33), (420, 300, 34)]:
        p16('pebbles', fx, fy, 5, s)
    p16('mushrooms', 176, 304)
    p16('mushrooms', 40, 262, 14)
    # butterflies
    p16('butterfly', 300, 336)
    p16('butterfly', 186, 404, '#a8d8f8')
    p16('butterfly', 720, 430, '#f7f2e8')
    # ground shadows of the trees
    for (cx, cy, rx, ry) in [(160, 300, 54, 12), (44, 252, 44, 10), (852, 262, 50, 11)]:
        scene.shadow(img, cx, cy, rx, ry)
    return img, props, info


BACKDROP = '/home/user/Ninja-Fantasy-Game/src/assets/images/shinobi_campaign_forest_backdrop_1791702689788.jpg'


def grade(rgb):
    """misty forest mood: a little darker, greener-teal, so the pixel world sits in the painted backdrop."""
    out = rgb * np.array([0.80, 0.90, 0.88]) + np.array([6, 14, 16])
    return out


def backdrop(base):
    bd = Image.open(BACKDROP).convert('RGB').crop((0, 0, 1376, 300)).resize((1920, 419), Image.LANCZOS)
    bd = bd.filter(ImageFilter.GaussianBlur(1.1)).convert('RGBA')
    a = np.ones((419, 1920), float)
    ys = np.arange(419)[:, None]
    a *= np.clip((419 - ys) / 60.0, 0, 1)
    bd.putalpha(Image.fromarray((a * 255).astype(np.uint8)))
    base.alpha_composite(bd, (0, 0))
    # mist where the forest meets the field
    fog = np.zeros((1080, 1920, 4), np.uint8)
    ys = np.arange(1080)[:, None]
    fa = np.exp(-((ys - 400) / 70.0) ** 2) * 150
    fog[..., 0], fog[..., 1], fog[..., 2] = 160, 205, 190
    fog[..., 3] = np.broadcast_to(fa, (1080, 1920)).astype(np.uint8)
    base.alpha_composite(Image.fromarray(fog))


def glow(base, cx, cy, r, col):
    size = int(r * 2)
    yy, xx = np.mgrid[0:size, 0:size]
    d = np.hypot(xx - r, (yy - r) * 1.3) / r
    a = np.clip(1 - d, 0, 1) ** 2 * 120
    g = np.zeros((size, size, 4), np.uint8)
    g[..., 0], g[..., 1], g[..., 2] = col
    g[..., 3] = a.astype(np.uint8)
    base.alpha_composite(Image.fromarray(g), (int(cx - r), int(cy - r)))


def atmosphere(base):
    d = ImageDraw.Draw(base)
    # smoke from the camp fire
    rng = np.random.default_rng(3)
    for k in range(9):
        t = k / 8
        x = (812 + 6 * math.sin(t * 5) + t * 14) * S
        y = (282 - t * 70) * S
        r = (5 + t * 9) * S
        over = Image.new('RGBA', base.size, (0, 0, 0, 0))
        ImageDraw.Draw(over).ellipse((x - r, y - r, x + r, y + r), fill=(190, 196, 200, int(110 * (1 - t))))
        base.alpha_composite(over)
    # light rays from the upper left
    rays = Image.new('RGBA', base.size, (0, 0, 0, 0))
    rd = ImageDraw.Draw(rays)
    for (x0, w0) in [(260, 70), (520, 46), (760, 90)]:
        rd.polygon([(x0, 0), (x0 + w0, 0), (x0 + w0 + 520, 1080), (x0 + 380, 1080)], fill=(255, 245, 200, 18))
    base.alpha_composite(rays.filter(ImageFilter.GaussianBlur(18)))
    # birds over the forest
    for (bx, by, s) in [(690, 120, 2), (726, 140, 2), (760, 112, 2), (1580, 70, 2), (1612, 86, 2)]:
        im, (ox, oy) = props16.bird(bx, by, 1)
        b = Image.fromarray(im).resize((im.shape[1] * s, im.shape[0] * s), Image.NEAREST)
        base.alpha_composite(b, (bx - b.width // 2, by - b.height // 2))
    # fireflies near the bushes and the left tree
    for (fx, fy) in [(96, 446), (140, 430), (210, 470), (262, 452), (176, 380), (320, 300), (60, 400), (700, 506), (288, 512)]:
        glow(base, fx * S, fy * S, 12, (255, 240, 150))
        d.rectangle((fx * S - 1, fy * S - 1, fx * S + 1, fy * S + 1), fill=(255, 250, 200, 255))
    # vignette
    vig = np.zeros((1080, 1920, 4), np.uint8)
    yy, xx = np.mgrid[0:1080, 0:1920]
    v = np.clip((np.hypot((xx - 960) / 960, (yy - 540) / 540) - 0.75) / 0.6, 0, 1) * 150
    vig[..., 3] = v.astype(np.uint8)
    base.alpha_composite(Image.fromarray(vig))


def sprite(name, mirror=False):
    im = Image.open(SPR + name + '.png').convert('RGBA')
    ax = META[name]['feetX']
    if mirror:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
        ax = 127 - ax
    return im, ax, META[name]['feetY']


def up(im):
    return im.resize((im.width * S, im.height * S), Image.NEAREST)


# ---------------------------------------------------------------- ground overlays (2x canvas)
def ground_poly(cx, cy, pts_m):
    return [((cx + dx * PX_M) * S, (cy + dz * PZ_M) * S) for (dx, dz) in pts_m]


def cone_pts(cx, cy, ang, half, rng_m, n=24):
    pts = [(0, 0)]
    for i in range(n + 1):
        a = math.radians(ang - half + 2 * half * i / n)
        pts.append((math.cos(a) * rng_m, math.sin(a) * rng_m))
    return ground_poly(cx, cy, pts)


def translucent(base, draw_fn, alpha_img_size=None):
    over = Image.new('RGBA', base.size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(over), over)
    base.alpha_composite(over)


def reach_mask(info, sx, sy, budget_m):
    """Dijkstra over 4px cells: grass 1x, shallow river 2x, cliffs and the plateau unreachable (no jump in this preview)."""
    cs = 4
    gw, gh = W // cs, H // cs
    river = info['river'][::cs, ::cs][:gh, :gw]
    blocked = (info['cliff'] | info['plateau'])[::cs, ::cs][:gh, :gw]
    blocked = blocked | (np.arange(gh)[:, None] * cs < scene.BACK_Y + 6)
    deck = info['deck'][::cs, ::cs][:gh, :gw]
    cost = np.where(river & ~deck, 2.0, 1.0)
    dist = np.full((gh, gw), np.inf)
    s = (int(sy // cs), int(sx // cs))
    dist[s] = 0
    pq = [(0.0, s)]
    steps = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]
    while pq:
        d, (y, x) = heapq.heappop(pq)
        if d > dist[y, x] or d > budget_m:
            continue
        for dy, dx in steps:
            ny, nx = y + dy, x + dx
            if 0 <= ny < gh and 0 <= nx < gw and not blocked[ny, nx]:
                m = math.hypot(dx * cs / PX_M, dy * cs / PZ_M) * cost[ny, nx]
                nd = d + m
                if nd < dist[ny, nx]:
                    dist[ny, nx] = nd
                    heapq.heappush(pq, (nd, (ny, nx)))
    reach = (dist <= budget_m).astype(np.uint8) * 255
    im = Image.fromarray(reach).resize((W * S, H * S), Image.BILINEAR).filter(ImageFilter.GaussianBlur(6 * S))
    return (np.array(im) > 128)


# ---------------------------------------------------------------- HUD helpers
def rrect(d, box, r, fill, outline=None, width=1):
    d.rounded_rectangle(box, r, fill=fill, outline=outline, width=width)


def text(d, xy, s, f, fill=(235, 240, 248, 255), anchor='la'):
    d.text(xy, s, font=f, fill=fill, anchor=anchor)


def portrait(name, mirror=False, size=64, ring=(80, 200, 230, 255), dim=False):
    im, ax, _ = sprite(name, mirror)
    hx = META[name]['headX'] if not mirror else 127 - META[name]['headX']
    hy = META[name]['headY']
    crop = im.crop((hx - 20, hy - 24, hx + 20, hy + 16)).resize((size, size), Image.NEAREST)
    card = Image.new('RGBA', (size + 8, size + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.ellipse((0, 0, size + 7, size + 7), fill=(14, 20, 34, 235), outline=ring, width=3)
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse((2, 2, size - 3, size - 3), fill=255)
    if dim:
        crop = Image.blend(crop, Image.new('RGBA', crop.size, (20, 30, 50, 255)), 0.45)
    card.paste(crop, (4, 4), Image.composite(crop, Image.new('RGBA', crop.size, (0, 0, 0, 0)), mask))
    return card


def chip(d, x, y, s, f, bg=(12, 18, 30, 225), fg=(235, 240, 248, 255), border=None, pad=10, anchor='center'):
    w = d.textlength(s, font=f) + pad * 2
    h = f.size + pad * 1.1
    if anchor == 'center':
        x0 = x - w / 2
    else:
        x0 = x
    rrect(d, (x0, y, x0 + w, y + h), h / 2, bg, outline=border, width=2)
    text(d, (x0 + pad, y + h / 2), s, f, fg, anchor='lm')
    return x0 + w


def eye_slash(d, cx, cy, r=13, col=(120, 230, 170, 255)):
    d.ellipse((cx - r - 3, cy - r - 3, cx + r + 3, cy + r + 3), fill=(10, 24, 22, 230), outline=col, width=2)
    d.arc((cx - 9, cy - 6, cx + 9, cy + 8), 200, 340, fill=col, width=2)
    d.arc((cx - 9, cy - 10, cx + 9, cy + 4), 20, 160, fill=col, width=2)
    d.line((cx - 9, cy + 8, cx + 9, cy - 8), fill=col, width=3)


# ---------------------------------------------------------------- render a mockup
def render(cast, overlays_ground, overlays_top, out):
    img, props, info = build_scene()
    # character shadows on the ground
    for c in cast:
        scene.shadow(img, c['x'], c['y'] + 1, 17, 5, 0.6)
    img = grade(img)
    base = up(Image.fromarray(img.clip(0, 255).astype(np.uint8)).convert('RGBA'))
    backdrop(base)
    overlays_ground(base, info)
    # depth-sorted props + characters
    items = [('prop', p['base'], p) for p in props] + [('char', c['y'], c) for c in cast]
    items.sort(key=lambda t: t[1])
    for kind, _, it in items:
        if kind == 'prop':
            pim = it['img']
            if it['kind'] not in ('campfire',):
                a = np.array(pim).astype(float)
                a[..., :3] = grade(a[..., :3])
                pim = Image.fromarray(a.clip(0, 255).astype(np.uint8))
            if it.get('glow'):
                glow(base, (it['x'] + pim.width / 2) * S, (it['y'] + pim.height * 0.45) * S, 120 if it['kind'] == 'campfire' else 70, it['glow'])
            base.alpha_composite(up(pim), (int(it['x'] * S), int(it['y'] * S)))
        else:
            im, ax, ay = sprite(it['name'], it.get('mirror', False))
            im = up(im)
            if it.get('alpha', 1) < 1:
                a = np.array(im)
                a[..., 3] = (a[..., 3] * it['alpha']).astype(np.uint8)
                im = Image.fromarray(a)
            if it.get('glow'):
                a = np.array(im)[..., 3] > 0
                g = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(3))
                col = Image.new('RGBA', im.size, it['glow'])
                col.putalpha(g.point(lambda v: int(v * 0.9)))
                base.alpha_composite(col, (int((it['x'] - ax) * S), int((it['y'] - ay) * S)))
            base.alpha_composite(im, (int((it['x'] - ax) * S), int((it['y'] - ay) * S)))
    atmosphere(base)
    overlays_top(base, info)
    base.convert('RGB').save(D + out)
    print('wrote', out)


# ================================================================ STEALTH PHASE
def stealth():
    cast = [
        {'name': 'solen_sign', 'x': 64, 'y': 358, 'alpha': 0.62},
        {'name': 'ren_crouch', 'x': 104, 'y': 400, 'alpha': 0.62},
        {'name': 'charlotte', 'x': 158, 'y': 396, 'alpha': 0.62},
        {'name': 'saber', 'x': 232, 'y': 420, 'alpha': 0.62},
        {'name': 'rogue3', 'x': 508, 'y': 360, 'mirror': True},
        {'name': 'rogue2', 'x': 742, 'y': 296, 'mirror': True},
        {'name': 'brute', 'x': 588, 'y': 448, 'mirror': True},
        {'name': 'rogue1', 'x': 880, 'y': 318, 'mirror': True},
    ]
    cones = [  # (x, y, angle, half, range m, seen level)
        (508, 360, 180, 28, 7.5, 'warn'),
        (742, 296, 160, 24, 10.5, 'calm'),
        (588, 448, 192, 24, 7.5, 'calm'),
        (880, 318, 175, 22, 5.0, 'calm'),
    ]

    def ground(base, info):
        def fn(d, over):
            for (x, y, a, h, r, lv) in cones:
                col = (255, 196, 64) if lv == 'warn' else (255, 120, 70)
                pts = cone_pts(x, y, a, h, r)
                d.polygon(pts, fill=col + (58,))
                d.line(pts[1:], fill=col + (170,), width=3)
                d.line([pts[0], pts[1]], fill=col + (120,), width=2)
                d.line([pts[0], pts[-1]], fill=col + (120,), width=2)
            # patrol route of the bridge guard
            route = [(508, 360), (560, 356), (600, 372), (640, 392), (700, 404)]
            for i in range(len(route) - 1):
                (x0, y0), (x1, y1) = route[i], route[i + 1]
                n = int(math.hypot(x1 - x0, y1 - y0) / 9)
                for k in range(n):
                    t = k / max(1, n)
                    px, py = (x0 + (x1 - x0) * t) * S, (y0 + (y1 - y0) * t) * S
                    d.ellipse((px - 3, py - 3, px + 3, py + 3), fill=(255, 220, 140, 200))
        translucent(base, fn)

    def top(base, info):
        d = ImageDraw.Draw(base)
        # banner
        rrect(d, (660, 26, 1260, 118), 22, (10, 16, 28, 222), outline=(120, 230, 170, 255), width=2)
        text(d, (960, 58), 'FASE DE SIGILO', font('ExtraBold', 34), (150, 240, 190, 255), 'mm')
        text(d, (960, 94), 'Nadie os ha visto · no entréis en los conos de visión', font('Medium', 20), (200, 214, 230, 255), 'mm')
        # hidden markers over the party
        for c in cast[:4]:
            hx = c['x'] * S
            hy = (c['y'] - 112) * S
            eye_slash(d, hx, hy)
        # suspicion over the bridge guard
        gx, gy = 508 * S, (360 - 116) * S
        d.ellipse((gx - 20, gy - 20, gx + 20, gy + 20), fill=(40, 30, 6, 235), outline=(255, 205, 80, 255), width=3)
        text(d, (gx, gy + 1), '?', font('ExtraBold', 28), (255, 215, 90, 255), 'mm')
        rrect(d, (gx - 46, gy + 28, gx + 46, gy + 38), 5, (30, 24, 10, 230))
        rrect(d, (gx - 46, gy + 28, gx + 10, gy + 38), 5, (255, 200, 70, 255))
        chip(d, gx, gy + 46, 'Sospecha 2/3', font('SemiBold', 17), border=(255, 205, 80, 200))
        # elevation tag for the archer on the hill
        chip(d, 742 * S, (296 - 126) * S - 34, 'Altura +2 · ve más lejos', font('SemiBold', 17), border=(160, 190, 255, 200))
        # party bar (bottom left, compact)
        rrect(d, (24, 944, 800, 1060), 20, (10, 16, 28, 228), outline=(60, 80, 110, 255), width=2)
        text(d, (44, 966), 'TU EQUIPO · OCULTO', font('Bold', 16), (150, 240, 190, 255), 'lm')
        text(d, (780, 966), 'Golpe desde el escondite: ventaja + daño sorpresa', font('Medium', 15), (190, 204, 222, 255), 'rm')
        for i, (nm, pr, st) in enumerate([('Solen', 'solen', 'Sigilo 15'), ('Ren', 'ren', 'Sigilo 19'), ('Charlotte', 'charlotte', 'Sigilo 17'), ('Saber', 'saber', 'Sigilo 13')]):
            x0 = 40 + i * 190
            base.alpha_composite(portrait(pr, size=56, ring=(120, 230, 170, 255)), (x0, 984))
            text(d, (x0 + 72, 1004), nm, font('Bold', 19), (240, 244, 250, 255), 'lm')
            text(d, (x0 + 72, 1030), st + ' vs 12', font('Medium', 15), (150, 240, 190, 255), 'lm')
        # legend (bottom right, compact)
        rrect(d, (1290, 892, 1896, 1060), 20, (10, 16, 28, 228), outline=(60, 80, 110, 255), width=2)
        rows = [((255, 120, 70), 'Cono de visión: si entras, te descubren'),
                ((255, 196, 64), 'Amarillo: el guardia sospecha (ruido, rastro)'),
                ((120, 230, 170), 'Arbustos, hierba alta, humo, sombra: escondite'),
                ((160, 190, 255), 'Desde la colina se ve más lejos')]
        for i, (c, s) in enumerate(rows):
            y = 920 + i * 37
            d.rounded_rectangle((1312, y - 10, 1338, y + 10), 6, fill=c + (200,))
            text(d, (1352, y), s, font('Medium', 18), (225, 232, 242, 255), 'lm')
        # interactable tags
        chip(d, 661 * S, (438 - 34) * S, 'Barriles explosivos', font('SemiBold', 15), border=(255, 140, 90, 200))
        chip(d, 812 * S, (302 + 8) * S, 'Hoguera', font('SemiBold', 15), border=(255, 170, 90, 200))

    render(cast, ground, top, 'mock_stealth.png')


# ================================================================ COMBAT TURN
def combat():
    CH = (232, 384)        # Charlotte now
    DST = (368, 404)       # where she will move
    cast = [
        {'name': 'solen', 'x': 120, 'y': 350},
        {'name': 'saber', 'x': 136, 'y': 428},
        {'name': 'ren', 'x': 268, 'y': 440},
        {'name': 'charlotte', 'x': CH[0], 'y': CH[1], 'glow': (90, 220, 255, 255)},
        {'name': 'charlotte_cast', 'x': DST[0], 'y': DST[1], 'alpha': 0.45},
        {'name': 'rogue3', 'x': 520, 'y': 362, 'mirror': True, 'glow': (255, 70, 70, 255)},
        {'name': 'brute', 'x': 588, 'y': 448, 'mirror': True, 'glow': (255, 70, 70, 255)},
        {'name': 'rogue2', 'x': 730, 'y': 294, 'mirror': True},
        {'name': 'rogue1', 'x': 868, 'y': 312, 'mirror': True},
    ]
    budget = 9.0

    def ground(base, info):
        mask = reach_mask(info, CH[0], CH[1], budget)
        a = np.zeros((H * S, W * S, 4), np.uint8)
        a[mask] = (70, 200, 255, 46)
        edge = mask & ~(np.roll(mask, 3, 0) & np.roll(mask, -3, 0) & np.roll(mask, 3, 1) & np.roll(mask, -3, 1))
        a[edge] = (120, 225, 255, 200)
        base.alpha_composite(Image.fromarray(a))

        def fn(d, over):
            # the cone the jutsu will cover from the destination
            pts = cone_pts(DST[0] + 6, DST[1] - 2, 356, 30, 11.5)
            d.polygon(pts, fill=(255, 90, 60, 70))
            d.line(pts[1:] + [pts[0], pts[1]], fill=(255, 130, 90, 230), width=3)
            # path from Charlotte to the destination
            n = 14
            for k in range(1, n):
                t = k / n
                x = CH[0] + (DST[0] - CH[0]) * t
                y = CH[1] + (DST[1] - CH[1]) * t - math.sin(t * math.pi) * 6
                d.ellipse((x * S - 4, y * S - 4, x * S + 4, y * S + 4), fill=(200, 245, 255, 235))
            x, y = DST
            d.ellipse((x * S - 22, y * S - 8, x * S + 22, y * S + 8), outline=(200, 245, 255, 255), width=3)
        translucent(base, fn)

    def top(base, info):
        d = ImageDraw.Draw(base)
        # initiative bar
        order = [('charlotte', False, (90, 220, 255, 255)), ('rogue3', True, (255, 90, 90, 255)), ('saber', False, (110, 170, 255, 255)),
                 ('brute', True, (255, 90, 90, 255)), ('ren', False, (110, 170, 255, 255)), ('rogue2', True, (255, 90, 90, 255)),
                 ('solen', False, (110, 170, 255, 255)), ('rogue1', True, (255, 90, 90, 255))]
        x0 = 640
        rrect(d, (x0 - 120, 18, x0 + len(order) * 84 + 40, 124), 24, (10, 16, 28, 222), outline=(60, 80, 110, 255), width=2)
        text(d, (x0 - 62, 52), 'RONDA', font('Bold', 16), (150, 165, 190, 255), 'mm')
        text(d, (x0 - 62, 86), '2', font('ExtraBold', 38), (240, 244, 250, 255), 'mm')
        for i, (nm, mir, ring) in enumerate(order):
            size = 76 if i == 0 else 60
            card = portrait(nm, mir, size=size, ring=ring)
            yy = 28 if i == 0 else 38
            base.alpha_composite(card, (x0 + 10 + i * 84 + (0 if i == 0 else 8), yy))
        text(d, (x0 + 52, 116), 'TU TURNO', font('ExtraBold', 13), (120, 225, 255, 255), 'mm')
        # active character panel
        rrect(d, (24, 18, 484, 152), 22, (10, 16, 28, 228), outline=(90, 220, 255, 220), width=2)
        base.alpha_composite(portrait('charlotte', size=92, ring=(90, 220, 255, 255)), (36, 30))
        text(d, (150, 46), 'Charlotte', font('ExtraBold', 28), anchor='lm')
        text(d, (150, 76), 'Clan Akkai · Espadachina · Nv 5', font('Medium', 17), (170, 185, 205, 255), 'lm')
        for k, (lab, v, m, col) in enumerate([('PV', 34, 42, (90, 210, 120)), ('Chakra', 18, 26, (80, 160, 255))]):
            y = 102 + k * 26
            text(d, (150, y + 8), lab, font('Bold', 14), (200, 210, 225, 255), 'lm')
            rrect(d, (214, y, 466, y + 16), 8, (30, 38, 54, 255))
            rrect(d, (214, y, 214 + 252 * v / m, y + 16), 8, col + (255,))
            text(d, (464, y + 8), f'{v}/{m}', font('Bold', 13), (10, 16, 28, 255), 'rm')
        # movement label at the destination
        chip(d, DST[0] * S, (DST[1] + 14) * S, '4.5 m · quedan 4.5 m', font('Bold', 19), border=(200, 245, 255, 220))
        # targets
        chip(d, 520 * S, (362 - 128) * S, '72%  ·  3d8', font('Bold', 20), bg=(40, 10, 12, 235), border=(255, 110, 110, 255))
        chip(d, 588 * S + 150, (448 - 118) * S, '55%  ·  Cobertura ½ (+2 CA)', font('Bold', 20), bg=(40, 10, 12, 235), border=(255, 110, 110, 255))
        chip(d, 661 * S, (450 + 6) * S, 'Barriles explosivos', font('SemiBold', 15), border=(255, 140, 90, 200))
        chip(d, 730 * S, (294 - 128) * S - 30, 'Fuera del abanico · Altura +2', font('SemiBold', 17), border=(160, 190, 255, 200))
        # last roll toast
        TX, TY = 1468, 18
        rrect(d, (TX, TY, TX + 428, TY + 124), 18, (10, 16, 28, 222), outline=(110, 170, 255, 200), width=2)
        cx, cy = TX + 58, TY + 62
        hexs = [(cx + 40 * math.cos(math.radians(60 * k + 30)), cy + 40 * math.sin(math.radians(60 * k + 30))) for k in range(6)]
        d.polygon(hexs, fill=(235, 238, 245, 255), outline=(120, 130, 150, 255))
        d.polygon([(cx, cy - 30), (cx + 26, cy + 15), (cx - 26, cy + 15)], outline=(120, 130, 150, 255), width=2)
        text(d, (cx, cy + 2), '17', font('ExtraBold', 24), (20, 28, 44, 255), 'mm')
        text(d, (TX + 116, TY + 30), 'Saber · Tajo con espada', font('Bold', 19), (235, 240, 248, 255), 'lm')
        text(d, (TX + 116, TY + 62), '17 + 5 = 22  vs  CA 15', font('Medium', 19), (200, 214, 230, 255), 'lm')
        text(d, (TX + 116, TY + 94), '¡Impacto! 9 de daño cortante', font('Bold', 19), (120, 230, 150, 255), 'lm')
        # action bar
        rrect(d, (380, 954, 1540, 1074), 26, (10, 16, 28, 232), outline=(60, 80, 110, 255), width=2)
        pips = [('Acción', (90, 210, 120)), ('Adicional', (255, 170, 60)), ('Reacción', (190, 120, 255))]
        for k, (lab, col) in enumerate(pips):
            x = 420 + k * 108
            d.ellipse((x, 976, x + 34, 1010), fill=col + (255,), outline=(240, 240, 250, 255), width=2)
            text(d, (x + 17, 1032), lab, font('SemiBold', 14), (200, 210, 225, 255), 'mm')
        text(d, (420, 1064), 'Movimiento', font('SemiBold', 14), (200, 210, 225, 255), 'lm')
        rrect(d, (512, 1056, 720, 1072), 8, (30, 38, 54, 255))
        rrect(d, (512, 1056, 512 + 208 * (9 - 4.5) / 9, 1072), 8, (90, 210, 255, 255))
        text(d, (726, 1064), '4.5 / 9 m', font('Bold', 14), (200, 230, 255, 255), 'lm')
        abil = [('Ataque', (200, 205, 215)), ('Viento cortante', (255, 120, 90)), ('Esconderse', (120, 230, 170)), ('Salto ninja', (160, 190, 255)),
                ('Empujar', (220, 200, 140)), ('Agacharse', (150, 200, 160)), ('Fin de turno', (180, 180, 190))]
        for k, (lab, col) in enumerate(abil):
            x = 800 + k * 104
            sel = k == 1
            rrect(d, (x, 966, x + 92, 1036), 16, (24, 32, 48, 255) if not sel else (60, 24, 20, 255), outline=col + (255,), width=4 if sel else 2)
            text(d, (x + 46, 1056), lab, font('SemiBold', 13), (220, 228, 240, 255), 'mm')
        # simple icons in the ability buttons
        icx = [846 + k * 104 for k in range(7)]
        d.line((icx[0] - 22, 1024, icx[0] + 22, 980), fill=(220, 225, 235, 255), width=6)
        d.line((icx[0] - 14, 1008, icx[0] - 4, 1018), fill=(220, 225, 235, 255), width=6)
        d.polygon([(icx[1] - 26, 1024), (icx[1] + 26, 976), (icx[1] + 26, 1024)], fill=(255, 120, 90, 200))
        eye_slash(d, icx[2], 1002, r=16)
        d.arc((icx[3] - 26, 978, icx[3] + 26, 1030), 200, 340, fill=(160, 190, 255, 255), width=5)
        d.polygon([(icx[3] + 22, 990), (icx[3] + 30, 1004), (icx[3] + 14, 1002)], fill=(160, 190, 255, 255))
        d.polygon([(icx[4] - 20, 988), (icx[4] + 10, 1002), (icx[4] - 20, 1016)], fill=(220, 200, 140, 255))
        d.line((icx[4] + 14, 982, icx[4] + 14, 1022), fill=(220, 200, 140, 255), width=5)
        d.rounded_rectangle((icx[5] - 22, 1004, icx[5] + 22, 1024), 6, fill=(150, 200, 160, 255))
        d.ellipse((icx[5] - 10, 980, icx[5] + 10, 1000), fill=(150, 200, 160, 255))
        d.line((icx[6] - 18, 984, icx[6] + 18, 1020), fill=(180, 180, 190, 255), width=6)
        d.line((icx[6] - 18, 1020, icx[6] + 18, 984), fill=(180, 180, 190, 255), width=6)
        # tooltip of the selected jutsu
        rrect(d, (1556, 846, 1896, 1074), 18, (10, 16, 28, 236), outline=(255, 130, 90, 230), width=2)
        text(d, (1576, 876), 'Viento cortante', font('ExtraBold', 24), (255, 170, 140, 255), 'lm')
        for k, s in enumerate(['Abanico 60° · 11 m', '3d8 cortante · TS DES 14', '4 chakra · Acción', 'Golpea a todos dentro,', 'aliados incluidos.', 'Los muros lo frenan.']):
            text(d, (1576, 912 + k * 26), s, font('Medium', 17), (220, 228, 240, 255) if k < 3 else (170, 185, 205, 255), 'lm')

    render(cast, ground, top, 'mock_combat.png')


if __name__ == '__main__':
    stealth()
    combat()
