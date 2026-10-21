import sys, numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/review2/scripts')
from ok import *
from PIL import Image
R2 = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/review2'
IDS = ['ryusei_swap','northstar_command','northstar_submission','mirai_evasion','koton_block','koton_wall','ryusei_warp','dragon_fire_bomb','wood_dragon_jutsu','adamantine_sealing_chains','taki_sixtyfour_palms','shadow_clone','dragon_fire_stream','water_dragon_suiryuudan']
def box3(a):
    p = np.pad(a, ((1,1),(1,1),(0,0)), mode='edge')
    return sum(p[dy:dy+a.shape[0], dx:dx+a.shape[1]] for dy in range(3) for dx in range(3)) / 9
for jid in IDS:
    for N, suf in ((88, '@2x'), (44, '')):
        h = lab(his(jid, N))
        c = lab(np.asarray(Image.open(f'{ICONS}/{jid}{suf}.png').convert('RGB')))
        o = lab(np.asarray(Image.open(f'{R2}/old/orig/{jid}{suf}.png').convert('RGB')))
        ec = np.linalg.norm(box3(c) - box3(h), axis=-1); eo = np.linalg.norm(box3(o) - box3(h), axis=-1)
        worse = ec - eo
        # list worst cells (non-overlapping)
        w = worse.copy(); out = []
        for _ in range(4):
            i = np.unravel_index(np.argmax(w), w.shape)
            if w[i] < 0.04: break
            out.append(f'({i[1]},{i[0]}) +{w[i]:.3f} [now {ec[i]:.3f}]')
            w[max(0,i[0]-3):i[0]+4, max(0,i[1]-3):i[1]+4] = -1
        print(f'{jid:26s} {N}: mean blurred dE orig {eo.mean():.4f} -> now {ec.mean():.4f}; worse>0.04 cells {np.sum(worse>0.04):4d}; better>0.04 {np.sum(worse<-0.04):4d}; worst: {"; ".join(out)}')
