import numpy as np
from PIL import Image
from collections import Counter
ST='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons'
ids=['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']
def comps(a, conn8=True):
    h,w=a.shape[:2]; key=a[...,0].astype(np.int64)<<16|a[...,1].astype(np.int64)<<8|a[...,2]
    lab=-np.ones((h,w),int); sizes=[]
    nb=[(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)] if conn8 else [(-1,0),(1,0),(0,-1),(0,1)]
    for y in range(h):
        for x in range(w):
            if lab[y,x]>=0: continue
            st=[(y,x)]; lab[y,x]=len(sizes); n=0
            while st:
                cy,cx=st.pop(); n+=1
                for dy,dx in nb:
                    ny,nx=cy+dy,cx+dx
                    if 0<=ny<h and 0<=nx<w and lab[ny,nx]<0 and key[ny,nx]==key[cy,cx]:
                        lab[ny,nx]=len(sizes); st.append((ny,nx))
            sizes.append(n)
    return np.array(sizes)
for j in ids:
    for suf in ['','@2x']:
        im=Image.open(f'{ST}/{j}{suf}.png'); a=np.asarray(im.convert('RGBA'))
        alpha=np.unique(a[...,3])
        cols=len(set(map(tuple,a[...,:3].reshape(-1,3).tolist())))
        s8=comps(a[...,:3]); s4=comps(a[...,:3],False)
        print(f'{j}{suf}: size {im.size} mode {im.mode} alpha {alpha.tolist()} colours {cols} | 8-conn comps {len(s8)} (<=2px {int((s8<=2).sum())}, 3-4px {int(((s8>=3)&(s8<=4)).sum())}) | 4-conn <=2px {int((s4<=2).sum())}, 3-4px {int(((s4>=3)&(s4<=4)).sum())}')
for f in ['skill_slot_steel','skill_slot_steel_active']:
    a=np.asarray(Image.open(f'{ST}/{f}.png').convert('RGBA')).astype(int)
    rows_ok=all((a[16:40,:,:]==a[16:17,:,:]).all(axis=(1,2)))  # rows identical in centre band? (not expected across x)
    # 9-slice: centre band 16..40 should be uniform along the stretch direction
    top=a[:16,16:40]; left=a[16:40,:16]
    print(f, 'top band repeats along x:', bool((top==top[:,:1]).all()), '| left band repeats along y:', bool((left==left[:1]).all()),
          '| bottom:', bool((a[40:,16:40]==a[40:,16:17]).all()), '| right:', bool((a[16:40,40:]==a[16:17,40:]).all()),
          '| window 6..50 alpha0:', bool((a[6:50,6:50,3]==0).all()), 'opaque border px:', int((a[...,3]==255).sum()))
