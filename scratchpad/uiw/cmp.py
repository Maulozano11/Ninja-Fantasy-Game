# usage: python3 -I cmp.py mockup.png out.png x y w h zoom   (screen coords at 1600x900)
import sys
from PIL import Image
mock, out, x, y, w, h, z = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:8])
ref = Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg').convert('RGB').resize((1600, 900), Image.LANCZOS)
m = Image.open(mock).convert('RGB')
a = ref.crop((x, y, x + w, y + h)).resize((w * z, h * z), Image.NEAREST)
b = m.crop((x, y, x + w, y + h)).resize((w * z, h * z), Image.NEAREST)
vertical = w > h * 1.6
o = Image.new('RGB', (w * z, h * z * 2 + 6) if vertical else (w * z * 2 + 6, h * z), (255, 0, 255))
o.paste(a, (0, 0)); o.paste(b, (0, h * z + 6) if vertical else (w * z + 6, 0))
o.save(out)
