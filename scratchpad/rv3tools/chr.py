import sys
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
O=S+'/art2/review-poison-set-r3/'
ref=Image.open(S+'/art2/REF-poison-set-owner.jpg').convert('RGB')
# crops around his characters
boxes={'blast':(515,190,595,310),'wall':(290,395,350,510),'diag':(695,470,760,585),'aura':(360,370,445,515),'depth':(125,795,190,905)}
tiles=[]
for k,b in boxes.items():
    c=ref.crop(b).resize(((b[2]-b[0])*4,(b[3]-b[1])*4),Image.NEAREST)
    d=ImageDraw.Draw(c)
    for y in range(0,c.size[1],40): d.line([(0,y),(6,y)],fill=(255,0,255))
    c.save(O+'chr_'+k+'.png')
