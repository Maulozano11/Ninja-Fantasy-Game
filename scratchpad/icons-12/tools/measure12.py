"""Measures the six sheet-12 defects on a set of icon files (before or after).

usage: python3 -I measure12.py <stage dir with ref/> <icons dir> <tag> [sq0 overrides as id=col,...]
"""
import importlib.util
import json
import os
import re
import sys

import numpy as np
from PIL import Image

WT = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11a53e40-d20-1'
spec = importlib.util.spec_from_file_location('r12', os.path.join(WT, 'tools/refs/icons-from-ref-12.py'))
R12 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(R12)

S, A, TAG = sys.argv[1], sys.argv[2], sys.argv[3]
over = {}
if len(sys.argv) > 4:
    for kv in sys.argv[4].split(','):
        k, v = kv.split('=')
        over[k] = int(v)
crops = json.load(open(os.path.join(S, 'ref', 'crops.json')))
man = json.load(open(os.path.join(A, 'manifest_12.json')))
IDS = ['lightning_hound_raidon', 'crescent_moon_dance', 'temple_of_nirvana']


def oklab(a):
    a = a / 255.0
    l = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    R, G, B = l[..., 0], l[..., 1], l[..., 2]
    L_ = np.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
    M_ = np.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
    S_ = np.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
    return np.stack([0.2104542553 * L_ + 0.793617785 * M_ - 0.0040720468 * S_, 1.9779984951 * L_ - 2.428592205 * M_ + 0.4505937099 * S_, 0.0259040371 * L_ + 0.7827717662 * M_ - 0.808675766 * S_], -1)


def box(a, n):
    """Area mean of a square picture to n x n (sRGB values, as the reviewer's side.py)."""
    a = a.astype(float)
    h = a.shape[0]
    s = h / n
    o = np.zeros((n, n, 3))
    for y in range(n):
        y0, y1 = y * s, (y + 1) * s
        for x in range(n):
            x0, x1 = x * s, (x + 1) * s
            acc = np.zeros(3)
            wt = 0
            for yy in range(int(y0), int(np.ceil(y1))):
                wy = min(y1, yy + 1) - max(y0, yy)
                for xx in range(int(x0), int(np.ceil(x1))):
                    wx = min(x1, xx + 1) - max(x0, xx)
                    acc += a[yy, xx] * wx * wy
                    wt += wx * wy
            o[y, x] = acc / wt
    return o


def window(jid):
    win = np.asarray(Image.open(os.path.join(S, 'ref', jid + '@window.png')).convert('RGB')).astype(float).copy()
    h, w = win.shape[:2]
    for (px, py), (sx, sy) in R12.corner_tips(w, h):
        win[py, px] = win[sy, sx]
    return win


def comps(idx):
    """8-connected components of equal values: label array and sizes."""
    h, w = idx.shape
    lab = -np.ones((h, w), int)
    sizes = []
    for y in range(h):
        for x in range(w):
            if lab[y, x] >= 0:
                continue
            n = len(sizes)
            st = [(y, x)]
            lab[y, x] = n
            c = 0
            while st:
                cy, cx = st.pop()
                c += 1
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = cy + dy, cx + dx
                        if 0 <= yy < h and 0 <= xx < w and lab[yy, xx] < 0 and idx[yy, xx] == idx[cy, cx]:
                            lab[yy, xx] = n
                            st.append((yy, xx))
            sizes.append(c)
    return lab, np.array(sizes)


def spots(rgb, hisL=None):
    """1-2 pixel areas of one colour (all), and those lighter than their ring by >= 0.05 / 0.1 OKLab L;
    with hisL (his box reduction's lightness), also the >= 0.1 ones where his picture is not lighter
    than the same ring by 0.03 or more (spots that are not his)."""
    key = (rgb[..., 0].astype(int) << 16) | (rgb[..., 1].astype(int) << 8) | rgb[..., 2].astype(int)
    lab, sz = comps(key)
    L = oklab(rgb.astype(float))[..., 0]
    h, w = key.shape
    small = 0
    b05 = b10 = spur = 0
    for n in np.nonzero(sz <= 2)[0]:
        ys, xs = np.nonzero(lab == n)
        small += 1
        ring = []
        for y, x in zip(ys, xs):
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and lab[yy, xx] != n:
                        ring.append(L[yy, xx])
        if ring:
            d = L[ys[0], xs[0]] - np.mean(ring)
            b05 += d >= 0.05
            b10 += d >= 0.1
            if hisL is not None and d >= 0.1:
                hr = []
                for y, x in zip(ys, xs):
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            yy, xx = y + dy, x + dx
                            if 0 <= yy < h and 0 <= xx < w and lab[yy, xx] != n:
                                hr.append(hisL[yy, xx])
                spur += (np.mean([hisL[y, x] for y, x in zip(ys, xs)]) - np.mean(hr)) < 0.03
    if hisL is not None:
        return small, int(b05), int(b10), int(spur)
    return small, int(b05), int(b10)


