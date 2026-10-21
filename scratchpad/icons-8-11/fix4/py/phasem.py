"""phasem.py <iconsDir> <debugDir>: the review's phase measures (figure cells = mask cover >= 0.5 at each size)."""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import m as M

ICONS, DBG = sys.argv[1:3]
ref = np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-ref/owner-phase-ref.jpg').convert('RGB')).astype(float)


def stats(name, px):
    L, C, H = M.lch(px)
    print(f'{name:24s} n={len(px):5d} L<.5 {np.mean(L<0.5):4.0%} | .5-.75 {np.mean((L>=.5)&(L<.75)):4.0%} | .75-.9 {np.mean((L>=.75)&(L<.9)):4.0%} | >=.9 {np.mean(L>=.9):4.0%} | med L {np.median(L):.2f} C {np.median(C):.3f} | mean #{M.hexc(px.mean(0))}')


L, C, H = M.lch(ref)
fig = ((C > 0.08) & (H > 240) & (H < 300)) | ((L > 0.75) & (ref[..., 2] > 180))
stats('reference figure', ref[fig])


def dist4(mk):
    INF = 10 ** 6
    d = np.where(mk, 0, INF).astype(np.int64)
    while True:
        t = d.copy()
        t[1:, :] = np.minimum(t[1:, :], d[:-1, :] + 1)
        t[:-1, :] = np.minimum(t[:-1, :], d[1:, :] + 1)
        t[:, 1:] = np.minimum(t[:, 1:], d[:, :-1] + 1)
        t[:, :-1] = np.minimum(t[:, :-1], d[:, 1:] + 1)
        if (t == d).all():
            return d
        d = t


for jid in ('ryusei_swap', 'ryusei_warp'):
    mv = np.asarray(Image.open(f'{DBG}/{jid}-phasemask-x6.png').convert('RGB'))[3::6, 3::6]
    fm = np.zeros(mv.shape[:2], bool)
    for c in ((255, 0, 200), (0, 255, 96), (255, 255, 255), (255, 128, 0)):
        fm |= np.all(mv == c, axis=-1)
    for N, suf in ((88, '@2x'), (44, '')):
        cur = np.asarray(Image.open(f'{ICONS}/{jid}{suf}.png').convert('RGB')).astype(float)
        cov = np.asarray(Image.fromarray((fm * 255).astype(np.uint8)).resize((N, N), Image.BOX)) / 255.0
        mk = cov >= 0.5
        stats(f'{jid[7:]} {N} figure', cur[mk])
        din = dist4(~mk)
        Lc, Cc, Hc = M.lch(cur)
        inner = mk & (din >= 2)
        rim = mk & (din == 1)
        d = dist4(mk)
        ring = d == 1
        g = (d >= 3) & (d <= 5)
        print(f'   rim {rim.sum()}/{mk.sum()} ({rim.sum()/mk.sum():.0%}); interior L {Lc[inner].mean():.2f} C {Cc[inner].mean():.3f} #{M.hexc(cur[inner].mean(0))}; rim L {Lc[rim].mean():.2f}; ring L {Lc[ring].mean():.2f} #{M.hexc(cur[ring].mean(0))}; ground L {Lc[g].mean():.2f} #{M.hexc(cur[g].mean(0))}')
