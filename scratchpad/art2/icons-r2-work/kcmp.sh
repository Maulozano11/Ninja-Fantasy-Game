cd /home/user/Ninja-Fantasy-Game; W=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons-r2-work
UI_OUT=$W/out UI_DEBUG=$W/dbg npx tsx tools/ui/ui-icons.ts 2>&1 | grep -A2 "${1:-kirin}"
cd $W; python3 -I - "${2:-kirin_thunder}" <<'P'
import sys
from PIL import Image
id=sys.argv[1]
his=Image.open('out/ref/%s.png'%id).convert('RGB'); w,h=his.size
hb=his.crop((1,1,w-1,h-1)).resize((44,44),Image.BOX)
o=Image.open('dbg/%s-44.png'%id).convert('RGB'); o88=Image.open('dbg/%s-88.png'%id).convert('RGB')
bar=(24,26,32)
s=Image.new('RGB',(440*2+20+240,460),(16,16,20))
s.paste(hb.resize((440,440),Image.NEAREST),(0,0)); s.paste(o.resize((440,440),Image.NEAREST),(460,0))
s.paste(hb,(920,10)); s.paste(o,(980,10)); s.paste(hb.resize((88,88),Image.NEAREST),(920,70)); s.paste(o.resize((88,88),Image.NEAREST),(1020,70))
s.paste(o88,(920,170)); s.paste(his.crop((1,1,w-1,h-1)).resize((88,88),Image.BOX),(1020,170))
s.save('cmp-%s.png'%id)
P
