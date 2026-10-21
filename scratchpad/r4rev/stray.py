from PIL import Image
import numpy as np
from collections import deque
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons/'
for n in ['fireball_goukakyu','kirin_thunder','great_fire_annihilation','water_shield_suijinheki']:
    for suf in ('.png','@2x.png'):
        a=np.asarray(Image.open(D+n+suf).convert('RGB')).astype(int)
        H,W,_=a.shape; key=a[...,0]*65536+a[...,1]*256+a[...,2]
        cols=len(np.unique(key))
        seen=np.zeros((H,W),bool); sizes=[]
        for y in range(H):
            for x in range(W):
                if seen[y,x]: continue
                q=deque([(y,x)]); seen[y,x]=True; c=0
                while q:
                    yy,xx=q.popleft(); c+=1
                    for dy in (-1,0,1):
                        for dx in (-1,0,1):
                            ny,nx=yy+dy,xx+dx
                            if 0<=ny<H and 0<=nx<W and not seen[ny,nx] and key[ny,nx]==key[y,x]:
                                seen[ny,nx]=True; q.append((ny,nx))
                sizes.append(c)
        sizes=np.array(sizes)
        # 4-conn singletons: pixel differs from its 4 neighbours
        pad=np.pad(key,1,constant_values=-1)
        iso4=((pad[1:-1,1:-1]!=pad[:-2,1:-1])&(pad[1:-1,1:-1]!=pad[2:,1:-1])&(pad[1:-1,1:-1]!=pad[1:-1,:-2])&(pad[1:-1,1:-1]!=pad[1:-1,2:])).sum()
        print(n+suf, 'colours',cols,'regions(8c)',len(sizes),'size1',(sizes==1).sum(),'size2',(sizes==2).sum(),'iso4',iso4, 'px/region %.1f'%(H*W/len(sizes)))
