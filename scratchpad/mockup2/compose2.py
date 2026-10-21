"""Second mockup round: the real-scale 60 m map with the agents' world sprites, a camera, two zoom levels and a
polished HUD.  python3 compose2.py [panorama|tactical|close|all]"""
import json
import math
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import terrain as T  # noqa: E402

MOCK1 = os.path.join(os.path.dirname(HERE), 'mockup')
SPR = os.path.join(MOCK1, 'sprites')
META = json.load(open(os.path.join(SPR, 'sprites.json')))
WORLD = '/home/user/Ninja-Fantasy-Game/src/assets/world'
BACKDROP = '/home/user/Ninja-Fantasy-Game/src/assets/images/shinobi_campaign_forest_backdrop_1791702689788.jpg'
FONT = '/usr/share/fonts/opentype/inter/Inter-'
OUT = HERE


def font(weight, size):
    return ImageFont.truetype(FONT + weight + '.otf', size)


# ------------------------------------------------------------------ sprite library (manifests from the agents)
class Lib:
    def __init__(self):
        self.groups = {}
        if os.path.isdir(WORLD):
            for g in sorted(os.listdir(WORLD)):
                mf = os.path.join(WORLD, g, 'manifest.json')
                if os.path.exists(mf):
                    self.groups[g] = json.load(open(mf))['sprites']
        self.cache = {}
        self.missing = set()

    def frame(self, group, name, anim=None, i=0):
        spec = self.groups.get(group, {}).get(name)
        if not spec:
            self.missing.add(f'{group}/{name}')
            return None
        anims = spec['anims']
        if anim is None or anim not in anims:
            anim = min(anims, key=lambda k: anims[k]['row'])
        a = anims[anim]
        key = (group, name)
        if key not in self.cache:
            self.cache[key] = Image.open(os.path.join(WORLD, group, spec['file'])).convert('RGBA')
        sheet = self.cache[key]
        fw, fh = spec['frameW'], spec['frameH']
        i = i % a['frames']
        im = sheet.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh))
        return im, tuple(spec['anchor']), spec


LIB = Lib()


# ------------------------------------------------------------------ scene description
def ground_xy(xm, zm, lvl=None):
    if lvl is None:
        return T.ground_y(xm, zm)
    return T.gp(xm, zm, lvl)


ZK = T.DEPTH_M / 16.0      # placements below were laid out for a 16 m deep field; stretch them to the real depth


def P(group, name, xm, zm, anim=None, i=0, mirror=False, lvl=None, glow=None, shadow=True, lift=0, tint=None):
    return dict(kind='prop', group=group, name=name, xm=xm, zm=zm * ZK, anim=anim, i=i, mirror=mirror, lvl=lvl, glow=glow,
                shadow=shadow, lift=lift, tint=tint)


def C(name, xm, zm, mirror=False, lvl=None, ring=None, alpha=1.0, team='ally'):
    return dict(kind='char', name=name, xm=xm, zm=zm * ZK, mirror=mirror, lvl=lvl, ring=ring, alpha=alpha, team=team)


WARM = (255, 170, 80)
LAMP = (255, 196, 110)


