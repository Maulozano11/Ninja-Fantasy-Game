import sys, numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/review2/scripts')
from ok import *
from PIL import Image
R2 = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/review2'
ref = np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-ref/owner-phase-ref.jpg').convert('RGB'))
def stats(name, px):
    L, C, H = lch(px)
    print(f'{name:28s} n={len(px):5d} L<0.5 {np.mean(L<0.5):4.0%} | .5-.75 {np.mean((L>=.5)&(L<.75)):4.0%} | .75-.9 {np.mean((L>=.75)&(L<.9)):4.0%} | >=.9 {np.mean(L>=.9):4.0%} | med L {np.median(L):.2f} C {np.median(C):.3f} H {np.median(H):.0f} | mean {hx(px.mean(0))}')
L, C, H = lch(ref)
fig = ((C > 0.08) & (H > 240) & (H < 300)) | ((L > 0.75) & (ref[..., 2] > 180))
# restrict the reference to the figure's bounding box region (exclude the ledge at lower left)
stats('reference figure', ref[fig])
for jid, dbg in (('ryusei_swap', 'dbg8'), ('ryusei_warp', 'dbg9')):
    mv = np.asarray(Image.open(f'{R2}/{dbg}/{jid}-phasemask-x6.png').convert('RGB'))[3::6, 3::6]
    h, w = mv.shape[:2]
    fm = np.zeros((h, w), bool)
    for c in ((255, 0, 200), (0, 255, 96), (255, 255, 255), (255, 128, 0)):
        fm |= np.all(mv == c, axis=-1)
    ed = np.asarray(Image.open(f'{R2}/{dbg}/{jid}-edited-x4.png').convert('RGB'))[2::4, 2::4]
    stats(f'{jid} window (edited)', ed[fm])
    for N, suf in ((88, '@2x'), (44, '')):
        cur = np.asarray(Image.open(f'{ICONS}/{jid}{suf}.png').convert('RGB'))
        # coverage of the mask per cell (window squeezed to N x N)
        cov = np.asarray(Image.fromarray((fm * 255).astype(np.uint8)).resize((N, N), Image.BOX)) / 255.0
        m = cov >= 0.5
        stats(f'{jid} {N} figure', cur[m])
print('--- glow ring vs ground (ring = 4-neighbours of the figure, outside it; ground = 3-5 cells away)')
def dist4(m):
    INF = 10**6
    d = np.where(m, 0, INF).astype(np.int64)
    h, w = m.shape
    changed = True
    while changed:
        changed = False
        for sh in ((1,0),(-1,0),(0,1),(0,-1)):
            t = np.full_like(d, INF)
            ys = slice(max(sh[0],0), h+min(sh[0],0)); yd = slice(max(-sh[0],0), h+min(-sh[0],0))
            xs = slice(max(sh[1],0), w+min(sh[1],0)); xd = slice(max(-sh[1],0), w+min(-sh[1],0))
            t[ys, xs] = d[yd, xd] + 1
            nd = np.minimum(d, t)
            if (nd != d).any(): changed = True; d = nd
    return d
for jid, dbg in (('ryusei_swap', 'dbg8'), ('ryusei_warp', 'dbg9')):
    mv = np.asarray(Image.open(f'{R2}/{dbg}/{jid}-phasemask-x6.png').convert('RGB'))[3::6, 3::6]
    fm = np.zeros(mv.shape[:2], bool)
    for c in ((255, 0, 200), (0, 255, 96), (255, 255, 255), (255, 128, 0)):
        fm |= np.all(mv == c, axis=-1)
    for N, suf in ((88, '@2x'), (44, '')):
        cur = np.asarray(Image.open(f'{ICONS}/{jid}{suf}.png').convert('RGB'))
        old = np.asarray(Image.open(f'{R2}/old/e413/{jid}{suf}.png').convert('RGB'))
        cov = np.asarray(Image.fromarray((fm * 255).astype(np.uint8)).resize((N, N), Image.BOX)) / 255.0
        m = cov >= 0.5
        d = dist4(m)
        ring = d == 1
        Lc = lch(cur)[0]; Lo = lch(old)[0]
        # same cells before the phase (his ninja's surroundings) for reference
        print(f'{jid} {N}: ring n={ring.sum()} mean L ours {Lc[ring].mean():.2f} (pre-phase {Lo[ring].mean():.2f}); ground 3-5 away L {Lc[(d>=3)&(d<=5)].mean():.2f}; ring mean {hx(cur[ring].mean(0))}, ground mean {hx(cur[(d>=3)&(d<=5)].mean(0))}')
