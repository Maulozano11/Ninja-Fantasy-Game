import sys, os
from PIL import Image
d = sys.argv[1]; names = sys.argv[3:]; outp = sys.argv[2]
S = 4; G = 128
img = Image.new('RGBA', (G*S*len(names), G*S), (236,230,218,255))
for i, n in enumerate(names):
    raw = open(os.path.join(d, n + '.rgba'), 'rb').read()
    im = Image.frombytes('RGBA', (G, G), raw).resize((G*S, G*S), Image.NEAREST)
    img.alpha_composite(im, (i*G*S, 0))
img.save(outp)
