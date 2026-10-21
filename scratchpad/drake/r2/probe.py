import numpy as np
from PIL import Image
ref=np.asarray(Image.open('../art2/REF-earth-set-owner.jpg').convert('RGB')).astype(int)
def show(x0,y0,x1,y1,step=1):
    for y in range(y0,y1,step):
        print(y, ' '.join('%3d,%3d,%3d'%tuple(ref[y,x]) for x in range(x0,x1,step)))
# under-body slit prowl between thigh and belly at game x~126-132,y~76-100 -> ref?
# anchor game(151,90)<->ref(792,1755) data canvas; S=.4211 ; final = data - (2,8)
S=96/228
def g2r(gx,gy):  # final sprite coords -> ref (key0)
    dx,dy=gx+2,gy+8
    return 792+(dx-151)/S, 1755+(dy-90)/S
print(g2r(126,76), g2r(132,100), g2r(175,95), g2r(220,112))
print('slit region 735-755 x, 1740-1800 y, step 3')
show(728,1740,760,1805,3)
print('chin region')
show(900,1800,990,1840,5)
print('bg samples'); show(560,1600,600,1610,8)