print('--- figure rim vs interior vs ground lightness')
for jid, dbg in (('ryusei_swap', 'dbg8'), ('ryusei_warp', 'dbg9')):
    mv = np.asarray(Image.open(f'{R2}/{dbg}/{jid}-phasemask-x6.png').convert('RGB'))[3::6, 3::6]
    fm = np.zeros(mv.shape[:2], bool)
    for c in ((255, 0, 200), (0, 255, 96), (255, 255, 255), (255, 128, 0)):
        fm |= np.all(mv == c, axis=-1)
    for N, suf in ((88, '@2x'), (44, '')):
        cur = np.asarray(Image.open(f'{ICONS}/{jid}{suf}.png').convert('RGB'))
        cov = np.asarray(Image.fromarray((fm * 255).astype(np.uint8)).resize((N, N), Image.BOX)) / 255.0
        m = cov >= 0.5
        din = dist4(~m)
        Lc, Cc, Hc = lch(cur)
        inner = m & (din >= 2)
        rimc = m & (din == 1)
        d = dist4(m)
        g = (d >= 3) & (d <= 5)
        print(f'{jid} {N}: figure {m.sum()} cells, rim {rimc.sum()} ({rimc.sum()/m.sum():.0%}), interior {inner.sum()}; interior L {Lc[inner].mean():.2f} C {Cc[inner].mean():.3f} mean {hx(cur[inner].mean(0))}; rim L {Lc[rimc].mean():.2f}; ground L {Lc[g].mean():.2f}; interior near-white {np.mean(Lc[inner]>=0.9):.0%}, pale (L>=0.75) {np.mean(Lc[inner]>=0.75):.0%}')
print('--- changes outside the figure + glow (more than 3 cells from the figure)')
for jid, dbg in (('ryusei_swap', 'dbg8'), ('ryusei_warp', 'dbg9')):
    mv = np.asarray(Image.open(f'{R2}/{dbg}/{jid}-phasemask-x6.png').convert('RGB'))[3::6, 3::6]
    fm = np.zeros(mv.shape[:2], bool)
    for c in ((255, 0, 200), (0, 255, 96), (255, 255, 255), (255, 128, 0), (255, 216, 0)):
        fm |= np.all(mv == c, axis=-1)
    for N, suf in ((88, '@2x'), (44, '')):
        cur = np.asarray(Image.open(f'{ICONS}/{jid}{suf}.png').convert('RGB'))
        old = np.asarray(Image.open(f'{R2}/old/e413/{jid}{suf}.png').convert('RGB'))
        cov = np.asarray(Image.fromarray((fm * 255).astype(np.uint8)).resize((N, N), Image.BOX)) / 255.0
        m = cov > 0
        d = dist4(m)
        de_ = np.linalg.norm(lab(cur) - lab(old), axis=-1)
        far = d > 3
        ys, xs = np.nonzero(far & (de_ > 0.05))
        print(f'{jid} {N}: changed (dE>0.05) cells farther than 3 from the mask: {len(xs)}', list(zip(xs.tolist(), ys.tolist()))[:12])
print('--- far cells: error vs his reduction, before (e413) and after (phase)')
for jid, dbg in (('ryusei_swap', 'dbg8'), ('ryusei_warp', 'dbg9')):
    mv = np.asarray(Image.open(f'{R2}/{dbg}/{jid}-phasemask-x6.png').convert('RGB'))[3::6, 3::6]
    fm = np.zeros(mv.shape[:2], bool)
    for c in ((255, 0, 200), (0, 255, 96), (255, 255, 255), (255, 128, 0), (255, 216, 0)):
        fm |= np.all(mv == c, axis=-1)
    for N, suf in ((88, '@2x'), (44, '')):
        cur = np.asarray(Image.open(f'{ICONS}/{jid}{suf}.png').convert('RGB')).astype(float)
        old = np.asarray(Image.open(f'{R2}/old/e413/{jid}{suf}.png').convert('RGB')).astype(float)
        h = his(jid, N).astype(float)
        cov = np.asarray(Image.fromarray((fm * 255).astype(np.uint8)).resize((N, N), Image.BOX)) / 255.0
        d = dist4(cov > 0)
        far = d > 3
        ec = np.linalg.norm(lab(cur) - lab(h), axis=-1); eo = np.linalg.norm(lab(old) - lab(h), axis=-1)
        dd = np.linalg.norm(lab(cur) - lab(old), axis=-1)
        ch = far & (dd > 0.05)
        print(f'{jid} {N}: far cells {far.sum()}, changed {ch.sum()} ({ch.sum()/far.sum():.0%}); mean dE to his on far cells before {eo[far].mean():.4f} after {ec[far].mean():.4f}; on changed cells before {eo[ch].mean():.4f} after {ec[ch].mean():.4f}; mean shift {dd[ch].mean():.3f}')
        # biggest moves
        idx = np.argsort(-(ec - eo)[ch])[:5]
        ys, xs = np.nonzero(ch)
        print('   worst moves:', '; '.join(f'({xs[i]},{ys[i]}) {hx(old[ys[i],xs[i]])}->{hx(cur[ys[i],xs[i]])} his {hx(h[ys[i],xs[i]])}' for i in idx))
