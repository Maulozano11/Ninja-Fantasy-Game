import sys
from PIL import Image
import numpy as np
im=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
H,W,_=im.shape
lum=im.sum(2)/3
# column profile at mid row 380 region
row=380
print("row",row, "lum along x near slot edges:")
for x in list(range(10,40))+list(range(225,290)):
    print(x, im[row,x].tolist(), end=' | ')
print()
col=130
for y in list(range(250,285))+list(range(470,510)):
    print(y, im[y,col].tolist(), end=' | ')
print()
