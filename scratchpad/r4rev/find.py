from PIL import Image
import numpy as np
im=np.asarray(Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGB')).astype(int)
L=im.sum(2)/3
# row profile through middle y=380
row=L[380]
s=''.join('#' if v>60 else '.' for v in row)
# print transitions
prev=None
for x,v in enumerate(row):
    c = v>45
    if c!=prev: print(x, int(v), c); prev=c
