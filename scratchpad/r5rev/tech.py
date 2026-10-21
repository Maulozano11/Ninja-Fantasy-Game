from PIL import Image
import numpy as np
from collections import Counter
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons'
ids=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
def label(a):
    H,W=a.shape[:2]; key=a[...,0].astype(np.int64)*65536+a[...,1].astype(np.int64)*256+a[...,2]
    seen=np.zeros((H,W),bool); comps=[]
    for y in range(H):
        for x in range(W):
            if seen[y,x]: continue
            k=key[y,x]; st=[(y,x)]; seen[y,x]=True; px=[]
            while st:
                cy,cx=st.pop(); px.append((cy,cx))
                for dy in (-1,0,1):
                    for dx in (-1,0,1):
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<H and 0<=nx<W and not seen[ny,nx] and key[ny,nx]==k:
                            seen[ny,nx]=True; st.append((ny,nx))
            comps.append(px)
    return comps
for k in ids:
    for suf in ('','@2x'):
        im=Image.open(f'{S}/{k}{suf}.png'); a=np.asarray(im.convert('RGBA'))
        al=np.unique(a[...,3]); cols=len(set(map(tuple,a[...,:3].reshape(-1,3).tolist())))
        comps=label(a[...,:3]); small=[c for c in comps if len(c)<=2]
        # isolated single pixels whose 8 neighbours all differ
        print(k+suf, im.size, im.mode, 'alpha',al, 'colours',cols, 'comps',len(comps),'1-2px',len(small), 'single',sum(1 for c in comps if len(c)==1))
fr=np.asarray(Image.open(f'{S}/skill_slot_steel.png').convert('RGBA')).astype(int)
for name in ('skill_slot_steel','skill_slot_steel_active'):
    f=np.asarray(Image.open(f'{S}/{name}.png').convert('RGBA')).astype(int)
    # top edge middle: columns 16..39 must be identical in rows 0..15
    top=f[:16,16:40]; ok_t=(top==top[:,:1]).all()
    bot=f[40:,16:40]; ok_b=(bot==bot[:,:1]).all()
    lef=f[16:40,:16]; ok_l=(lef==lef[:1]).all()
    rig=f[16:40,40:]; ok_r=(rig==rig[:1]).all()
    cen=f[16:40,16:40]; ok_c=(cen==cen[0,0]).all()
    print(name,'9slice edges uniform t/b/l/r/c', ok_t,ok_b,ok_l,ok_r,ok_c)
    # symmetry
    print(' mirror LR equal', (f==f[:,::-1]).all(), ' mirror TB equal', (f==f[::-1]).all())
