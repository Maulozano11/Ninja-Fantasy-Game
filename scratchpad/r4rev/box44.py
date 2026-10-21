from PIL import Image
import sys
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-icons-r4/'
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons/'
n=sys.argv[1]; S=int(sys.argv[2]) if len(sys.argv)>2 else 44
his=Image.open('his_'+n+'.png')
hb=his.resize((S,S),Image.BOX)
o=Image.open(D+n+('.png' if S==44 else '@2x.png')).convert('RGB')
W=528
s=Image.new('RGB',(W*2+30,W+20),(16,17,22))
s.paste(hb.resize((W,W),Image.NEAREST),(10,10)); s.paste(o.resize((W,W),Image.NEAREST),(W+20,10)); s.save(R+n+'-hisbox%d-vs-ours.png'%S)
