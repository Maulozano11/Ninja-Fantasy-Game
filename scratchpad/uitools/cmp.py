# usage: cmp.py mock.png out.png x0 y0 x1 y1 (his coords) zoom
import sys
from PIL import Image
mock, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7]); z = float(sys.argv[7])
ref = Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg').convert('RGB')
m = Image.open(mock).convert('RGB')
S = 1600/1024
a = ref.crop((x0, y0, x1, y1)).resize((round((x1-x0)*S*z), round((y1-y0)*S*z)), Image.LANCZOS)
b = m.crop((round(x0*S), round(y0*S), round(x1*S), round(y1*S)))
b = b.resize((round(b.width*z), round(b.height*z)), Image.NEAREST)
if a.width > a.height * 1.6:
    o = Image.new('RGB', (max(a.width, b.width), a.height + b.height + 8), (40, 60, 50))
    o.paste(a, (0, 0)); o.paste(b, (0, a.height + 8))
else:
    o = Image.new('RGB', (a.width + b.width + 8, max(a.height, b.height)), (40, 60, 50))
    o.paste(a, (0, 0)); o.paste(b, (a.width + 8, 0))
o.save(out)
