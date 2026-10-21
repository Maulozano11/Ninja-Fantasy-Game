import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/crows-work/r3/tools')
from harness import load
import numpy as np
from PIL import Image
ns=load(marker="# --- the veils: his vortex")
M='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/crows-work/r3/'
sc=ns['SHEET']['L2']
for w in sc['wings']: print(w['side'], w['pivot'], w['sign'], w['near'], w['mask'].sum())
tiles=[]
for mode in ('up','mid','down'):
    m,rgba,eyes,see=ns['pose']('L2',mode)
    ex,ey=ns['EYES_AT']['L2']; ex,ey=int(ex),int(ey)
    t=np.zeros((60,70,4),np.uint8); t[...]= (93,107,87,255)
    crop=rgba[ey-40:ey+20, ex-50:ex+20]
    a=crop[...,3:4]/255.0
    t=(crop[...,:3]*a+t[...,:3]*(1-a)).astype(np.uint8)
    tiles.append(t)
im=np.concatenate(tiles,1)
Image.fromarray(im).resize((im.shape[1]*6,im.shape[0]*6),Image.NEAREST).save(M+'z-L2-poses.png')
# sheet-level wing masks
H,W=sc['mask'].shape
vis=np.zeros((H,W,3),np.uint8); vis[sc['mask']]=(120,120,120)
cols={'lo':(255,0,0),'hi':(0,255,0)}
for w in sc['wings']: vis[w['mask']]=cols[w['side']]
Image.fromarray(vis).resize((W*3,H*3),Image.NEAREST).save(M+'z-L2-wings-sheet.png')
