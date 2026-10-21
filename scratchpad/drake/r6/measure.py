"""Colour checks of frames 0 and 5 against his picture box-filtered to game scale.
python3 -I measure.py <earth.ts>"""
import sys
import numpy as np
from PIL import Image, ImageDraw
exec(open(__file__.replace('measure.py', 'metrics.py')).read().split('\ndef main')[0])
frames, anchor, off = load(sys.argv[1])
H, W = frames[0].shape[:2]
ref = Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/REF-earth-set-owner.jpg').convert('RGB')
s = 96 / 228
TORSO = {0: (792, 1755), 5: (1448, 1755)}
HORNS = {0: [[(994, 1646), (1008, 1646), (1022, 1670), (1044, 1692), (1048, 1716), (1030, 1718), (1010, 1712), (994, 1690)], [(918, 1655), (935, 1660), (960, 1700), (1000, 1735), (1005, 1760), (985, 1765), (950, 1735), (925, 1710), (915, 1680)]],
         5: [[(1650, 1612), (1660, 1612), (1672, 1640), (1694, 1660), (1698, 1684), (1676, 1686), (1660, 1668), (1648, 1640)], [(1593, 1618), (1604, 1620), (1620, 1650), (1655, 1685), (1660, 1705), (1640, 1708), (1610, 1680), (1596, 1650)]]}
lw = np.array([0.3, 0.55, 0.15])
for k in (0, 5):
    t = TORSO[k]
    x0 = t[0] - anchor[0] / s
    y0 = t[1] - anchor[1] / s
    his = np.asarray(ref.resize((W, H), Image.BOX, box=(x0, y0, x0 + W / s, y0 + H / s))).astype(float)
    f = frames[k]
    op = f[..., 3] == 255
    ours = f[..., :3].astype(float)
    hm = Image.new('L', (W, H), 0)
    for p in HORNS[k]:
        ImageDraw.Draw(hm).polygon([((x - x0) * s, (y - y0) * s) for x, y in p], fill=1)
    hm = np.asarray(hm).astype(bool) & op
    hd = np.abs(his - [34, 34, 44]).sum(2) > 60
    m = hm & hd
    L_o, L_h = ours[m] @ lw, his[m] @ lw
    print(f'frame {k} horn px {m.sum()}: r-b ours {np.mean(ours[m][:,0]-ours[m][:,2]):.1f} his {np.mean(his[m][:,0]-his[m][:,2]):.1f};'
          f' lum ours {L_o.mean():.1f} his {L_h.mean():.1f}; mean ours {ours[m].mean(0).round().tolist()} his {his[m].mean(0).round().tolist()}')
    # light speckles: ours light (>=140) where his is dark (<100)
    sp = m & (ours @ lw >= 140) & (his @ lw < 105)
    print(f'   horn light-on-dark px {sp.sum()}')
    # whole body
    b = op & hd
    print(f'   body lum ours {(ours[b]@lw).mean():.1f} his {(his[b]@lw).mean():.1f}; r-b ours {np.mean(ours[b][:,0]-ours[b][:,2]):.1f} his {np.mean(his[b][:,0]-his[b][:,2]):.1f}')
    cols = {tuple(c) for c in f[op][:, :3].tolist()}
    yel = [c for c in cols if c[0] > 150 and c[1] > 150 and c[2] < 110]
    print('   yellows used', sorted(yel))
