# vsref.py ours.rgba out.png: owner's first leer example (resampled to fine pixels) next to ours, 6x.
import sys
from PIL import Image

G = 256
D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref'
ours = Image.frombytes('RGBA', (G, G), open(sys.argv[1], 'rb').read())
bg = Image.new('RGBA', (G, G), (38, 43, 57, 255))
bg.alpha_composite(ours)
crop = (92, 132, 156, 204)
a = bg.crop(crop).convert('RGB')
ref = Image.open(f'{D}/fine-antes-leer1.png').convert('RGB')  # origin (72,128)
b = ref.crop((crop[0] - 72, crop[1] - 128, crop[2] - 72, crop[3] - 128))
s = 6
a = a.resize((a.width * s, a.height * s), Image.NEAREST)
b = b.resize((b.width * s, b.height * s), Image.NEAREST)
im = Image.new('RGB', (a.width * 2 + 12, a.height), (0, 0, 0))
im.paste(b, (0, 0))
im.paste(a, (a.width + 12, 0))
im.save(sys.argv[2])
print(sys.argv[2], im.size)
