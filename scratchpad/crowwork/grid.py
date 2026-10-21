import sys
from PIL import Image
d, anim, bg = sys.argv[1], sys.argv[2], sys.argv[3]
ims = [Image.open(f'{d}/f-{anim}{i}-{bg}.png') for i in range(6)]
w, h = ims[0].size
w2, h2 = w * 3 // 4, h * 3 // 4  # 3x
g = Image.new('RGB', (w2 * 3 + 20, h2 * 2 + 10), (40, 40, 40))
for i, im in enumerate(ims):
    g.paste(im.resize((w2, h2), Image.NEAREST), ((i % 3) * (w2 + 10), (i // 3) * (h2 + 10)))
g.save(f'{d}/grid-{anim}-{bg}.png')
