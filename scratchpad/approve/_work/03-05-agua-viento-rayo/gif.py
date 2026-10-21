import sys, os
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/03-05-agua-viento-rayo')
from lib import *
from info import *
import numpy as np

K = 2
CHAR = Image.open(WORK + 'char_1x.png').convert('RGBA')
CF = (26, 95)
GX0, GY0 = 0, 382           # plain grass between the tree line and the dirt road
FPS = 12
N = 24                       # 2 s loop: every 4- and 6-frame loop wraps cleanly
HOLD = 7                     # one-shots hold their last frame 7 ticks (~580 ms)
M, LB, TT = 10, 13, 18
GC = int(os.environ.get('GC', '32'))   # colours kept for the grass       # margin, label slot, title strip (1x units)


def layout():
    """cells: name -> (x, y) top-left of the sprite frame at 1x (page coords)."""
    c = {}
    G = 14
    y = TT + 8 + LB
    x = M
    for r in ['bolt', 'sphere', 'slash', 'multi', 'hit']:
        c[r] = (x, y)
        x += 64 + G
    y += 64 + 8 + LB
    c['breath'] = (M, y)
    c['stream'] = (M + 96 + G, y)
    y += 64 + 8 + LB
    c['blast'] = (M, y)
    c['char_blast'] = (M + 176 + 4, y)
    c['aura'] = (M + 176 + 4 + 56 + 20, y + 4)
    y += 128 + 8 + LB
    c['wall'] = (M, y)
    c['char_wall'] = (M + 264 + 4, y)
    W = M + 5 * 64 + 4 * G + M
    H = y + 120 + 8
    return c, W, H


def state(role, i):
    """(anim, frame) or None for tick i"""
    if role == 'hit' or role == 'blast':
        an = role
        n = 6 if role == 'hit' else 8
        if i < n:
            return an, i
        if i < n + HOLD:
            return an, n - 1
        return None
    if role == 'wall':
        return ('rise', i) if i < 6 else ('idle', (i - 6) % 4)
    if role == 'aura':
        return 'idle', i % 6
    return 'fly', i % 4


