import numpy as np
from PIL import Image
im = np.asarray(Image.open('../art2/REF-genjutsu-set-owner.jpg').convert('RGB')).astype(int)
# sheet bg vs panel bg
print('corner', im[5,5], im[1000,1000], im[20,1000])
# sample a panel interior: bolt panel around (12,60)?
for p in [(60,15),(100,200),(300,20),(400,300),(500,900)]:
    print(p, im[p[0],p[1]])
# row profile of luminance along y=100
L = im.mean(-1)
row = L[100]
print(' '.join('%d'%v for v in row[:120]))
