"""Animated previews on a crop of the real battle ground, zoom 2x, small Spanish labels, every role
except the beast, in two GIFs per element (one GIF with all of them is ~11 MB because disposal=2
needs full frames):
  NN-<elem>.gif                       proyectil, esfera, corte, múltiple, impacto, aliento, chorro (1 s loop)
  NN-<elem>-explosion-muro-aura.gif   explosión, muro, aura (3 s loop)
Each role runs at its own manifest fps: the GIF frames are the moments where any role changes
frame (timeline in 10 ms steps, the GIF delay unit; changes closer than 20 ms are merged), so a
12 fps loop shows 90/80/80 ms frames on average 83.3. Hit and blast play once and hold their last
frame (hit 600 ms, blast ~530 ms); the wall rises once and then idles. Each loop length is a whole
number of cycles of every looping role in it."""
import os
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/06-09-tierra-genjutsu-chakra-veneno')
from lib import *

K = 2
HIT_CYCLE = 1000              # 6 frames @15 fps = 400 ms, then hold 600 ms
BLAST_CYCLE = 1200            # 8 frames @12 fps = 667 ms, then hold ~533 ms
MIN_DELAY = 20                # ms
CUR_T = [3000]                # loop length of the GIF being built
M, G, LB, TT = 6, 6, 12, 18      # 1x units: margin, gap, label slot, title strip
GX0, GY0 = 40, 400            # top-left of the plain grass used (ground.webp, 1x)
GC = int(os.environ.get('GC', '10'))     # colours kept for the grass
CHAR, CF = character()

LABELS = dict(bolt='Proyectil', sphere='Esfera', slash='Corte', multi='Múltiple', hit='Impacto (1 vez)',
              breath='Aliento', stream='Chorro (3 tramos + cabeza)', aura='Aura',
              blast='Explosión (1 vez)', wall='Muro (sube y queda)')


GROUPS = {
    # file suffix, roles drawn, loop length (ms), subtitle
    'a': dict(suffix='', roles=['bolt', 'sphere', 'slash', 'multi', 'hit', 'breath', 'stream'], T=1000,
              sub='proyectiles, impacto, aliento y chorro · zoom 2x · velocidad real'),
    'b': dict(suffix='-explosion-muro-aura', roles=['blast', 'wall', 'aura'], T=2400,
              sub='explosión, muro y aura · zoom 2x · velocidad real'),
}


# grass margin around each sprite frame (left, top, right, bottom, 1x): wide enough that a sprite
# cut flat by its own frame border shows that cut on the grass, as it would in the game
PADS = {'a': (6, 6, 6, 6), 'blast': (4, 14, 4, 4), 'b': (4, 4, 4, 4)}


def pad(grp, r):
    return PADS.get(r, PADS[grp])


def layout(el, grp):
    """cells: role -> (x, y, w, h, (pl, pt, pr, pb)) at 1x, page coordinates; the sprite frame
    sits at (x + pl, y + pt)."""
    c = {}
    fw = lambda r: spec(el, r)['frameW']
    fh = lambda r: spec(el, r)['frameH']

    def cell(r, x, y, w, h):
        p = pad(grp, r)
        c[r] = (x, y, w + p[0] + p[2], h + p[1] + p[3], p)
        return c[r]
    y1 = TT + 4 + LB
    if grp == 'a':
        x = M
        for r in ['bolt', 'sphere', 'slash', 'multi', 'hit']:
            x += cell(r, x, y1, fw(r), fh(r))[2] + G
        y2 = y1 + c['bolt'][3] + LB + G
        cell('breath', M, y2, fw('breath'), 64)
        cell('stream', M + c['breath'][2] + G, y2, 192 + 64 - spec(el, 'stream_head')['anchor'][0], 64)
        W = max(x - G, c['stream'][0] + c['stream'][2]) + M
        H = y2 + c['stream'][3] + M
    else:
        cell('blast', M, y1, fw('blast'), fh('blast'))
        cell('wall', M + c['blast'][2] + G, y1, fw('wall') + 2 + CHAR.width, fh('wall'))
        cell('aura', c['wall'][0] + c['wall'][2] + G, y1, fw('aura'), fh('aura'))
        W = c['aura'][0] + c['aura'][2] + M
        H = y1 + max(v[3] for v in c.values()) + M
    return c, W, H