def world_props(frame_i=0):
    f = frame_i
    S = []
    # ---- forest edge (party side)
    S += [P('trees', 'pine', 1.2, 0.2, i=f), P('trees', 'oak', 4.6, 0.8, i=f + 2), P('trees', 'maple', 9.4, 0.4, i=f + 1),
          P('trees', 'oak', 12.6, 1.2, i=f + 5), P('trees', 'stump', 7.6, 6.0)]
    S += [P('landmarks', 'hokora', 6.6, 2.4), P('landmarks', 'stone_lantern', 5.3, 2.9, anim='lit', i=f, glow=LAMP),
          P('plants', 'fern', 3.0, 3.0, i=f), P('plants', 'fern', 10.8, 2.8, i=f + 1), P('plants', 'mushroom_log', 10.0, 6.6, i=f)]
    S += [P('plants', 'bush_round', 2.6, 8.6, i=f), P('plants', 'bush_flower', 0.8, 11.0, i=f + 1), P('plants', 'bush_wide', 5.2, 13.6, i=f + 2),
          P('plants', 'tall_grass', 8.0, 14.4, i=f), P('plants', 'tall_grass', 3.6, 15.4, i=f + 3), P('plants', 'flowers', 6.4, 9.0, i=f),
          P('plants', 'flowers', 11.6, 13.0, i=f + 2), P('landmarks', 'rocks_small', 9.2, 11.4)]
    S += [P('animals', 'fireflies', 3.2, 7.6, i=f, shadow=False, lift=60), P('animals', 'rabbit', 12.6, 12.0, anim='graze', i=f)]
    # ---- clearing
    S += [P('trees', 'bamboo', 18.4, 0.3, i=f), P('trees', 'bamboo', 20.2, 0.9, i=f + 3), P('trees', 'maple', 23.4, 1.0, i=f + 4),
          P('landmarks', 'signpost', 14.8, 8.8, i=f), P('landmarks', 'boulder', 18.0, 6.4), P('landmarks', 'rock', 21.4, 12.4),
          P('landmarks', 'fence', 15.0, 12.9), P('landmarks', 'fence', 17.0, 12.9), P('landmarks', 'fence', 19.0, 13.0, anim='broken'),
          P('plants', 'bush_round', 22.6, 5.0, i=f + 1), P('plants', 'tall_grass', 16.2, 4.6, i=f + 2), P('plants', 'flowers', 20.0, 9.4, i=f + 1),
          P('landmarks', 'rocks_small', 13.8, 14.6)]
    S += [P('animals', 'deer', 16.0, 3.2, anim='graze', i=f), P('animals', 'crow', 17.2, 12.9, anim='perch', i=f, shadow=False, lift=54),
          P('animals', 'butterfly_blue', 12.0, 9.6, i=f, shadow=False, lift=70), P('animals', 'butterfly_yellow', 20.6, 10.4, i=f + 2, shadow=False, lift=50)]
    # ---- river and bridge
    S += [P('landmarks', 'stone_lantern', 24.0, 9.0, anim='lit', i=f + 2, glow=LAMP), P('landmarks', 'stone_lantern', 32.2, 9.0, anim='lit', i=f + 4, glow=LAMP),
          P('plants', 'reeds', 25.4, 13.2, i=f), P('plants', 'reeds', 31.6, 4.4, i=f + 2), P('plants', 'reeds', 30.6, 14.6, i=f + 1),
          P('plants', 'lily_pads', 27.2, 14.2, i=f, shadow=False), P('plants', 'lily_pads', 29.0, 12.6, i=f + 3, shadow=False),
          P('landmarks', 'river_stones', 28.4, 11.0, i=f, shadow=False), P('animals', 'frog', 27.0, 11.2, i=f, shadow=False, lift=6),
          P('animals', 'koi', 29.6, 3.4, anim='jump', i=4, shadow=False), P('animals', 'dragonfly', 26.6, 6.0, i=f, shadow=False, lift=50)]
    # ---- below the hill
    S += [P('camp', 'barrel_explosive', 35.6, 11.4), P('camp', 'barrel_explosive', 36.4, 12.2), P('landmarks', 'boulder', 41.0, 12.2),
          P('landmarks', 'fence_bamboo', 44.0, 13.4), P('landmarks', 'fence_bamboo', 46.0, 13.4), P('plants', 'bush_wide', 49.4, 12.6, i=f),
          P('plants', 'tall_grass', 38.6, 14.6, i=f + 1), P('plants', 'bush_round', 53.4, 14.0, i=f + 2), P('landmarks', 'rock', 56.8, 11.6),
          P('plants', 'flowers', 33.6, 14.8, i=f), P('trees', 'oak', 58.6, 14.8, i=f + 3)]
    # ---- hill camp (level 2)
    S += [P('trees', 'pine', 38.6, -0.2, i=f + 1), P('trees', 'pine', 47.6, -0.3, i=f + 3),
          P('camp', 'tent', 43.2, 2.0, i=f), P('camp', 'weapon_rack', 40.2, 2.4), P('camp', 'campfire', 44.8, 5.2, anim='burning', i=f, glow=WARM),
          P('camp', 'smoke', 44.9, 5.2, i=f, shadow=False), P('camp', 'crate_stack', 48.6, 1.8), P('camp', 'crate', 47.6, 3.6),
          P('camp', 'sacks', 46.6, 6.6), P('camp', 'barrel', 39.6, 6.2), P('camp', 'barrel', 40.4, 6.9), P('camp', 'barrel_explosive', 49.2, 6.0),
          P('landmarks', 'stone_lantern', 43.6, 7.9, anim='lit', i=f + 1, glow=LAMP)]
    # ---- lookout (level 3)
    S += [P('trees', 'pine', 56.4, -0.2, i=f + 2), P('landmarks', 'stone_lantern', 52.0, 2.6, anim='unlit'), P('camp', 'crate', 54.2, 2.4),
          P('animals', 'sparrow', 54.3, 2.4, anim='perch', i=f, shadow=False, lift=46)]
    return S


