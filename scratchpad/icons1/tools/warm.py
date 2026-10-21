from PIL import Image; import numpy as np
im=np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons/ref/kirin_thunder.png').convert('RGB')).astype(int)
w=im[:,:,0]-im[:,:,2]
ys,xs=np.where(w>20)
print(len(ys))
for y,x in list(zip(ys,xs))[:40]: print(x,y,'%02x%02x%02x'%tuple(im[y,x]), w[y,x])
