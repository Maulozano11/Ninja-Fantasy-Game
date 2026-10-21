#!/bin/bash
# look.sh json name ids... : apply the templates, render female/slender/attack zooms next to the current ones, restore hair.ts
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad
J=$(realpath $1); N=$2; shift 2
cd /home/user/Ninja-Fantasy-Game
cp src/sprite/items/hair.ts $S/femhair/_hair_backup.ts
K=${K:-6} npx tsx $S/femhair/zoom.ts $S/femhair/_before.png "$@" && \
python3 $S/femhair/apply_tpl.py $J "$@" >/dev/null && \
K=${K:-6} npx tsx $S/femhair/zoom.ts $S/femhair/_after.png "$@" && \
BODY=slender K=${K:-6} npx tsx $S/femhair/zoom.ts $S/femhair/_after_s.png "$@" && \
POSE=attack K=${K:-6} npx tsx $S/femhair/zoom.ts $S/femhair/_after_a.png "$@"
cp $S/femhair/_hair_backup.ts src/sprite/items/hair.ts
python3 - "$@" <<PY
import sys
from PIL import Image
ids = sys.argv[1:]
K = int('${K:-6}')
cw = (46 + 2) * K
ims = [Image.open('$S/femhair/' + n + '.png') for n in ['_before', '_after', '_after_s', '_after_a']]
ch = ims[0].height
o = Image.new('RGB', (4 * cw + 3 * 8, len(ids) * (ch + 8)), (20, 20, 24))
for r in range(len(ids)):
    for c, im in enumerate(ims):
        o.paste(im.crop((r * cw, 0, (r + 1) * cw, ch)), (c * (cw + 8), r * (ch + 8)))
o.save('$S/femhair/$N.png'); print(o.size)
PY
