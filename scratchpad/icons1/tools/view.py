import sys, os
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons'
O='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons1/iter'
jid=sys.argv[1]; tag=sys.argv[2] if len(sys.argv)>2 else 'v'
his=Image.open(f'{S}/ref/{jid}.png').convert('RGB').resize((352,352),Image.LANCZOS)
a=Image.open(f'{S}/{jid}@2x.png').convert('RGB').resize((352,352),Image.NEAREST)
b=Image.open(f'{S}/{jid}.png').convert('RGB').resize((352,352),Image.NEAREST)
c=Image.open(f'{S}/{jid}.png').convert('RGB')
o=Image.new('RGB',(352*3+40+60,352+20),(21,23,29))
o.paste(his,(10,10)); o.paste(a,(372,10)); o.paste(b,(734,10)); o.paste(c,(1096,10)); o.paste(c.resize((44,44)),(1096,70))
o.save(f'{O}/{tag}-{jid}.png')
