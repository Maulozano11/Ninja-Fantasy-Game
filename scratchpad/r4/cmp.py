import sys
from PIL import Image
# cmp.py x0 y0 x1 y1 (1600 coords) zoom out [mock]
x0,y0,x1,y1,z=map(int,sys.argv[1:6]); out=sys.argv[6]
mock=sys.argv[7] if len(sys.argv)>7 else 'sheets/ui-battle-mockup.png'
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg').convert('RGB')
s=1024/1600
a=ref.resize((x1-x0,y1-y0),Image.LANCZOS,box=(x0*s,y0*s,x1*s,y1*s))
b=Image.open(mock).convert('RGB').crop((x0,y0,x1,y1))
W=(x1-x0)*z; H=(y1-y0)*z
o=Image.new('RGB',(W,H*2+6),(20,20,20))
o.paste(a.resize((W,H),Image.NEAREST),(0,0)); o.paste(b.resize((W,H),Image.NEAREST),(0,H+6))
o.save(out)
