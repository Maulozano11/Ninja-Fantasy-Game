# Mockup compositor for the VFX ideas: the owner's real sheets (src/assets/world/...), the real
# battle map ground, and rendered caster/target sprites, laid out on a timeline in map pixels (1x),
# then shown at 2x nearest-neighbour. Read-only on the repo.
import json, math, os, subprocess, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFont

REPO = '/home/user/Ninja-Fantasy-Game'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)
WORLD = REPO + '/src/assets/world'
MAPDIR = REPO + '/src/assets/maps/river_forest'
CHARS = HERE + '/chars'
REF = os.path.join(OUT, 'work', 'ref')
PXM, PXD, BACKY = 57, 38, 360
K = 2  # display scale
FONT_B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
_fonts = {}


def font(size, bold=False):
    key = (size, bold)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(FONT_B if bold else FONT, size)
    return _fonts[key]


# --- sheets -------------------------------------------------------------------------------

class Sheet:
    def __init__(self, img, fw, fh, anchor, anims):
        self.img, self.fw, self.fh = img, fw, fh
        self.ax, self.ay = anchor
        self.anims = anims
        self.cache = {}

    def anim(self, a):
        return self.anims.get(a) or list(self.anims.values())[0]

    def frame(self, a, i, mirror=False, scale=1.0):
        an = self.anim(a)
        i = max(0, min(an['frames'] - 1, i))
        key = (an['row'], i, mirror, scale)
        if key not in self.cache:
            im = self.img.crop((i * self.fw, an['row'] * self.fh, (i + 1) * self.fw, (an['row'] + 1) * self.fh))
            if mirror:
                im = im.transpose(Image.FLIP_LEFT_RIGHT)
            if scale != 1.0:
                im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.NEAREST)
            self.cache[key] = im
        return self.cache[key]

    def ms(self, a):
        an = self.anim(a)
        return an['frames'] / an['fps'] * 1000

    def frame_at(self, a, ms):
        an = self.anim(a)
        n = 0 if ms < 0 else int(ms / 1000 * an['fps'])
        return n % an['frames'] if an.get('loop') else min(n, an['frames'] - 1)


_sheets = {}


def sheet(group, name):
    key = (group, name)
    if key not in _sheets:
        man = json.load(open(f'{WORLD}/{group}/manifest.json'))
        s = man['sprites'][name]
        img = Image.open(f'{WORLD}/{group}/{s["file"]}').convert('RGBA')
        _sheets[key] = Sheet(img, s['frameW'], s['frameH'], s['anchor'], s['anims'])
    return _sheets[key]


def S(el, name):
    return sheet('vfx_' + el, name)


def beast(el):
    return sheet('vfx_beasts', el)


_pieces = {}


def piece(name, scale=1.0):
    key = (name, scale)
    if key not in _pieces:
        im = Image.open(os.path.join(REF, name + '.png')).convert('RGBA')
        if scale != 1.0:
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.NEAREST)
        _pieces[key] = im
    return _pieces[key]


# --- canvas -------------------------------------------------------------------------------

def mul_alpha(im, a):
    if a >= 0.999:
        return im
    im = im.copy()
    al = im.getchannel('A').point(lambda v: int(v * a))
    im.putalpha(al)
    return im


def paste(cv, im, x, y, alpha=1.0, clip_y=None):
    """Alpha-composites `im` with its top-left at map pixel (x, y); cv.org is the crop origin."""
    if alpha <= 0.003:
        return
    ox, oy = cv.org
    x, y = int(round(x - ox)), int(round(y - oy))
    w, h = im.size
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(cv.im.width, x + w), min(cv.im.height, y + h)
    if clip_y is not None:
        y1 = min(y1, int(round(clip_y - oy)))
    if x1 <= x0 or y1 <= y0:
        return
    part = im.crop((x0 - x, y0 - y, x1 - x, y1 - y))
    if alpha < 0.999:
        part = mul_alpha(part, alpha)
    cv.im.alpha_composite(part, (x0, y0))


def blit(cv, sh, anim, frame, x, y, mirror=False, alpha=1.0, scale=1.0, clip_y=None):
    im = sh.frame(anim, frame, mirror, scale)
    ax = (sh.fw - sh.ax) if mirror else sh.ax
    paste(cv, im, x - ax * scale, y - sh.ay * scale, alpha, clip_y)


class Canvas:
    def __init__(self, im, org):
        self.im, self.org = im, org


# --- background --------------------------------------------------------------------------

_ground = None
_backdrop = None


