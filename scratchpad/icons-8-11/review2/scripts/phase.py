import sys, numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/review2/scripts')
from ok import *
from PIL import Image
R2='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/review2'
ref = np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-ref/owner-phase-ref.jpg').convert('RGB'))
L, C, H = lch(ref)
fig = ((C > 0.08) & (H > 240) & (H < 300)) | ((L > 0.75) & (ref[..., 2] > 180))
def dist(name, L, C, H, m):
    n = m.sum()
    l = L[m]; c = C[m]; h = H[m]
    deep = ((l < 0.5)).mean(); mid = ((l >= 0.5) & (l < 0.75)).mean(); bright = ((l >= 0.75) & (l < 0.9)).mean(); white = (l >= 0.9).mean()
    print(f'{name}: n={n} L<0.5 {deep:.0%} | 0.5-0.75 {mid:.0%} | 0.75-0.9 {bright:.0%} | >=0.9 {white:.0%} | medianL {np.median(l):.2f} medianC {np.median(c):.3f} medianH {np.median(h):.0f}')
dist('reference figure', L, C, H, fig)
for jid in ('ryusei_swap', 'ryusei_warp'):
    for N, suf in ((88, '@2x'), (44, '')):
        cur = np.asarray(Image.open(f'{ICONS}/{jid}{suf}.png').convert('RGB'))
        old = np.asarray(Image.open(f'{R2}/old/e413/{jid}{suf}.png').convert('RGB'))
        d = np.linalg.norm(lab(cur) - lab(old), axis=-1)
        m = d > 0.08
        Lc, Cc, Hc = lch(cur)
        dist(f'{jid} {N} changed', Lc, Cc, Hc, m)
        # glow-free core: changed & (blue hue) 
        Image.fromarray((m * 255).astype(np.uint8)).resize((N * 4, N * 4), Image.NEAREST).save(f'{R2}/debug/mask-{jid}-{N}.png')
