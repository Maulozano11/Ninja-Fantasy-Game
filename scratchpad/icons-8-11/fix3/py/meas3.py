"""meas3.py <dir> [<dir>...]: the third review's defects 3, 5-9, 11, 13 measured on ours and on his box reductions."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import numpy as np
import m

DIRS = sys.argv[1:]


def band(a, Lr=(0, 1), Cr=(0, 1), Hr=(0, 360)):
    L, C, H = m.lch(a)
    hm = (H >= Hr[0]) & (H <= Hr[1]) if Hr[0] <= Hr[1] else (H >= Hr[0]) | (H <= Hr[1])
    return (L >= Lr[0]) & (L <= Lr[1]) & (C >= Cr[0]) & (C <= Cr[1]) & hm


def get(jid, d, n, h):
    return m.his(jid, n) if h else m.ours(jid, n, d)


def row(title, f, sizes=(88, 44)):
    print(title)
    for n in sizes:
        out = ['his: ' + f(None, n, True)]
        for d in DIRS:
            out.append('%s: %s' % (d.rstrip('/').split('/')[-1], f(d, n, False)))
        print('  %-3d %s' % (n, ' | '.join(out)))


def px(a, pts):
    return ' '.join(m.hexc(a[y, x]) for x, y in pts)


def f3(d, n, h):
    a = get('northstar_submission', d, n, h)
    k = n / 88
    out = []
    for b in ((0, 18, 26, 38), (0, 38, 28, 56), (62, 18, 88, 38)):
        x0, y0, x1, y1 = [int(round(v * k)) for v in b]
        s = a[y0:y1, x0:x1]
        L, C, H = m.lch(s)
        hl = band(s, Lr=(0.43, 1), Cr=(0.1, 1), Hr=(5, 40))
        out.append('%d (maxL %.2f)' % (hl.sum(), L[band(s, Cr=(0.1, 1), Hr=(5, 40))].max()))
    v = band(a, Lr=(0.3, 1), Cr=(0.08, 1), Hr=(300, 345)).mean() * 100
    return ' / '.join(out) + ' ; violet %.2f%%' % v
row('R3 submission: link highlights UL / ML / UR ; violet %', f3)

row('R5 bomb 44: x39 y17-20 | x41 y19-21 | yellow (L>=.85 hue 85-115) in x40-44 y16-22',
    lambda d, n, h: '%s | %s | %d' % (px(get('dragon_fire_bomb', d, n, h), [(39, y) for y in range(17, 21)]), px(get('dragon_fire_bomb', d, n, h), [(41, y) for y in range(19, 22)]),
                                      band(get('dragon_fire_bomb', d, n, h)[16:23, 40:44], Lr=(0.85, 1), Hr=(85, 115)).sum()), sizes=(44,))

row('R6 clone 44: (19-23, 24)', lambda d, n, h: px(get('shadow_clone', d, n, h), [(x, 24) for x in range(19, 24)]), sizes=(44,))


def f7(d, n, h):
    a = get('water_dragon_suiryuudan', d, n, h)
    nw = band(a, Lr=(0.92, 1), Cr=(0, 0.04))
    hisA = m.his('water_dragon_suiryuudan', n)
    mid = band(hisA, Lr=(0.55, 0.82), Cr=(0, 0.05))
    return 'near-white %d (%.2f%%), his mid-grey spray %d of which near-white here %d' % (nw.sum(), nw.mean() * 100, mid.sum(), (mid & nw).sum())
row('R7 water: near-white', f7)


def f8(d, n, h):
    a = get('northstar_submission', d, n, h)
    k = n / 88
    s = a[int(2 * k):int(31 * k), int(26 * k):int(64 * k)]
    L, C, H = m.lch(s)
    star = L >= 0.45
    mag = band(s, Lr=(0.3, 0.6), Cr=(0.15, 1), Hr=(355, 12)) & star
    return 'tip x21 y2-4: %s ; magenta-ish (hue 355-12) %.0f%% of star' % (px(a, [(21, 2), (21, 3), (21, 4)]), mag.sum() / star.sum() * 100)
row('R8 submission 44 star', f8, sizes=(44,))

row('R9 command 44: x27 y19-21 | y27 x18-23', lambda d, n, h: '%s | %s' % (px(get('northstar_command', d, n, h), [(27, y) for y in (19, 20, 21)]), px(get('northstar_command', d, n, h), [(x, 27) for x in range(18, 24)])), sizes=(44,))

row('R11 adamantine 44: (13,2) (14,2) (38,13) (40,31)', lambda d, n, h: px(get('adamantine_sealing_chains', d, n, h), [(13, 2), (14, 2), (38, 13), (40, 31)]), sizes=(44,))

row('R13 palms 88: (41-44, 27)', lambda d, n, h: px(get('taki_sixtyfour_palms', d, n, h), [(x, 27) for x in range(41, 45)]), sizes=(88,))