def frames_1x(el, c, W, H):
    g = ground().crop((GX0, GY0, GX0 + W, GY0 + H - TT)).convert('RGB')
    g = g.quantize(colors=GC, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    out = []
    for i in range(N):
        im = Image.new('RGBA', (W, H), BG)
        im.paste(g, (0, TT))
        # characters (behind effects)
        ax, ay = spec(el, 'aura')['anchor']
        x, y = c['aura']
        im.alpha_composite(CHAR, (x + ax - CF[0], y + ay - CF[1]))
        for key, role in (('char_blast', 'blast'), ('char_wall', 'wall')):
            ax, ay = spec(el, role)['anchor']
            x, y = c[key]
            im.alpha_composite(CHAR, (x, y + ay - CF[1]))
        for role in ['bolt', 'sphere', 'slash', 'multi', 'hit', 'breath', 'aura', 'blast', 'wall']:
            st = state(role, i)
            if st is None:
                continue
            im.alpha_composite(frame(el, role, st[0], st[1]), c[role])
        x, y = c['stream']
        f = i % 4
        for k in range(3):
            im.alpha_composite(frame(el, 'stream', 'fly', f), (x + 64 * k, y))
        im.alpha_composite(frame(el, 'stream_head', 'fly', f), (x + 192, y))
        out.append(im)
    return out


LABELS = dict(bolt='Proyectil', sphere='Esfera', slash='Corte', multi='Múltiple', hit='Impacto (1 vez)',
              breath='Aliento', stream='Chorro (3 tramos + cabeza)', aura='Aura',
              blast='Explosión (1 vez, 3 m)', wall='Muro (sube y queda en bucle)')


def decorate(el, im2, c, W):
    E = ELEMS[el]
    d = ImageDraw.Draw(im2)
    d.rectangle([0, 0, W * K, TT * K - 1], fill=BAR)
    text(d, (10, 8), f"{E['num']} · {E['es']}", 16, E['accent'], True)
    tw = text_w(f"{E['num']} · {E['es']}", 16, True)
    sub = 'en el suelo del mapa del río · zoom 2x · 12 fps · sin bestias'
    if E.get('gif_state'):
        sub = E['gif_state'] + ' · ' + sub
    text(d, (10 + tw + 12, 10), sub, 14, GREY)
    for role, lab in LABELS.items():
        x, y = c[role]
        tx, ty = x * K, y * K - LB * K + 2
        w = text_w(lab, 13, True)
        d.rectangle([tx, ty, tx + w + 12, ty + 20], fill=BG)
        text(d, (tx + 6, ty + 3), lab, 13, WHITE, True)
    return im2


def durations(n, fps):
    t = [round(i * 1000 / fps / 10) * 10 for i in range(n + 1)]
    return [t[i + 1] - t[i] for i in range(n)]


def build(el):
    c, W, H = layout()
    fr = frames_1x(el, c, W, H)
    big = [decorate(el, up(f, K), c, W).convert('RGB') for f in fr]
    # ---- one palette for all frames: keep every exact sprite / character / label colour,
    # fill the rest with the grass and the semi-transparent blends (median cut)
    res = set()
    for n, s in man(el).items():
        if n == 'beast':
            continue
        a = np.array(sheet(el, n))
        res |= set(map(tuple, a[a[:, :, 3] == 255][:, :3].tolist()))
    a = np.array(CHAR)
    res |= set(map(tuple, a[a[:, :, 3] == 255][:, :3].tolist()))
    for col in (BG, BAR, WHITE, GREY, ELEMS[el]['accent']):
        res.add(tuple(col[:3]))
    gq = np.array(fr[0].convert('RGB'))[TT:]
    gcols = set(map(tuple, np.array(ground().crop((GX0, GY0, GX0 + W, GY0 + H - TT)).convert('RGB').quantize(
        colors=GC, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')).reshape(-1, 3).tolist()))
    res |= gcols
    res = sorted(res)
    key = lambda arr: (arr[..., 0].astype(np.int64) << 16) | (arr[..., 1].astype(np.int64) << 8) | arr[..., 2]
    rk = np.array([(r << 16) | (g << 8) | b for r, g, b in res], dtype=np.int64)
    rest = []
    for b in big:
        arr = np.array(b)[::2, ::2]
        flat = arr.reshape(-1, 3)
        m_ = ~np.isin(key(flat), rk)
        rest.append(flat[m_])
    rest = np.concatenate(rest)
    kfree = 256 - len(res)
    assert kfree > 40, len(res)
    rim = Image.fromarray(rest.reshape(-1, 1, 3).astype(np.uint8))
    q = rim.quantize(colors=kfree, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    gp = q.getpalette()[:kfree * 3]
    pal = [v for col in res for v in col] + gp
    pal += [0] * (768 - len(pal))
    palimg = Image.new('P', (1, 1))
    palimg.putpalette(pal)
    pframes = [b.quantize(palette=palimg, dither=Image.Dither.NONE) for b in big]
    path = OUT + ELEMS[el]['file'] + '.gif'
    pframes[0].save(path, save_all=True, append_images=pframes[1:], duration=durations(N, FPS),
                    loop=0, disposal=2, optimize=False)
    # contact sheet of chosen frames (1x copies of the 2x GIF frames, read back from the file)
    g = Image.open(path)
    sel = [0, 2, 4, 6, 8, 11, 14, 18]
    tiles = []
    for k in sel:
        g.seek(k)
        tiles.append(g.convert('RGB'))
    tw_, th_ = tiles[0].size
    cs = Image.new('RGB', (tw_ * 2 + 10, th_ * 4 + 30), (60, 60, 60))
    for j, t in enumerate(tiles):
        cs.paste(t, ((j % 2) * (tw_ + 10), (j // 2) * (th_ + 10)))
    cs.save(WORK + f'cs_{el}.png')
    print(path, os.path.getsize(path) / 1e6, 'MB', big[0].size, 'reserved', len(res), 'free', kfree, 'n', g.n_frames)


if __name__ == '__main__':
    for el in (sys.argv[1:] or ['water', 'wind', 'lightning']):
        build(el)