def state(el, role, t):
    """(anim, frame) shown at time t (ms) for a role."""
    s = spec(el, role)
    if role == 'wall':
        r, i = s['anims']['rise'], s['anims']['idle']
        rise_ms = r['frames'] * 1000 // r['fps']
        if t < rise_ms:
            return 'rise', t * r['fps'] // 1000
        k = (t - rise_ms) * i['fps'] // 1000
        # no sliver of a frame just before the loop restarts: the last whole idle frame stays
        kmax = (CUR_T[0] - rise_ms) * i['fps'] // 1000 - 1
        return 'idle', min(k, kmax) % i['frames']
    an, a = anim(el, role)
    if a['loop']:
        return an, (t * a['fps'] // 1000) % a['frames']
    cyc = HIT_CYCLE if role == 'hit' else BLAST_CYCLE
    return an, min((t % cyc) * a['fps'] // 1000, a['frames'] - 1)


def timeline(el, roles, T):
    """[(t0, duration_ms)] of GIF frames: one per change of any role's frame, on a 10 ms grid."""
    roles = roles + (['stream_head'] if 'stream' in roles else [])
    ev = []
    prev = None
    for t in range(0, T, 10):
        s = tuple(state(el, r, t) for r in roles)
        # browsers show GIF delays under 20 ms as 100 ms, so two changes closer than 20 ms are
        # shown together (the later one at most 10 ms late)
        if s != prev and (not ev or t - ev[-1] >= MIN_DELAY):
            ev.append(t)
            prev = s
    while T - ev[-1] < MIN_DELAY:
        ev.pop()
    return [(t, (ev[i + 1] if i + 1 < len(ev) else T) - t) for i, t in enumerate(ev)]


def base(el, c, W, H):
    """background: dark page, grass inside every cell (one continuous ground seen through the cells)."""
    g = ground().crop((GX0, GY0, GX0 + W, GY0 + H)).convert('RGB')
    g = g.quantize(colors=GC, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    im = Image.new('RGBA', (W, H), BG)
    for r, (x, y, w, h, p) in c.items():
        im.paste(g.crop((x, y, x + w, y + h)), (x, y))
    return im, g


def frame_1x(el, c, W, H, bg, t):
    im = bg.copy()
    for r in ['bolt', 'sphere', 'slash', 'multi', 'hit', 'breath', 'blast']:
        if r not in c:
            continue
        x, y = c[r][0] + c[r][4][0], c[r][1] + c[r][4][1]
        an, f = state(el, r, t)
        im.alpha_composite(frame(el, r, an, f), (x, y))
    if 'stream' in c:
        draw_stream(el, c, im, t)
    if 'aura' in c:
        draw_aura(el, c, im, t)
    if 'wall' in c:
        draw_wall(el, c, im, t)
    return im


def draw_stream(el, c, im, t):
    # stream: 3 tiles, head anchored on the end of the line (as the game draws it)
    x, y = c['stream'][0] + c['stream'][4][0], c['stream'][1] + c['stream'][4][1]
    an, f = state(el, 'stream', t)
    for k in range(3):
        im.alpha_composite(frame(el, 'stream', an, f), (x + 64 * k, y))
    an, f = state(el, 'stream_head', t)
    ha = spec(el, 'stream_head')['anchor']
    im.alpha_composite(frame(el, 'stream_head', an, f), (x + 192 - ha[0], y))


def draw_aura(el, c, im, t):
    # aura: drawn over the character, as the battle renderer does (effects after units)
    x, y = c['aura'][0] + c['aura'][4][0], c['aura'][1] + c['aura'][4][1]
    ax, ay = spec(el, 'aura')['anchor']
    im.alpha_composite(CHAR, (x + ax - CF[0], y + ay - CF[1]))
    an, f = state(el, 'aura', t)
    im.alpha_composite(frame(el, 'aura', an, f), (x, y))


def draw_wall(el, c, im, t):
    # wall + character on its ground line, to its right
    x, y = c['wall'][0] + c['wall'][4][0], c['wall'][1] + c['wall'][4][1]
    s = spec(el, 'wall')
    an, f = state(el, 'wall', t)
    im.alpha_composite(frame(el, 'wall', an, f), (x, y))
    im.alpha_composite(CHAR, (x + s['frameW'] + 2, y + s['anchor'][1] - CF[1]))


def decorate(el, im2, c, W, sub):
    E = ELEMS[el]
    d = ImageDraw.Draw(im2)
    d.rectangle([0, 0, W * K, TT * K - 1], fill=BAR)
    t1 = f"{E['num']} · {E['es']}"
    text(d, (12, 8), t1, 18, E['accent'], True)
    text(d, (12 + text_w(t1, 18, True) + 14, 11), sub, 14, GREY)
    for r, lab in LABELS.items():
        if r not in c:
            continue
        x, y = c[r][0], c[r][1]
        text(d, (x * K + 2, y * K - LB * K + 4), lab, 13, WHITE, True)
    return im2


def palette_for(frames, reserve):
    """One global palette: every colour in `reserve` exactly (most used first if > 216),
    the remaining slots median-cut from the other colours (semi-transparent blends, text AA)."""
    key = lambda a: (a[..., 0].astype(np.int64) << 16) | (a[..., 1].astype(np.int64) << 8) | a[..., 2]
    allk = np.concatenate([key(np.asarray(f)[::2, ::2]).ravel() for f in frames])
    uk, cnt = np.unique(allk, return_counts=True)
    freq = dict(zip(uk.tolist(), cnt.tolist()))
    res = [k for k in set(reserve) if k in freq]
    res.sort(key=lambda k: -freq[k])
    res = res[:216]
    rs = set(res)
    rest = uk[[k not in rs for k in uk.tolist()]]
    rc = cnt[[k not in rs for k in uk.tolist()]]
    nfree = 256 - len(res)
    if len(rest) <= nfree:
        extra = rest.tolist()
    else:
        reps = np.repeat(rest, np.minimum(rc, 200))
        arr = np.stack([(reps >> 16) & 255, (reps >> 8) & 255, reps & 255], -1).astype(np.uint8).reshape(-1, 1, 3)
        q = Image.fromarray(arr).quantize(colors=nfree, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        qp = np.array(q.getpalette()[:nfree * 3]).reshape(-1, 3)
        extra = ((qp[:, 0] << 16) | (qp[:, 1] << 8) | qp[:, 2]).tolist()
    pal = []
    for k in res + extra:
        pal += [(k >> 16) & 255, (k >> 8) & 255, k & 255]
    pal += pal[:3] * ((768 - len(pal)) // 3)
    pi = Image.new('P', (1, 1))
    pi.putpalette(pal[:768])
    return pi, len(res), len(uk)


def build(el, grp):
    E = ELEMS[el]
    GR = GROUPS[grp]
    c, W, H = layout(el, grp)
    bg, g = base(el, c, W, H)
    CUR_T[0] = GR['T']
    tl = timeline(el, GR['roles'], GR['T'])
    big = []
    for t, dur in tl:
        big.append(decorate(el, up(frame_1x(el, c, W, H, bg, t), K), c, W, GR['sub']).convert('RGB'))
    # reserved exact colours: UI, grass, every opaque sprite and character colour
    key1 = lambda col: (col[0] << 16) | (col[1] << 8) | col[2]
    reserve = [key1(col) for col in (BG, BAR, WHITE, GREY, E['accent'])]
    reserve += [key1(col) for col in set(map(tuple, np.asarray(g.convert('RGB')).reshape(-1, 3).tolist()))]
    a = np.asarray(CHAR)
    reserve += [key1(col) for col in set(map(tuple, a[a[..., 3] == 255][:, :3].tolist()))]
    for n in GR['roles'] + (['stream_head'] if 'stream' in GR['roles'] else []):
        a = np.asarray(sheet(el, n))
        reserve += [key1(col) for col in set(map(tuple, a[a[..., 3] == 255][:, :3].tolist()))]
    pi, nres, nuniq = palette_for(big, reserve)
    pf = [b.quantize(palette=pi, dither=Image.Dither.NONE) for b in big]
    path = OUT + E['file'] + GR['suffix'] + '.gif'
    durs = [d for _, d in tl]
    pf[0].save(path, save_all=True, append_images=pf[1:], duration=durs, loop=0, disposal=2, optimize=False)
    print(path, f'{os.path.getsize(path) / 1e6:.2f} MB', big[0].size, 'frames', len(pf), 'total ms', sum(durs),
          'reserved', nres, 'of', len(set(reserve)), 'unique', nuniq)
    check_timing(el, GR, tl)
    return path, tl, big


def check_timing(el, GR, tl):
    """print, per role, how long each sprite frame is on screen in the GIF (ms)."""
    roles = GR['roles'] + (['stream_head'] if 'stream' in GR['roles'] else [])
    for r in roles:
        runs = []
        for t, d in tl:
            st = state(el, r, t)
            if runs and runs[-1][0] == st:
                runs[-1][1] += d
            else:
                runs.append([st, d])
        if len(runs) > 1 and runs[0][0] == runs[-1][0]:      # wraps around the loop
            runs[0][1] += runs.pop()[1]
        desc = ', '.join(f'{st[0]}{st[1]}={d}' for st, d in runs)
        print(f'   {r:12s} {desc}')


if __name__ == '__main__':
    els = [a for a in sys.argv[1:] if a in ELEMS] or list(ELEMS)
    grps = [a for a in sys.argv[1:] if a in GROUPS] or list(GROUPS)
    for el in els:
        for grp in grps:
            build(el, grp)
