import sys
from PIL import Image
OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/aiden-parts/eyes/'
im = Image.open('docs/reference/aiden-owner-reference.jpg').convert('RGB')
P = 19.318
x0, y0, x1, y1 = 44, 15, 61, 25
box = (int(0.6 + x0 * P), int(0.7 + y0 * P), int(0.6 + x1 * P), int(0.7 + y1 * P))
c = im.crop(box)
c = c.resize((c.width * 2, c.height * 2), Image.NEAREST)
c.save(OUT + 'his_eyes_jpg.png')
print(c.size)
