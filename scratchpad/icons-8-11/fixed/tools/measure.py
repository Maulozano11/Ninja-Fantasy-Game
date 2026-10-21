"""measure.py <dir> [<dir>...]: the review's 15 defects measured on ours (each dir) and on his reductions
(his crop window box-reduced to 88 and 44 with PIL, as the reviewer did). One line per defect and size."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import numpy as np
import m

DIRS = sys.argv[1:]


def band(a, Lr=(0, 1), Cr=(0, 1), Hr=(0, 360)):
    L, C, H = m.lch(a)
    hm = (H >= Hr[0]) & (H <= Hr[1]) if Hr[0] <= Hr[1] else (H >= Hr[0]) | (H <= Hr[1])
    return (L >= Lr[0]) & (L <= Lr[1]) & (C >= Cr[0]) & (C <= Cr[1]) & hm


def sub(a, box):
    x0, y0, x1, y1 = box
    return a[y0:y1, x0:x1]


SKIN = dict(Lr=(0.35, 1), Cr=(0.03, 0.2), Hr=(15, 85))
LAV = dict(Lr=(0.3, 1), Cr=(0.02, 1), Hr=(250, 340))


def cols(a, box):
    """The distinct colours of a region, most frequent first (hex)."""
    r = sub(a, box).reshape(-1, 3).astype(int)
    u, c = np.unique(r, axis=0, return_counts=True)
    o = np.argsort(-c)
    return ' '.join('%s×%d' % (m.hexc(u[i]), c[i]) for i in o[:6])


def row(label, f, sizes=(88, 44)):
    """f(a, n) -> str for his reduction and each dir."""
    for n in sizes:
        out = ['his: ' + f(None, n, True)]
        for d in DIRS:
            try:
                v = f(d, n, False)
            except FileNotFoundError:
                v = 'n/a'
            out.append('%s: %s' % (d.rstrip('/').split('/')[-1], v))
        print('  %-3d %s' % (n, ' | '.join(out)))


def get(jid, d, n, hisflag):
    return m.his(jid, n) if hisflag else m.ours(jid, n, d)


def D(num, title):
    print('D%d %s' % (num, title))


# 1 shadow_clone: skin (his hands, eye slits) vs grey
D(1, 'shadow_clone: skin pixels (front hands | clone hands | whole)')
def f1(d, n, h):
    a = get('shadow_clone', d, n, h)
    k = n / 88
    fr = [int(v * k) for v in (14, 29, 25, 43)]
    cl = [int(v * k) for v in (68, 27, 79, 41)]
    return '%d | %d | %d' % (band(sub(a, fr), **SKIN).sum(), band(sub(a, cl), **SKIN).sum(), band(a, **SKIN).sum())
row('', f1)

D(2, 'northstar_submission: violet % (hue 300-345, C>=0.08, L>=0.3)')
row('', lambda d, n, h: '%.2f%%' % (band(get('northstar_submission', d, n, h), Lr=(0.3, 1), Cr=(0.08, 1), Hr=(300, 345)).mean() * 100))

D(3, 'northstar_submission: star (L>=0.45 in 88-box 26,2,64,31): pale-pink share (L>=0.7, C<=0.17) | crimson share (L 0.45-0.62, C>=0.19, hue 20-32) | raspberry share (hue 8-19.99, C>=0.15)')
def f3(d, n, h):
    a = get('northstar_submission', d, n, h)
    k = n / 88
    s = sub(a, [int(v * k) for v in (26, 2, 64, 31)])
    L, C, H = m.lch(s)
    star = L >= 0.45
    t = star.sum()
    return '%.0f%% / %.0f%% / %.0f%%' % ((band(s, Lr=(0.7, 1), Cr=(0, 0.17)) & star).sum() / t * 100, (band(s, Lr=(0.45, 0.62), Cr=(0.19, 1), Hr=(20, 32)) & star).sum() / t * 100, (band(s, Cr=(0.15, 1), Hr=(8, 19.99)) & star).sum() / t * 100)
row('', f3)

D(4, 'ryusei_warp: skin / lavender pixels in eye slit (88: 55-63,24-29) | hand (40-47,40-47) | kunai grip (22-30,49-61)')
def f4(d, n, h):
    a = get('ryusei_warp', d, n, h)
    k = n / 88
    out = []
    for b in ((55, 24, 63, 29), (40, 40, 47, 47), (22, 49, 30, 61)):
        bb = [int(round(v * k)) for v in b]
        s = sub(a, bb)
        out.append('%d/%d' % (band(s, **SKIN).sum(), band(s, **LAV).sum()))
    return ' | '.join(out)
row('', f4)

D(5, 'ryusei_swap: faces: skin / blue-grey pixels, left slit (88: 9-17,24-28) | right slit (88: 72-80,24-28)')
def f5(d, n, h):
    a = get('ryusei_swap', d, n, h)
    k = n / 88
    out = []
    for b in ((9, 24, 17, 28), (72, 24, 80, 28)):
        bb = [int(round(v * k)) for v in b]
        s = sub(a, bb)
        out.append('%d/%d' % (band(s, **SKIN).sum(), band(s, Lr=(0.35, 1), Cr=(0.03, 1), Hr=(200, 260)).sum()))
    return ' | '.join(out)
row('', f5)

D(6, 'northstar_command 88: rose (pink, L>=0.6 C<=0.2 hue 0-20) pixels above row 32 in x 36-48 | columns 36-48 with an unbroken dark lid pixel (L<0.2) in rows 26-31')
def f6(d, n, h):
    a = get('northstar_command', d, n, h)
    s = sub(a, (36, 22, 49, 32))
    pink = band(s, Lr=(0.6, 1), Cr=(0, 0.2), Hr=(0, 20)).sum()
    L, C, H = m.lch(sub(a, (36, 26, 49, 32)))
    dark = (L < 0.2).any(0).sum()
    return 'rose above lid %d, dark lid in %d/13 cols' % (pink, dark)
row('', f6, sizes=(88,))

D(7, 'northstar_command: inside the iris disc, pale pink (L>=0.72) | salmon (#f86071-like: L 0.62-0.75, hue 10-22, C>=0.14) | crimson (L 0.45-0.62, C>=0.19, hue 20-32)')
def iris_disc(n):
    k = n / 127
    cx, cy, r = 60 * k, 59 * k, 16.5 * k
    yy, xx = np.mgrid[0:n, 0:n]
    return np.hypot(xx + 0.5 - cx, yy + 0.5 - cy) <= r
def f7(d, n, h):
    a = get('northstar_command', d, n, h)
    disk = iris_disc(n)
    return '%d | %d | %d' % ((band(a, Lr=(0.72, 1)) & disk).sum(), (band(a, Lr=(0.62, 0.75), Cr=(0.14, 1), Hr=(10, 22)) & disk).sum(), (band(a, Lr=(0.45, 0.62), Cr=(0.19, 1), Hr=(20, 32)) & disk).sum())
row('', f7)

D(8, 'northstar_command: bright-red pixels inside the iris disc (L>=0.55, C>=0.21, hue 15-40)')
row('', lambda d, n, h: '%d' % (band(get('northstar_command', d, n, h), Lr=(0.55, 1), Cr=(0.21, 1), Hr=(15, 40)) & iris_disc(n)).sum())

D(9, "koton_block: on his slate faces (his reduction L 0.2-0.5, C<0.06, in the cube box): teal share (hue 190-245, C>=0.045) | mean colour")
def f9(d, n, h):
    hisA = m.his('koton_block', n)
    a = get('koton_block', d, n, h)
    k = n / 88
    L, C, H = m.lch(hisA)
    yy, xx = np.mgrid[0:n, 0:n]
    cube = (xx >= 12 * k) & (xx < 78 * k) & (yy >= 8 * k) & (yy < 80 * k)
    face = cube & (L >= 0.2) & (L <= 0.5) & (C < 0.06)
    t = band(a, Cr=(0.045, 1), Hr=(190, 245)) & face
    return '%.0f%% teal, mean #%s (n=%d)' % (t.sum() / face.sum() * 100, m.hexc(a[face].mean(0)), face.sum())
row('', f9)

D(10, 'water_dragon_suiryuudan: near-white % (L>=0.92, C<=0.04) | his spray area (44: 5-10,5-17) mean colour and chroma')
def f10(d, n, h):
    a = get('water_dragon_suiryuudan', d, n, h)
    k = n / 44
    s = sub(a, [int(v * k) for v in (5, 5, 10, 17)])
    L, C, H = m.lch(s.reshape(-1, 3).mean(0))
    return '%.2f%% | #%s C=%.3f' % (band(a, Lr=(0.92, 1), Cr=(0, 0.04)).mean() * 100, m.hexc(s.reshape(-1, 3).mean(0)), C)
row('', f10)

D(11, 'taki_sixtyfour_palms 88: the hood at (41-44,27): colours, max chroma')
def f11(d, n, h):
    a = get('taki_sixtyfour_palms', d, n, h)
    s = sub(a, (41, 27, 45, 28))
    L, C, H = m.lch(s)
    return '%s maxC=%.3f' % (' '.join(m.hexc(c) for c in s[0]), C.max())
row('', f11, sizes=(88,))

D(12, 'dragon_fire_stream 44: teeth (38-40,17-19): tan-tooth pixels (L 0.55-0.85, C 0.05-0.14, hue 50-85) | colours')
def f12(d, n, h):
    a = get('dragon_fire_stream', d, n, h)
    s = sub(a, (38, 17, 41, 20))
    return '%d | %s' % (band(s, Lr=(0.55, 0.85), Cr=(0.05, 0.14), Hr=(50, 85)).sum(), ' '.join(m.hexc(c) for c in s.reshape(-1, 3)))
row('', f12, sizes=(44,))

D(13, 'dragon_fire_bomb 44: the left head mouth core (9,27) and its 3x3: yellow (L>=0.85, hue 85-115) count | centre colour')
def f13(d, n, h):
    a = get('dragon_fire_bomb', d, n, h)
    s = sub(a, (8, 26, 11, 29))
    return '%d | #%s' % (band(s, Lr=(0.85, 1), Hr=(85, 115)).sum(), m.hexc(a[27, 9]))
row('', f13, sizes=(44,))

D(14, 'northstar_command 44: sparkle core (7,33) colour | salmon (#f86071-like) pixels in (6-8,33-35)')
def f14(d, n, h):
    a = get('northstar_command', d, n, h)
    s = sub(a, (6, 33, 9, 36))
    return '#%s | %d' % (m.hexc(a[33, 7]), band(s, Lr=(0.62, 0.75), Cr=(0.14, 1), Hr=(10, 22)).sum())
row('', f14, sizes=(44,))

D(15, 'mirai_evasion 44: the ember (36,38) colour and lightness')
def f15(d, n, h):
    a = get('mirai_evasion', d, n, h)
    L, C, H = m.lch(a[38, 36])
    return '#%s L=%.2f' % (m.hexc(a[38, 36]), L)
row('', f15, sizes=(44,))