# ------------------------------------------------------------------ rendering helpers
def grade(a):
    """misty forest mood so the pixel world sits inside the painted backdrop."""
    a = a.astype(float)
    a[..., :3] = a[..., :3] * np.array([0.84, 0.92, 0.90]) + np.array([6, 12, 14])
    return a.clip(0, 255).astype(np.uint8)


_terrain = None


def terrain():
    global _terrain
    if _terrain is None:
        cache = os.path.join(HERE, 'terrain_cache.npz')
        if os.path.exists(cache) and os.path.getmtime(cache) > os.path.getmtime(os.path.join(HERE, 'terrain.py')):
            z = np.load(cache, allow_pickle=True)
            _terrain = (z['rgba'], z['info'].item())
        else:
            rgba, info = T.paint()
            keep = {k: v for k, v in info.items() if not callable(v)}
            np.savez_compressed(cache, rgba=rgba, info=np.array(keep, dtype=object))
            _terrain = (rgba, keep)
    return _terrain


def char_sprite(name, mirror):
    im = Image.open(os.path.join(SPR, name + '.png')).convert('RGBA')
    ax, ay = META[name]['feetX'], META[name]['feetY']
    if mirror:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
        ax = 127 - ax
    return im, ax, ay


def shadow_on(world, cx, cy, rx, ry, k=0.6):
    """two-step pixel shadow ellipse darkening the ground layer in place."""
    h, w = world.shape[:2]
    for (sx, sy, f) in [(1.0, 1.0, k + (1 - k) * 0.4), (0.7, 0.66, 0.86)]:
        x0, x1 = int(max(0, cx - rx * sx)), int(min(w, cx + rx * sx + 1))
        y0, y1 = int(max(0, cy - ry * sy)), int(min(h, cy + ry * sy + 1))
        if x1 <= x0 or y1 <= y0:
            continue
        yy, xx = np.mgrid[y0:y1, x0:x1]
        m = ((xx + 0.5 - cx) / (rx * sx)) ** 2 + ((yy + 0.5 - cy) / (ry * sy)) ** 2 <= 1
        sub = world[y0:y1, x0:x1]
        sub[..., :3][m & (sub[..., 3] > 0)] = (sub[..., :3][m & (sub[..., 3] > 0)] * f).astype(np.uint8)


def bridge_rail(x0, x1, front):
    """a wooden handrail along one side of the bridge deck: posts every ~1.2 m, a top rail and a mid rail."""
    sys.path.insert(0, MOCK1)
    from scene import WOOD
    w = int(x1 - x0) + 8
    h = 58
    a = np.zeros((h, w, 4), float)
    top, mid = 6, 26
    base = h - 2
    def rect(xa, ya, xb, yb, tone):
        a[ya:yb, xa:xb, :3] = WOOD[tone]
        a[ya:yb, xa:xb, 3] = 255
    for px in list(range(4, w - 8, 68)) + [w - 10]:
        rect(px, top, px + 6, base, 3 if front else 2)
        a[top:base, px, :3] = WOOD[4] if front else WOOD[3]
        a[top:base, px + 5, :3] = WOOD[1]
        a[top + 2:top + 4, px:px + 6, :3] = WOOD[5] if front else WOOD[4]
    for (ya, tone) in [(top, 4 if front else 3), (mid, 3 if front else 2)]:
        rect(0, ya, w, ya + 5, tone)
        a[ya, 0:w, :3] = WOOD[5] if front else WOOD[4]
        a[ya + 4, 0:w, :3] = WOOD[1]
    m = a[..., 3] > 0
    e = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
    a[e, :3] = WOOD[0]
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


