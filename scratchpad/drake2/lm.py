from PIL import Image, ImageDraw
# candidate landmark pairs (his sheet coords): prowl, lunge
L = [
 ((1082,1797),(1727,1745)),  # 0 snout tip
 ((1055,1835),(1700,1780)),  # 1 chin
 ((935,1835),(1610,1775)),   # 2 throat
 ((1001,1650),(1655,1617)),  # 3 far horn tip
 ((925,1662),(1597,1626)),   # 4 near horn tip
 ((890,1630),(1560,1600)),   # 5 back at shoulders
 ((800,1615),(1450,1620)),   # 6 back mid
 ((700,1635),(1400,1660)),   # 7 back rear
 ((655,1670),(1340,1705)),   # 8 back at tail root
 ((665,1795),(1350,1780)),   # 9 haunch bottom
 ((750,1800),(1440,1790)),   # 10 belly
 ((850,1815),(1490,1780)),   # 11 chest under
 ((1013,1781),(1669,1727)),  # 12 eye
]
off = {0: (792-350, 1755-205), 5: (1458-350, 1735-205)}
for k, f in ((0, 'dbg/drake-pieces-0.png'), (5, 'dbg/drake-pieces-5.png')):
    im = Image.open(f).convert('RGB')
    im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for i, pr in enumerate(L):
        x, y = pr[0 if k == 0 else 1]
        X, Y = (x - off[k][0]) * 2, (y - off[k][1]) * 2
        d.ellipse((X - 5, Y - 5, X + 5, Y + 5), outline=(255, 0, 0), width=2)
        d.text((X + 6, Y - 6), str(i), fill=(255, 255, 0))
    im.save(f'lm-{k}.png')