def background(crop):
    global _ground, _backdrop
    if _ground is None:
        _ground = Image.open(MAPDIR + '/ground.webp').convert('RGBA')
        _backdrop = Image.open(MAPDIR + '/backdrop.webp').convert('RGBA')
    x0, y0, w, h = crop
    bg = Image.new('RGBA', (w, h), (0x12, 0x22, 0x1f, 255))
    cv = Canvas(bg, (x0, y0))
    # The backdrop scrolls with parallax 0.3; its top sits at backY - 560 (mapArt.ts).
    paste(cv, _backdrop, round(x0 * 0.3), BACKY - 560)
    paste(cv, _ground, 0, 0)
    return bg


# --- characters ---------------------------------------------------------------------------

_cinfo = None
_cframes = {}
STILL = [False]
FEET = (128, 216)
STRIDE_RUN = 87 / 12


def cinfo():
    global _cinfo
    if _cinfo is None:
        _cinfo = json.load(open(CHARS + '/info.json'))
    return _cinfo


def cframe(key, i, mirror=False):
    n = cinfo()['poses'][key]['n']
    i = max(0, min(n - 1, i))
    k = (key, i, mirror)
    if k not in _cframes:
        im = Image.open(f'{CHARS}/{key}_{i}.png').convert('RGBA')
        if mirror:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        _cframes[k] = im
    return _cframes[k]


def cframe_raw(name, mirror=False):
    k = (name, mirror)
    if k not in _cframes:
        im = Image.open(f'{CHARS}/{name}.png').convert('RGBA')
        if mirror:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        _cframes[k] = im
    return _cframes[k]