def nearest_pal(rgb, pal):
    P = np.array([[int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)] for c in pal], float)
    pl = oklab(P)
    lab = oklab(rgb)
    d = ((lab[..., None, :] - pl[None, None]) ** 2).sum(-1)
    return P[np.argmin(d, -1)].astype(np.uint8)


def blocks(ours, his, k):
    lo, lh = oklab(ours.astype(float)), oklab(his)
    n = ours.shape[0] // k
    mo = lo.reshape(n, k, n, k, 3).mean((1, 3))
    mh = lh.reshape(n, k, n, k, 3).mean((1, 3))
    de = np.sqrt(((mo - mh) ** 2).sum(-1)) * 100
    dl = (mo[..., 0] - mh[..., 0]) * 100
    return de, dl


res = {}
for jid in IDS:
    c = crops['icons'][jid]
    win = window(jid)
    w = win.shape[1]
    sq0 = over.get(jid, c['squareInWindow'][0])
    m, t = R12.bright(win)
    keep = np.zeros(w, bool)
    keep[sq0:sq0 + 115] = True
    lost = m[:, ~keep]
    r = {'square': [sq0, sq0 + 114], 'brightTotal': int(m.sum()), 'brightLost': int(lost.sum()),
         'brightLostShare': round(float(lost.sum() / m.sum()) * 100, 1),
         'whiteLost(L>=0.86)': int((R12.oklab_l(win)[:, ~keep] >= 0.86).sum()), 'whiteTotal': int((R12.oklab_l(win) >= 0.86).sum())}
    left = m[:, :sq0].sum(0)
    right = m[:, sq0 + 115:].sum(0)
    r['lostLeftCols'] = [0, sq0 - 1, int(left.sum())] if sq0 else None
    r['lostRightCols'] = [sq0 + 115, w - 1, int(right.sum())] if sq0 + 115 < w else None
    sq = win[:, sq0:sq0 + 115]
    for n, f in ((88, '@2x'), (44, '')):
        ours = np.asarray(Image.open(os.path.join(A, jid + f + '.png')).convert('RGB'))
        his = box(sq, n)
        plain = nearest_pal(his, man['icons'][jid]['palette'])
        de, dl = blocks(ours, his, n // 11)
        dep, dlp = blocks(plain, his, n // 11)
        hL = oklab(his)[..., 0]
        sm, s05, s10, sp = spots(ours, hL)
        smp, p05, p10, spp = spots(plain, hL)
        rr = {'blockDE': round(float(de.mean()), 2), 'blockDEplain': round(float(dep.mean()), 2),
              'meanDL': round(float(dl.mean()), 2), 'meanDLplain': round(float(dlp.mean()), 2),
              'meanDLbelowRow11': round(float(dl[2:].mean()), 2),
              'blocksDL>=2': int((dl >= 2).sum()), 'blocksDL>=2plain': int((dlp >= 2).sum()), 'maxDL': round(float(dl.max()), 1),
              'small1-2': sm, 'small1-2plain': smp, 'brightSpots>=0.05': s05, 'brightSpots>=0.05plain': p05, 'brightSpots>=0.1': s10, 'brightSpots>=0.1plain': p10, 'spotsNotHis': sp, 'spotsNotHisPlain': spp}
        if jid == 'lightning_hound_raidon' and n == 88:
            # His main white lines: his pixels L >= 0.9 in 8-connected groups of 12 or more.
            L = R12.oklab_l(sq)
            wm = L >= 0.9
            lab, sz = comps(np.where(wm, 1, 0))
            big = np.zeros_like(wm)
            for k2 in np.nonzero(sz >= 12)[0]:
                mm = lab == k2
                if wm[mm].all():
                    big |= mm
            cov = box(np.repeat(big[..., None].astype(float) * 255, 3, -1), 88)[..., 0] / 255
            cells = cov >= 0.5
            Lo = oklab(ours.astype(float))[..., 0]
            Lh = oklab(his)[..., 0]
            rr['mainLineCells(cover>=0.5)'] = int(cells.sum())
            rr['mainLineCellsWhite(L>=0.9)'] = int((Lo[cells] >= 0.9).sum())
            rr['mainLineCellsMeanL'] = round(float(Lo[cells].mean()), 3)
            rr['mainLineCellsHisBoxMeanL'] = round(float(Lh[cells].mean()), 3)
            rr['restMeanDL'] = round(float((Lo[~cells] - Lh[~cells]).mean() * 100), 2)
            rr['dLblocks'] = np.round(dl, 1).tolist()
        r[n] = rr
    # Hand-fix text against the files.
    hf = man['icons'][jid].get('handFixes', [])
    chk = []
    for line in hf:
        size = 88 if line.startswith('88') else 44
        img = np.asarray(Image.open(os.path.join(A, jid + ('@2x' if size == 88 else '') + '.png')).convert('RGB'))
        for hx, x, y in re.findall(r'(#[0-9a-f]{6})[^#]*? at (\d+),(\d+)', line):
            got = '#%02x%02x%02x' % tuple(img[int(y), int(x)])
            chk.append('%s@%s,%s text %s file %s %s' % (size, x, y, hx, got, 'OK' if got == hx else 'MISMATCH'))
    r['handFixCheck'] = chk
    res[jid] = r

# Defect 5: the wolf's jaw line and tongue at 44.
jid = 'lightning_hound_raidon'
sq0 = over.get(jid, crops['icons'][jid]['squareInWindow'][0])
win = window(jid)
img = np.asarray(Image.open(os.path.join(A, jid + '.png')).convert('RGB'))
lab = oklab(win)
# His navy jaw line: window pixels in the jaw/mouth region with his navy (hue 262..272, L < 0.42).
H = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
k = 115 / 44
out = []
for y in range(18, 26):
    row = []
    for x in range(28, 44):
        wx0, wx1 = sq0 + x * k, sq0 + (x + 1) * k
        wy0, wy1 = y * k, (y + 1) * k
        cell = lab[int(wy0):int(np.ceil(wy1)), int(wx0):int(np.ceil(wx1))]
        hh = H[int(wy0):int(np.ceil(wy1)), int(wx0):int(np.ceil(wx1))]
        navy = ((hh >= 262) & (hh <= 272) & (cell[..., 0] < 0.42)).mean()
        royal = ((hh >= 258) & (hh <= 272) & (cell[..., 0] >= 0.5) & (cell[..., 0] < 0.6) & (np.hypot(cell[..., 1], cell[..., 2]) > 0.18)).mean()
        row.append((x, '#%02x%02x%02x' % tuple(img[y, x]), round(float(navy), 2), round(float(royal), 2)))
    out.append((y, row))
res['jaw44'] = out


def pr(o, ind=''):
    for k2, v in o.items():
        if isinstance(v, dict):
            print(ind + str(k2) + ':')
            pr(v, ind + '  ')
        elif k2 == 'dLblocks':
            print(ind + 'dL x100 per 8x8 block (rows top to bottom):')
            for rw in v:
                print(ind + '  ' + ' '.join('%5.1f' % u for u in rw))
        else:
            print(ind + '%s: %s' % (k2, v))


print('=====', TAG)
for jid in IDS:
    print(jid)
    pr(res[jid], '  ')
print('jaw/mouth at 44 (x, our colour, share of his navy, share of his royal blue) where his navy or royal blue >= 0.3:')
for y, row in res['jaw44']:
    sel = [r for r in row if r[2] >= 0.3 or r[3] >= 0.3]
    if sel:
        print('  row %d: %s' % (y, ', '.join('%d %s n%.2f r%.2f' % r for r in sel)))
