from PIL import Image, ImageDraw
import sys
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-icons-r4/'
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons/'
n=sys.argv[1]
his=Image.open('his_'+n+'.png')
o88=Image.open(D+n+'@2x.png').convert('RGB'); o44=Image.open(D+n+'.png').convert('RGB')
W=528
s=Image.new('RGB',(W*2+30,W+20),(16,17,22))
s.paste(his.resize((W,W),Image.LANCZOS),(10,10)); s.paste(o88.resize((W,W),Image.NEAREST),(W+20,10)); s.save(R+n+'-his-vs-our88-x6.png')
s=Image.new('RGB',(W*2+30,W+20),(16,17,22))
s.paste(his.resize((W,W),Image.LANCZOS),(10,10)); s.paste(o44.resize((W,W),Image.NEAREST),(W+20,10)); s.save(R+n+'-his-vs-our44-x12.png')