def build_world(items, frame_i=0):
    """returns the native-res pixel world (terrain + sprites, depth sorted) as RGBA, plus placed boxes for overlays."""
    rgba, info = terrain()
    world = rgba.copy()
    placed = []
    draw = []
    for it in items:
        if it['kind'] == 'prop':
            fr = LIB.frame(it['group'], it['name'], it['anim'], it['i'])
            if fr is None:
                continue
            im, (ax, ay), spec = fr
            if it['mirror']:
                im = im.transpose(Image.FLIP_LEFT_RIGHT)
                ax = im.width - 1 - ax
            gx, gy = ground_xy(it['xm'], it['zm'], it['lvl'])
            if it['shadow']:
                wm = spec['meters'][0] * T.PXM
                big = 'trees' == it['group']
                shadow_on(world, gx + (6 if not big else 14), gy + 1, wm * (0.32 if big else 0.55), max(4, wm * (0.07 if big else 0.13)), 0.62)
            draw.append((gy, 'prop', it, im, gx - ax, gy - ay - it['lift']))
        else:
            im, ax, ay = char_sprite(it['name'], it['mirror'])
            gx, gy = ground_xy(it['xm'], it['zm'], it['lvl'])
            shadow_on(world, gx + 4, gy + 1, 18, 5, 0.58)
            draw.append((gy, 'char', it, im, gx - ax, gy - ay))
    bx0, bx1, dy_top, dy_bot = info['bridge']
    for front, gy in ((False, dy_top), (True, dy_bot)):
        im = bridge_rail(bx0, bx1, front)
        draw.append((gy - 0.5, 'rail', {'kind': 'rail'}, im, bx0 - 4, gy - im.height + 4))
    draw.sort(key=lambda t: t[0])
    ground = Image.fromarray(grade(world))
    base = Image.new('RGBA', ground.size, (0, 0, 0, 0))
    glows = []
    for gy, kind, it, im, x, y in draw:
        if kind == 'rail':
            im = Image.fromarray(grade(np.array(im)))
        elif kind == 'prop':
            if it['group'] not in ('camp',) or it['name'] not in ('campfire', 'smoke'):
                im = Image.fromarray(grade(np.array(im)))
            if it.get('glow'):
                glows.append((x + im.width / 2, y + im.height * (0.55 if it['name'] == 'campfire' else 0.42), it['glow'], 90 if it['name'] == 'campfire' else 55))
        elif kind == 'char':
            if it['alpha'] < 1:
                a = np.array(im)
                a[..., 3] = (a[..., 3] * it['alpha']).astype(np.uint8)
                im = Image.fromarray(a)
        base.alpha_composite(im, (int(round(x)), int(round(y))))
        placed.append({'it': it, 'box': (x, y, x + im.width, y + im.height), 'gy': gy})
    return ground, base, placed, glows, info


def add_glows(img, glows, Z, cam):
    over = Image.new('RGBA', img.size, (0, 0, 0, 0))
    for (x, y, col, r) in glows:
        cx, cy, rr = (x - cam[0]) * Z, (y - cam[1]) * Z, r * Z
        if cx < -rr or cy < -rr or cx > img.width + rr or cy > img.height + rr:
            continue
        size = int(rr * 2)
        yy, xx = np.mgrid[0:size, 0:size]
        d = np.hypot(xx - rr, (yy - rr) * 1.25) / rr
        a = np.clip(1 - d, 0, 1) ** 2 * 110
        g = np.zeros((size, size, 4), np.uint8)
        g[..., 0], g[..., 1], g[..., 2] = col
        g[..., 3] = a.astype(np.uint8)
        over.alpha_composite(Image.fromarray(g), (int(cx - rr), int(cy - rr)))
    img.alpha_composite(over)


