import numpy as np
from PIL import Image
ref = Image.open('../art2/REF-water-set-owner.jpg').convert('RGB')
ch = Image.open('look/ourchar.png').convert('RGBA').resize((128, 128), Image.NEAREST)
out = Image.new('RGB', (400, 140))
for i, s in enumerate([0.90, 0.925, 0.96]):
    crop = ref.crop((295, 375, 385, 498))
    W, H = round(crop.width * s), round(crop.height * s)
    g = crop.resize((W, H), Image.BOX)
    dx, dy = {0.9: (15, 8), 0.925: (16, 8), 0.96: (18, 10)}[s]
    can = Image.new('RGB', (130, 130), (0, 0, 0))
    can.paste(g, (0, 0))
    # draw our char outline: blend half
    c2 = can.copy()
    c2.paste(ch.crop((27, 27, 83, 123)), (dx, dy), ch.crop((27, 27, 83, 123)))
    out.paste(Image.blend(can, c2, 0.5), (i * 132, 0))
out.resize((out.width * 4, out.height * 4), Image.NEAREST).save('look/ov.png')
