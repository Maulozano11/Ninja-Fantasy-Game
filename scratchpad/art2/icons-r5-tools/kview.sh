#!/bin/bash
W=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons-r5-work
cd $W && python3 -I ../icons-r5-tools/bar.py . bar-x3.png 3 && python3 -I - <<'PY'
from PIL import Image
a=Image.open('out/kirin_thunder.png').convert('RGB'); h=Image.open('out/ref/kirin_thunder.png').convert('RGB'); h=h.crop((1,1,h.size[0]-1,h.size[1]-1)).resize((44,44),Image.LANCZOS)
s=Image.new('RGB',(44*10*2+20+44*3+20,44*10),(17,18,24)); s.paste(h.resize((440,440),Image.NEAREST),(0,0)); s.paste(a.resize((440,440),Image.NEAREST),(460,0))
s.paste(h.resize((132,132),Image.NEAREST),(920,0)); s.paste(a.resize((132,132),Image.NEAREST),(920,150)); s.paste(h,(920,300)); s.paste(a,(980,300))
s.save('k10.png')
PY