def backdrop(size, Z, cam):
    """painted forest behind the pixel world: parallax 0.3 across, anchored so its foot hides behind the tree line."""
    W, H = size
    src = Image.open(BACKDROP).convert('RGB').crop((0, 0, 930, 330))   # the misty forest only (the tower would repeat)
    bh = int(620 * Z)
    bw = int(src.width * bh / src.height)
    bd = src.resize((bw, bh), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2 * Z))
    canvas = Image.new('RGBA', size, (18, 34, 32, 255))
    left = -int((cam[0] * 0.3) * Z) - int(60 * Z)
    top = int((T.BACK_Y - 560 - cam[1]) * Z)
    x = left
    flip = False
    while x < W:
        tile = bd.transpose(Image.FLIP_LEFT_RIGHT) if flip else bd
        canvas.paste(tile, (x, top))
        x += bw
        flip = not flip
    # haze toward the bottom of the backdrop
    hz = np.zeros((H, W, 4), np.uint8)
    ys = np.arange(H)[:, None]
    foot = (T.BACK_Y - 40 - cam[1]) * Z
    a = np.clip((ys - (foot - 260 * Z)) / (260 * Z), 0, 1) * 150
    hz[..., 0], hz[..., 1], hz[..., 2] = 150, 196, 182
    hz[..., 3] = np.broadcast_to(a, (H, W)).astype(np.uint8)
    canvas.alpha_composite(Image.fromarray(hz))
    return canvas


def mist(img, Z, cam, info):
    """a band of mist along the back edge so the pixel tree line melts into the painting."""
    W, H = img.size
    bl = info['backline']
    xs = (np.arange(W) / Z + cam[0]).astype(int).clip(0, len(bl) - 1)
    line = (bl[xs] - cam[1]) * Z
    ys = np.arange(H)[:, None]
    a = np.exp(-((ys - (line[None, :] - 30 * Z)) / (60 * Z)) ** 2) * 120
    fog = np.zeros((H, W, 4), np.uint8)
    fog[..., 0], fog[..., 1], fog[..., 2] = 168, 210, 196
    fog[..., 3] = a.astype(np.uint8)
    img.alpha_composite(Image.fromarray(fog))


def atmosphere(img, Z):
    W, H = img.size
    rays = Image.new('RGBA', img.size, (0, 0, 0, 0))
    rd = ImageDraw.Draw(rays)
    for (x0, w0) in [(0.12, 0.04), (0.33, 0.025), (0.55, 0.05), (0.8, 0.03)]:
        x0, w0 = x0 * W, w0 * W
        rd.polygon([(x0, 0), (x0 + w0, 0), (x0 + w0 + 0.3 * W, H), (x0 + 0.22 * W, H)], fill=(255, 245, 200, 16))
    img.alpha_composite(rays.filter(ImageFilter.GaussianBlur(18)))
    vig = np.zeros((H, W, 4), np.uint8)
    yy, xx = np.mgrid[0:H, 0:W]
    v = np.clip((np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)) - 0.78) / 0.6, 0, 1) * 140
    vig[..., 3] = v.astype(np.uint8)
    img.alpha_composite(Image.fromarray(vig))


def render_view(items, cam, Z, size=(1920, 1080), frame_i=0, ground_fx=None):
    """cam = top-left of the view in native px; Z = zoom (1 tactical, 2 close). ground_fx(img) draws overlays
    on the ground (reach, cones, paths) under the sprites."""
    ground, sprites, placed, glows, info = build_world(items, frame_i)
    W, H = size
    nw, nh = W // Z, H // Z
    box = (cam[0], cam[1], cam[0] + nw, cam[1] + nh)
    img = backdrop(size, Z, cam)
    img.alpha_composite(ground.crop(box).resize((nw * Z, nh * Z), Image.NEAREST))
    mist(img, Z, cam, info)
    if ground_fx:
        ground_fx(img, info)
    img.alpha_composite(sprites.crop(box).resize((nw * Z, nh * Z), Image.NEAREST))
    add_glows(img, glows, Z, cam)
    atmosphere(img, Z)
    return img, placed, info


def to_screen(xm, zm, cam, Z, lvl=None, dy=0):
    x, y = ground_xy(xm, zm, lvl)
    return (x - cam[0]) * Z, (y - cam[1] + dy) * Z


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'panorama'
    items = world_props()
    if what in ('panorama', 'all'):
        ground, sprites, placed, glows, info = build_world(items)
        img = backdrop(ground.size, 1, (0, 0))
        img.alpha_composite(ground)
        mist(img, 1, (0, 0), info)
        img.alpha_composite(sprites)
        add_glows(img, glows, 1, (0, 0))
        img.convert('RGB').save(os.path.join(OUT, 'panorama.png'))
        print('panorama ok; missing:', sorted(LIB.missing))
