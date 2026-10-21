from PIL import Image
import numpy as np
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-icons-r4/'
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons/'
for n in ('skill_slot_steel','skill_slot_steel_active'):
    im=Image.open(D+n+'.png'); print(n, im.mode, im.size)
    a=np.asarray(im.convert('RGBA'))
    print(' alpha values', np.unique(a[...,3]))
    cols={tuple(c) for c in a.reshape(-1,4) if c[3]>0}
    print(' colours', len(cols))
    for c in sorted(cols, key=lambda c: sum(c[:3])): print('  #%02x%02x%02x a%d'%c)
    bg=Image.new('RGBA',im.size,(20,22,28,255)); bg.alpha_composite(im.convert('RGBA'))
    bg.resize((560,560),Image.NEAREST).save(R+n+'-x10.png')
    # window opacity
    w=a[6:50,6:50,3]; print(' window opaque px', np.argwhere(w>0).tolist()[:10], (w>0).sum())
