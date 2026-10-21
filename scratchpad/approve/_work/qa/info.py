import sys, os, glob
from PIL import Image
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/'
for p in sorted(glob.glob(A+'*.png'))+sorted(glob.glob(A+'*.gif')):
    im=Image.open(p)
    sz=os.path.getsize(p)/1e6
    if p.endswith('.gif'):
        durs=[];disp=[]
        n=0
        try:
            while True:
                im.seek(n); durs.append(im.info.get('duration')); disp.append(getattr(im,'disposal_method',None)); n+=1
        except EOFError: pass
        from collections import Counter
        print(os.path.basename(p), im.size, f'{sz:.2f}MB', 'frames',n,'total',sum(durs),'loop',im.info.get('loop'), 'durs',Counter(durs).most_common(6), 'disp',Counter(disp))
    else:
        print(os.path.basename(p), im.size, im.mode, f'{sz:.2f}MB')
