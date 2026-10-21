from PIL import Image
import numpy as np
im=np.asarray(Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGB')).astype(int)
L=im.sum(2)/3
for x in (130,380,640,890):
  col=L[:,x]; prev=None; out=[]
  for y in range(240,520):
    c=col[y]>45
    if c!=prev: out.append((y,int(col[y]),c)); prev=c
  print(x,out)
