import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/crows-work/r3/tools')
from harness import load
import numpy as np
ns=load()
plain=ns['plain']; pl=ns['pl']; SOLID=ns['SOLID']
ch=plain.max(1)-plain.min(1); bg=plain[:,2]-plain[:,1]
print('plain px',len(plain))
for lo,hi in [(0,45),(45,60),(60,70),(70,85),(85,95),(95,112),(112,999)]:
    b=(pl>=lo)&(pl<hi)
    print(f'luma {lo}-{hi}: n={b.sum()} chroma>=30 {(b&(ch>=30)).sum()} >=35 {(b&(ch>=35)).sum()} >=40 {(b&(ch>=40)).sum()}  B-G>=40 {(b&(bg>=40)).sum()} B-G>=30 {(b&(bg>=30)).sum()}')
print('SOLID:')
for c in SOLID:
    print(c.astype(int).tolist(), 'luma',round(float(c@ns['LUMW']),1),'chroma',int(c.max()-c.min()),'B-G',int(c[2]-c[1]))
