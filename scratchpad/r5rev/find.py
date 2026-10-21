from PIL import Image
import numpy as np
im=np.asarray(Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGB')).astype(float)
L=im.mean(2)
# row profile at y=380 
row=L[380]
print(' '.join(f'{i}:{int(v)}' for i,v in enumerate(row) if 10<=i<=40 or 255<=i<=300 or 480<=i<=540 or 735<=i<=790 or 985<=i<=1010))
col=L[:,150]
print(' '.join(f'{i}:{int(v)}' for i,v in enumerate(col) if 250<=i<=290 or 470<=i<=505))
