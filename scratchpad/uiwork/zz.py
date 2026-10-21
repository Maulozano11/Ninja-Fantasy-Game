# zz.py mock out box(x0,y0,x1,y1) Z  -> his (lanczos) above ours (nearest)
import sys
from PIL import Image
his=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg').convert('RGB').resize((1600,900),Image.LANCZOS)
mock=Image.open(sys.argv[1]).convert('RGB'); out=sys.argv[2]
b=tuple(int(v) for v in sys.argv[3].split(',')); Z=int(sys.argv[4])
w,h=b[2]-b[0],b[3]-b[1]
a=his.crop(b).resize((w*Z,h*Z),Image.LANCZOS); o=mock.crop(b).resize((w*Z,h*Z),Image.NEAREST)
side=len(sys.argv)>5
if side:
    im=Image.new('RGB',(w*Z*2+6,h*Z),(255,0,255)); im.paste(a,(0,0)); im.paste(o,(w*Z+6,0))
else:
    im=Image.new('RGB',(w*Z,h*Z*2+6),(255,0,255)); im.paste(a,(0,0)); im.paste(o,(0,h*Z+6))
im.save(out)
