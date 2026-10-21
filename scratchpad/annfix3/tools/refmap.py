# His S-tier reference mapped into the annihilation_enh frame (1016x968) with the extractor's s_map.
import sys
from PIL import Image
S = sys.argv[1]; out = sys.argv[2]
im = Image.open(S + '/art2/REF-s-tier-fire-annihilation.jpg').convert('RGB')
SK = 1.08
# frame = -2 + (x-57)*SK  => x = 57 + (fx+2)/SK ; frame y = 780 + (y-922)*SK
W, H = 1016, 968
# affine for PIL: input coords from output coords
a = 1 / SK; c = 57 + 2 / SK; e = 1 / SK; f = 922 - 780 / SK
m = im.transform((W, H), Image.AFFINE, (a, 0, c, 0, e, f), resample=Image.BICUBIC, fillcolor=(18, 20, 34))
m.save(out)
