import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/crows-work/r3/tools')
from harness import load
import numpy as np
ns=load()
V=ns['veil_cols']; lv=ns['lum'](V); ch=V.max(1)-V.min(1)
print('veil px',len(V))
for lo,hi in [(0,20),(20,30),(30,40),(40,55),(55,70),(70,92),(92,104),(104,999)]:
    b=(lv>=lo)&(lv<hi)
    print(f'luma {lo}-{hi}: n={b.sum()} ch>30 {(b&(ch>30)).sum()} >40 {(b&(ch>40)).sum()} >50 {(b&(ch>50)).sum()}')
for c in ns['VEIL']:
    print(c.astype(int).tolist(),'luma',round(float(ns['lum'](c)),1),'chroma',int(c.max()-c.min()))