class Unit:
    """A ninja on the timeline. Segments: (t0, kind, data). Kinds: idle, pose (one-shot or loop),
    run (move with gait), spin (pose with the facing flipped every `every` ms), hide."""

    def __init__(self, who, x, y, facing=1, idle_look=None, zbias=0.0):
        self.who, self.home, self.facing = who, (x, y), facing
        self.segs = [(-1e9, 'idle', {'x': x, 'y': y})]
        self.hurts = []
        # idle_look: the look idles use (e.g. 'aidenstow': after a seal jutsu the weapon stays stowed);
        # zbias: only for the depth sort (an effect can sit between two units on the same ground line)
        self.idle_look, self.zbias = idle_look, zbias

    def idle(self, t, x=None, y=None, facing=None):
        px, py = self.pos_at(t)
        self.segs.append((t, 'idle', {'x': px if x is None else x, 'y': py if y is None else y, 'facing': facing}))
        return self

    def pose(self, t, pose, look=None, loop=False, facing=None, dur=None, fps=None, burst=False):
        px, py = self.pos_at(t)
        self.segs.append((t, 'pose', {'pose': pose, 'look': look or self.who, 'x': px, 'y': py, 'loop': loop, 'facing': facing, 'fps': fps, 'burst': burst}))
        if dur is not None:
            self.idle(t + dur)
        return self

    def run(self, t0, t1, x1, y1):
        px, py = self.pos_at(t0)
        self.segs.append((t0, 'run', {'t1': t1, 'x0': px, 'y0': py, 'x1': x1, 'y1': y1}))
        self.segs.append((t1, 'idle', {'x': x1, 'y': y1}))
        return self

    def spin(self, t0, t1, pose, every=110):
        px, py = self.pos_at(t0)
        self.segs.append((t0, 'spin', {'pose': pose, 'x': px, 'y': py, 'every': every}))
        self.idle(t1)
        return self

    def hurt(self, t, pose=True):
        self.hurts.append(t)
        if pose:
            self.pose(t, 'hurt', dur=300)
        return self

    def seg_at(self, t):
        cur = self.segs[0]
        for s in sorted(self.segs, key=lambda s: s[0]):
            if s[0] <= t:
                cur = s
        return cur

    def pos_at(self, t):
        t0, kind, d = self.seg_at(t)
        if kind == 'run':
            u = min(1, max(0, (t - t0) / (d['t1'] - t0)))
            return d['x0'] + (d['x1'] - d['x0']) * u, d['y0'] + (d['y1'] - d['y0']) * u
        return d['x'], d['y']

    def draw(self, cv, t):
        t0, kind, d = self.seg_at(t)
        x, y = self.pos_at(t)
        facing = d.get('facing') or self.facing
        info = cinfo()['poses']
        burst = None
        if kind == 'idle':
            key = f'{self.idle_look or self.who}_idle'
            fr = int(max(0, t - t0) / 1000 * info[key]['fps']) % info[key]['n']
        elif kind == 'run':
            key = f'{self.who}_run'
            walked = math.hypot(x - d['x0'], y - d['y0'])
            fr = int(walked / STRIDE_RUN) % info[key]['n']
            facing = 1 if d['x1'] >= d['x0'] else -1
        elif kind == 'spin':
            key = f"{self.who}_{d['pose']}"
            fr = 1
            facing = 1 if int((t - t0) / d['every']) % 2 == 0 else -1
        else:
            key = f"{d['look']}_{d['pose']}"
            n = info[key]['n']
            fr = int(max(0, t - t0) / 1000 * (d.get('fps') or info[key]['fps']))
            fr = fr % n if d['loop'] else min(fr, n - 1)
            if d.get('burst') and d['pose'] == 'cast':
                # the chakra burst the battle draws on every cast (renderer.ts: tick = floor(now / 83))
                burst = f"aidenburst_cast_{fr}_{int(max(0, t - t0) / 83) % cinfo()['burst']['loop']}" 
        alpha = 1.0
        for h in self.hurts:
            if h <= t < h + 260 and int(t / 60) % 2 and not STILL[0]:
                alpha = 0.55
        # shadow
        sh = Image.new('RGBA', (42, 12), (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse((1, 1, 41, 11), fill=(0, 0, 0, 89))
        paste(cv, sh, x - 21, y - 7)
        im = cframe_raw(burst, facing < 0) if burst else cframe(key, fr, facing < 0)
        paste(cv, im, x - FEET[0], y - FEET[1], alpha)


# --- effects ------------------------------------------------------------------------------

class Fx:
    """A drawable on the timeline. depth: None = over everything (like the game's effects), a
    number = sorted with the units by ground y (map px), 'under' = right over the ground."""

    def __init__(self, fn, depth=None):
        self.fn, self.depth = fn, depth


def fade_alpha(u, fade):
    if fade and u > 1 - fade:
        return max(0.0, (1 - u) / fade)
    return 1.0


def play(sh, anim, t0, x, y, dur=None, mirror=False, fade=0.0, depth=None, scale=1.0, fade_in=0.0, clip_y=None, frame_ms=None):
    """One row of a sheet at (x, y), from t0 for dur ms (default: one pass of the row)."""
    if dur is None:
        dur = sh.ms(anim)

    def fn(cv, t):
        if t < t0 or t >= t0 + dur:
            return
        u = (t - t0) / dur
        a = fade_alpha(u, fade)
        if fade_in and t - t0 < fade_in:
            a *= (t - t0) / fade_in
        ms = t - t0 if frame_ms is None else frame_ms(t - t0)
        blit(cv, sh, anim, sh.frame_at(anim, ms), x, y, mirror, a, scale, clip_y)
    return Fx(fn, depth)


def seq(sh, rows, t0, x, y, end, mirror=False, fade_ms=0, depth=None, scale=1.0):
    """Rows one after another (e.g. a wall's rise then idle); the last row runs until `end`,
    fading out over its last fade_ms."""
    def cur(t):
        if t < t0 or t >= end:
            return None
        at = t - t0
        for i, (anim, d) in enumerate(rows):
            if d is None or at < d or i == len(rows) - 1:
                a = 1.0
                if fade_ms and t > end - fade_ms:
                    a = (end - t) / fade_ms
                return anim, sh.frame_at(anim, at), a
            at -= d

    def fn(cv, t):
        c = cur(t)
        if c:
            blit(cv, sh, c[0], c[1], x, y, mirror, c[2], scale)

    def image_at(t):
        """(image, left, top) in map px of what is drawn at t, for the cover rule."""
        c = cur(t)
        if not c:
            return None
        im = sh.frame(c[0], c[1], mirror, scale)
        ax = (sh.fw - sh.ax) if mirror else sh.ax
        return im, x - ax * scale, y - sh.ay * scale
    f = Fx(fn, depth)
    f.image_at = image_at
    return f


def follow(sh, anim, t0, dur, posfn, dx=0, dy=0, depth=None, fade=0.0, fade_in=0.0, mirror=False):
    """A sheet row drawn at posfn(t) (e.g. an aura on a running ninja)."""
    def fn(cv, t):
        if t < t0 or t >= t0 + dur:
            return
        u = (t - t0) / dur
        a = fade_alpha(u, fade)
        if fade_in and t - t0 < fade_in:
            a *= (t - t0) / fade_in
        x, y = posfn(t)
        blit(cv, sh, anim, sh.frame_at(anim, t - t0), x + dx, y + dy, mirror, a)
    return Fx(fn, depth)


def ease_io(t):
    return 2 * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 2 / 2


def ease_out(t):
    return 1 - (1 - t) ** 2


def fly(sh, anim, t0, dur, p0, p1, hump=30, ease=ease_io, mirror=False, depth=None, scale=1.0, alpha_fn=None):
    """A projectile from screen point p0 to p1 (lifts already applied), like the renderer's flight()."""
    def pos(t):
        u = min(1, max(0, (t - t0) / dur))
        e = ease(u)
        return p0[0] + (p1[0] - p0[0]) * e, p0[1] + (p1[1] - p0[1]) * e - math.sin(u * math.pi) * hump

    def fn(cv, t):
        if t < t0 or t >= t0 + dur:
            return
        x, y = pos(t)
        a = alpha_fn(t) if alpha_fn else 1.0
        blit(cv, sh, anim, sh.frame_at(anim, t - t0), x, y, mirror, a, scale)
    f = Fx(fn, depth)
    f.pos = pos
    return f


def flat_beam(el, L, frame, head=True, from_x=0):
    """The game's line beam laid out flat facing right, from 0 to the head at L (renderer.ts):
    tiles step back from the head a whole tile at a time, cut at the caster (x < from_x)."""
    tile, hd = S(el, 'stream'), S(el, 'stream_head')
    w = tile.fw
    pad = 80
    top = max(tile.ay, hd.ay) + 2
    H = top + max(tile.fh - tile.ay, hd.fh - hd.ay) + 2
    W = int(L) + hd.fw + 2 * pad
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    cv = Canvas(im, (-pad, -top))
    n = max(1, math.ceil(L / w))
    for k in range(n, 0, -1):
        blit(cv, tile, 'fly', frame, L - w * k, 0)
    arr = np.array(im)
    arr[:, :pad + int(from_x)] = 0
    im = Image.fromarray(arr)
    if head:
        cv2 = Canvas(im, (-pad, -top))
        blit(cv2, hd, 'fly', frame, L, 0)
    return im, (pad, top)


def shear_paste(cv, im, org, x, y, dx, dy, mirror=False, alpha=1.0, rotate=False):
    """Pastes a flat beam with its origin at (x, y), sheared so its far end lands at (x+dx, y+dy)
    (pixel columns stay upright, like the renderer's shallow slope) or turned onto a steep one."""
    run = -dx if mirror else dx
    if mirror:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
        org = (im.width - org[0], org[1])
    if not rotate and run > 0 and abs(dy) <= run:
        s = dy / run
        arr = np.array(im)
        h, w = arr.shape[:2]
        extra = int(abs(s) * w) + 2
        out = np.zeros((h + 2 * extra, w, 4), np.uint8)
        for c in range(w):
            rel = (c - org[0]) * (-1 if mirror else 1)
            off = int(round(rel * s)) + extra
            out[off:off + h, c] = arr[:, c]
        im2 = Image.fromarray(out)
        paste(cv, im2, x - org[0], y - org[1] - extra, alpha)
    else:
        ang = math.degrees(math.atan2(dy, dx if not mirror else -dx))
        if mirror:
            ang = -ang
        # pad so the origin is the image centre, then turn about it
        w, h = im.size
        cx, cy = org
        W2 = 2 * max(cx, w - cx)
        H2 = 2 * max(cy, h - cy)
        pad = Image.new('RGBA', (W2, H2), (0, 0, 0, 0))
        pad.paste(im, (W2 // 2 - cx, H2 // 2 - cy))
        r = pad.rotate(-ang, resample=Image.NEAREST, expand=True)
        paste(cv, r, x - r.width / 2, y - r.height / 2, alpha)


def beam(el, t0, p0, p1, grow, hold, fade, head=True, depth=None, tail=None, reach_fn=None, rotate=False):
    """A beam (the line jutsu's stream + head) from p0 that reaches p1 in `grow` ms, stays `hold`,
    then fades over `fade`. tail(t) -> fraction of the length already gone from the caster's end."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    mirror = dx < -0.5
    full = abs(dx) if (not rotate and abs(dy) <= abs(dx)) else math.hypot(dx, dy)

    def fn(cv, t):
        if t < t0 or t >= t0 + grow + hold + fade:
            return
        r = reach_fn(t) if reach_fn else min(1.0, (t - t0) / grow) if grow > 0 else 1.0
        if r <= 0.01:
            return
        a = 1.0 if t < t0 + grow + hold else max(0.0, 1 - (t - t0 - grow - hold) / fade)
        L = full * r
        frame = S(el, 'stream').frame_at('fly', t - t0)
        cut = tail(t) * L if tail else 0
        im, org = flat_beam(el, L, frame, head, cut)
        shear_paste(cv, im, org, p0[0], p0[1], dx * r, dy * r, mirror, a, rotate)
    return Fx(fn, depth)


# --- half size, baked (for the 0.5x options) ----------------------------------------------

def edge_colour(arr):
    """His outline colour: the colour of most silhouette-edge pixels, if one clearly dominates."""
    op = arr[..., 3] > 0
    inner = op.copy()
    inner[1:-1, 1:-1] = op[1:-1, 1:-1] & op[:-2, 1:-1] & op[2:, 1:-1] & op[1:-1, :-2] & op[1:-1, 2:]
    inner[0, :] = inner[-1, :] = inner[:, 0] = inner[:, -1] = False
    edge = op & ~inner
    if not edge.any():
        return None
    cols, cnt = np.unique(arr[edge][:, :3], axis=0, return_counts=True)
    k = cnt.argmax()
    return tuple(int(v) for v in cols[k]) if cnt[k] > 0.6 * edge.sum() else None


_halves = {}


def half(im):
    """Halves a piece of his art keeping only his colours: each 2x2 block takes its most frequent
    colour (ties: the one nearest the block's mean), a block is opaque when 2 of its 4 pixels are,
    and where his art has a 1 px outline the new silhouette edge gets his outline colour again."""
    key = id(im)
    if key in _halves:
        return _halves[key][1]
    a = np.array(im.convert('RGBA'))
    h, w = a.shape[:2]
    H2, W2 = (h + 1) // 2, (w + 1) // 2
    pad = np.zeros((H2 * 2, W2 * 2, 4), np.uint8)
    pad[:h, :w] = a
    out = np.zeros((H2, W2, 4), np.uint8)
    blocks = pad.reshape(H2, 2, W2, 2, 4).transpose(0, 2, 1, 3, 4).reshape(H2, W2, 4, 4)
    for y in range(H2):
        for x in range(W2):
            b = blocks[y, x]
            op = b[b[:, 3] > 0]
            if len(op) < 2:
                continue
            cols, cnt = np.unique(op, axis=0, return_counts=True)
            best = np.nonzero(cnt == cnt.max())[0]
            if len(best) > 1:
                mean = op[:, :3].mean(0)
                best = [min(best, key=lambda i: ((cols[i][:3].astype(float) - mean) ** 2).sum())]
            out[y, x] = cols[best[0]]
    oc = edge_colour(a)
    if oc is not None:
        op = out[..., 3] > 0
        nb = np.zeros_like(op)
        nb[1:, :] |= ~op[:-1, :]
        nb[:-1, :] |= ~op[1:, :]
        nb[:, 1:] |= ~op[:, :-1]
        nb[:, :-1] |= ~op[:, 1:]
        nb[0, :] = nb[-1, :] = True
        nb[:, 0] = nb[:, -1] = True
        e = op & nb
        out[e, :3] = oc
    res = Image.fromarray(out)
    _halves[key] = (im, res)
    return res


class HalfSheet(Sheet):
    """A sheet whose frames are halved with half() (his colours, his outline)."""

    def __init__(self, sh):
        super().__init__(sh.img, sh.fw, sh.fh, (sh.ax, sh.ay), sh.anims)
        self.src = sh
        self.fw, self.fh, self.ax, self.ay = (sh.fw + 1) // 2, (sh.fh + 1) // 2, sh.ax / 2, sh.ay / 2

    def frame(self, a, i, mirror=False, scale=1.0):
        an = self.anim(a)
        i = max(0, min(an['frames'] - 1, i))
        key = ('h', an['row'], i, mirror)
        if key not in self.cache:
            im = half(self.src.frame(a, i))
            self.cache[key] = im.transpose(Image.FLIP_LEFT_RIGHT) if mirror else im
        return self.cache[key]


# --- his dragon head on its own --------------------------------------------------------------

DRAGON = os.path.join(HERE, 'dragon')
FADE_U = [0.1, 0.19, 0.28, 0.37, 0.47, 0.6, 0.77, 1]


def fade_curve(burn, keys):
    pts = [burn] + keys
    out = []
    for u in FADE_U:
        f = u * (len(pts) - 1)
        j = min(len(pts) - 2, int(f))
        out.append(pts[j] + (pts[j + 1] - pts[j]) * (f - j))
    return out


JET_FADE = fade_curve(1, [0.55, 0.15, 0, 0, 0, 0])
_dart = {}


def dragon_art(scale):
    """His s_head / s_breath (dragon-head.ts: the head's 8 fade frames burnt by the generator's
    burnOut, the jet's 6 churn frames by breathJet's displace), at 1x or halved."""
    if scale not in _dart:
        ld = lambda n: Image.open(os.path.join(DRAGON, n + '.png')).convert('RGBA')
        art = {'head': ld('head'), 'fade': [ld(f'fade_{i}') for i in range(8)], 'jet': [ld(f'jet_{i}') for i in range(6)]}
        if scale == 0.5:
            art = {'head': half(art['head']), 'fade': [half(f) for f in art['fade']], 'jet': [half(f) for f in art['jet']]}
        elif scale != 1.0:
            raise ValueError('the head comes at 1x or 0.5x')
        s = scale
        art.update(mouth=(243 * s, 160 * s), jet_off=(round(268 * s), round(91 * s)), tip=(round(268 * s) + art['jet'][0].width, round((91 + 80) * s)))
        _dart[scale] = art
    return _dart[scale]


def cover_tops(cover, t, x0, x1):
    """Per map column x0..x1-1: the top of the covering flames (a seq Fx) at t (inf where none)."""
    tops = np.full(int(x1 - x0), np.inf)
    if cover is None:
        return tops
    got = cover.image_at(t)
    if not got:
        return tops
    im, left, top = got
    a = np.array(im)[..., 3] > 20
    has = a.any(0)
    first = np.where(has, a.argmax(0), -1)
    for c in range(int(x1 - x0)):
        cx = int(round(x0 + c - left))
        if 0 <= cx < a.shape[1] and first[cx] >= 0:
            tops[c] = top + first[cx]
    return tops


def dragon_head(t_in, rise_ms, t_out, mouth, scale=1.0, depth=None, clip_y=None, cover=None, jet_on=None,
                rise_px=None, moves=(), sink_px=None):
    """His fire-dragon head moved as one piece, as the generator moves it in annihilation_enh: it
    rises out of the flames (cut a little under their tops and kept sunk until they cover its cut
    neck), bobs 1-2 px in the burn, can lunge, and in the fade burns away (his Annihilation's own
    burnOut frames) while it sinks into the flames. His jet grows out of the mouth from jet_on (the
    generator's reach), churns, and shrinks with the fade. mouth = map point of his mouth."""
    art = dragon_art(scale)
    head = art['head']
    hw, hh = head.size
    mx, my = art['mouth']
    if rise_px is None:
        rise_px = hh * 0.6
    if sink_px is None:
        sink_px = 60 * scale
    neck = np.array(head)[-10:, :, 3].any(0).nonzero()[0]
    neck0, neck1 = int(neck.min()), int(neck.max()) + 1
    fade_ms = 8 * 1000 / 12

    def offset(t):
        ox, oy = 0.0, 0.0
        rising = t < t_in + rise_ms
        if rising:
            u = max(0.0, (t - t_in) / rise_ms)
            oy = (1 - u) ** 2 * rise_px
        ph = 2 * math.pi * (int(t / (1000 / 12)) % 6) / 6
        live = 0.5 if rising else 1.0
        ox += round(math.sin(ph + 3) * live)
        oy += round(1.5 * math.sin(ph + 3.4) * live)
        for (tm, dur, ddx, ddy) in moves:
            if t >= tm:
                e = ease_out(min(1.0, (t - tm) / dur))
                ox += ddx * e
                oy += ddy * e
        if t >= t_out:
            oy += sink_px * min(1.0, (t - t_out) / fade_ms)
        if rising and cover is not None:
            # never show the cut neck: stay sunk until the flames over it cover it
            bx = mouth[0] - mx + ox
            tops = cover_tops(cover, t, bx + neck0, bx + neck1)
            if np.isfinite(tops).any():
                need = np.nanmin(np.where(np.isfinite(tops), tops, np.nan)) + 12 - (mouth[1] - my + hh)
                oy = max(oy, need)
            else:
                oy = max(oy, hh + 20)
        return ox, oy

    def fn(cv, t):
        if t < t_in or t >= t_out + fade_ms:
            return
        ox, oy = offset(t)
        x = mouth[0] - mx + ox
        y = mouth[1] - my + oy
        if t >= t_out:
            im = art['fade'][min(7, int((t - t_out) / (1000 / 12)))]
        else:
            im = head
        if t < t_in + rise_ms and cover is not None:
            # rising: cut a ragged line a little under the flame tops (they hide where it comes from)
            tops = cover_tops(cover, t, x, x + hw)
            arr = np.array(im)
            fin = np.isfinite(tops)
            if fin.any():
                # (past the ends of the flames: the nearest flame column's line)
                idx = np.arange(hw)
                tops = np.interp(idx, idx[fin], tops[fin])
                for c in range(hw):
                    cut = int(tops[c] + 26 * scale - y + 4 * math.sin(c * 0.37))
                    if cut < hh:
                        arr[max(0, cut):, c, 3] = 0
            else:
                arr[..., 3] = 0
            im = Image.fromarray(arr)
        paste(cv, im, x, y, 1.0, clip_y)
        if jet_on is not None and t >= jet_on:
            if t < t_out:
                j = min(1.0, (int((t - jet_on) / (1000 / 12)) + 1) / 3)
            else:
                j = JET_FADE[min(7, int((t - t_out) / (1000 / 12)))]
            if j > 0.02:
                jet = art['jet'][int(t / (1000 / 12)) % 6]
                reach = int(min(1.0, j * 1.2) * (jet.width + 20 * scale))
                if reach < jet.width:
                    jet = jet.crop((0, 0, max(1, reach), jet.height))
                paste(cv, jet, x + art['jet_off'][0], y + art['jet_off'][1], 1.0, clip_y)
    f = Fx(fn, depth)
    f.mouth_at = lambda t: (mouth[0] + offset(t)[0], mouth[1] + offset(t)[1])
    f.tip_at = lambda t: (mouth[0] - mx + offset(t)[0] + art['tip'][0], mouth[1] - my + offset(t)[1] + art['tip'][1])
    return f


def placeholder(t0, dur, p0, p1, w, h, text, hump=30, depth=None, pic=None):
    """A dashed box for art that doesn't exist yet, flying like a beast; `pic` (his icon) inside."""
    box = Image.new('RGBA', (w, h), (40, 70, 30, 120))
    d = ImageDraw.Draw(box)
    for i in range(0, w, 8):
        d.line((i, 0, min(w - 1, i + 4), 0), fill=(255, 230, 120, 255), width=2)
        d.line((i, h - 2, min(w - 1, i + 4), h - 2), fill=(255, 230, 120, 255), width=2)
    for i in range(0, h, 8):
        d.line((0, i, 0, min(h - 1, i + 4)), fill=(255, 230, 120, 255), width=2)
        d.line((w - 2, i, w - 2, min(h - 1, i + 4)), fill=(255, 230, 120, 255), width=2)
    tx0 = 8
    if pic is not None:
        box.alpha_composite(pic, (6, (h - pic.height) // 2))
        tx0 = pic.width + 12
    f = font(14, True)
    lines = text.split('\n')
    y = h / 2 - len(lines) * 9
    for ln in lines:
        d.text((tx0, y), ln, font=f, fill=(255, 240, 180, 255))
        y += 18

    def fn(cv, t):
        if t < t0 or t >= t0 + dur:
            return
        u = (t - t0) / dur
        e = ease_io(u)
        x = p0[0] + (p1[0] - p0[0]) * e
        y = p0[1] + (p1[1] - p0[1]) * e - math.sin(u * math.pi) * hump
        paste(cv, box, x - w / 2, y - h / 2)
    return Fx(fn, depth)


# --- scenes -------------------------------------------------------------------------------

class Scene:
    def __init__(self, crop, t_end, L=None, t_start=0):
        self.crop = crop
        self.units = []
        self.fx = []
        self.L = L
        self.t_end = t_end
        self.t_start = t_start
        self._bg = None

    def unit(self, who, x, y, facing=1, idle_look=None, zbias=0.0):
        u = Unit(who, x, y, facing, idle_look, zbias)
        self.units.append(u)
        return u

    def add(self, *fx):
        self.fx.extend(fx)
        return fx[0] if len(fx) == 1 else fx

    def render(self, t):
        if self._bg is None:
            self._bg = background(self.crop)
        cv = Canvas(self._bg.copy(), (self.crop[0], self.crop[1]))
        for f in self.fx:
            if f.depth == 'under':
                f.fn(cv, t)
        items = [(u.pos_at(t)[1] + u.zbias, 1, i, u) for i, u in enumerate(self.units)]
        items += [(f.depth, 0, i, f) for i, f in enumerate(self.fx) if isinstance(f.depth, (int, float))]
        for _, kind, _, o in sorted(items, key=lambda q: (q[0], q[1], q[2])):
            if kind == 1:
                o.draw(cv, t)
            else:
                o.fn(cv, t)
        for f in self.fx:
            if f.depth is None:
                f.fn(cv, t)
        return cv.im

    def label(self, t):
        t = int(round(t))
        if self.L is None or t < self.L:
            return f'{t} ms'
        if t == self.L:
            return 'L'
        return f'L+{t - self.L} ms'


def up(im, k=K):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


# --- outputs ------------------------------------------------------------------------------

BG = (22, 20, 30)
INK = (240, 236, 226)
GOLD = (250, 214, 110)
DIM = (170, 166, 180)
GREEN = (140, 230, 150)


def wrap(text, f, width, draw):
    words, lines, cur = text.split(), [], ''
    for w in words:
        nxt = (cur + ' ' + w).strip()
        if draw.textlength(nxt, font=f) <= width:
            cur = nxt
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


MAXW = 2400


def strip_scale(crop_w, gap=24):
    """2x when two frames fit side by side in MAXW, else 1x (the game's normal zoom)."""
    return 2 if 2 * (crop_w * 2 + gap) + gap <= MAXW else 1


def strip(path, title, subtitle, rows, icon=None):
    """rows: dicts with label, rec (bool), desc, scene, keys [(t, caption)]. The frames go in a grid
    no wider than MAXW px, at 2x (or 1x for wide scenes), each with its time and caption."""
    tmp = Image.new('RGB', (10, 10))
    dr = ImageDraw.Draw(tmp)
    gap = 24
    k = strip_scale(rows[0]['scene'].crop[2], gap)
    blocks = []
    for r in rows:
        sc = r['scene']
        fw, fh = sc.crop[2] * k, sc.crop[3] * k
        STILL[0] = True
        frames = [up(sc.render(t), k) for t, _ in r['keys']]
        STILL[0] = False
        blocks.append((r, fw, fh, frames))
    fw0 = blocks[0][1]
    cols = max(1, (MAXW - gap) // (fw0 + gap))
    width = MAXW
    capf, msf = font(38), font(46, True)
    out_rows = []
    for r, fw, fh, frames in blocks:
        head_lines = wrap(r['desc'], font(44), width - 2 * gap, dr) if r.get('desc') else []
        cap_lines = [wrap(c, capf, fw - 20, dr) for _, c in r['keys']]
        n = len(frames)
        grid_rows = [list(range(i, min(n, i + cols))) for i in range(0, n, cols)]
        cell_h = [fh + 70 + max(len(cap_lines[i]) for i in gr) * 46 + 30 for gr in grid_rows]
        h = 100 + len(head_lines) * 56 + 20 + sum(cell_h) + 20
        im = Image.new('RGB', (width, h), BG)
        d = ImageDraw.Draw(im)
        lab = r['label'] + ('  (recomendada)' if r.get('rec') else '')
        d.text((gap, 20), lab, font=font(68, True), fill=GOLD if r.get('rec') else INK)
        if r.get('tag'):
            lw = d.textlength(lab, font=font(68, True))
            d.text((gap + lw + 40, 34), '· ' + r['tag'], font=font(46, True), fill=(255, 140, 130))
        y = 110
        for ln in head_lines:
            d.text((gap, y), ln, font=font(44), fill=DIM)
            y += 56
        y += 20
        for gr, ch in zip(grid_rows, cell_h):
            for j, i in enumerate(gr):
                x = gap + j * (fw + gap)
                im.paste(frames[i], (x, y))
                d.rectangle((x - 2, y - 2, x + fw + 1, y + fh + 1), outline=(90, 86, 110), width=2)
                t, cap = r['keys'][i]
                d.text((x + 6, y + fh + 14), r['scene'].label(t), font=msf, fill=GOLD)
                yy = y + fh + 72
                for ln in cap_lines[i]:
                    d.text((x + 6, yy), ln, font=capf, fill=INK)
                    yy += 46
            y += ch
        out_rows.append(im)
    sub_lines = wrap(subtitle, font(42), width - 2 * gap - 200, dr) if subtitle else []
    th = max(40 + 120 + len(sub_lines) * 52 + 30, 24 + 176 + 30)
    total = th + sum(i.height for i in out_rows)
    out = Image.new('RGB', (width, total), BG)
    d = ImageDraw.Draw(out)
    tx = gap
    if icon and os.path.exists(icon):
        ic = Image.open(icon).convert('RGBA')
        ic = ic.resize((ic.width * 2, ic.height * 2), Image.NEAREST)
        out.paste(ic, (gap, 24), ic)
        d.text((gap, 24 + ic.height + 2), 'tu icono', font=font(30), fill=DIM)
        tx = gap + ic.width + 30
    d.text((tx, 26), title, font=font(100, True), fill=INK)
    yy = 150
    for ln in sub_lines:
        d.text((tx, yy), ln, font=font(42), fill=DIM)
        yy += 52
    y = th
    for im in out_rows:
        d.line((0, y, width, y), fill=(70, 66, 90), width=4)
        out.paste(im, (0, y))
        y += im.height
    out.save(path, optimize=True)
    return out


def gif(path, scene, title, step=50, hold_end=500, colors=256):
    """The option at real speed: a frame every `step` ms, a title bar with the time."""
    tmpd = path + '.frames'
    shutil.rmtree(tmpd, ignore_errors=True)
    os.makedirs(tmpd)
    t = scene.t_start
    i = 0
    bar = 64
    times = []
    while t <= scene.t_end + hold_end:
        times.append(t)
        t += step
    for t in times:
        fr = up(scene.render(min(t, scene.t_end + hold_end)))
        im = Image.new('RGB', (fr.width, fr.height + bar), BG)
        im.paste(fr, (0, bar))
        d = ImageDraw.Draw(im)
        lab = scene.label(t)
        # narrow GIFs: shrink the title until it clears the time on the right
        size = 36
        while size > 18 and d.textlength(title, font=font(size, True)) + d.textlength('L+0000 ms', font=font(size, True)) + 46 > fr.width:
            size -= 2
        d.text((14, 32 - size * 0.6), title, font=font(size, True), fill=INK)
        tw = d.textlength(lab, font=font(size, True))
        d.text((fr.width - tw - 16, 32 - size * 0.6), lab, font=font(size, True), fill=GOLD)
        im.save(f'{tmpd}/f{i:04d}.png')
        i += 1
    fps = 1000 / step
    pal = tmpd + '/pal.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', f'{tmpd}/f%04d.png',
                    '-vf', f'palettegen=max_colors={colors}:stats_mode=full', pal], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', f'{tmpd}/f%04d.png', '-i', pal,
                    '-lavfi', 'paletteuse=dither=none:diff_mode=rectangle', '-loop', '0', path], check=True)
    shutil.rmtree(tmpd, ignore_errors=True)
    return os.path.getsize(path)
