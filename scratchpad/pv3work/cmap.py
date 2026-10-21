import sys
from PIL import Image
import numpy as np
x0,y0,x1,y1=[int(v) for v in sys.argv[1:5]]
im=np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/REF-poison-set-owner.jpg').convert('RGB')).astype(float)
L=0.3*im[...,0]+0.59*im[...,1]+0.11*im[...,2]
print('     '+''.join(str((x//10)%10) if x%10==0 else ' ' for x in range(x0,x1)))
print('     '+''.join(str(x%10) for x in range(x0,x1)))
for y in range(y0,y1):
    row=''
    for x in range(x0,x1):
        l=L[y,x]; r,g,b=im[y,x]
        if l<32: ch='#'
        elif l<45: ch=':'
        elif r>g and b>g: ch='p'
        elif l<80: ch='-'
        elif l<110: ch='+'
        elif l<150: ch='o'
        else: ch='O'
        row+=ch
    print('%4d %s'%(y,row))
