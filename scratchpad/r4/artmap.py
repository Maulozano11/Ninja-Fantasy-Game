import sys
from PIL import Image
# artmap.py x0 y0 x1 y1 [scale=0.78125] -> print luminance map at art resolution + save zoom
src='/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg'
x0,y0,x1,y1=map(float,sys.argv[1:5]); out=sys.argv[5]
s=1600/1024/2
im=Image.open(src).convert('RGB')
W=round((x1-x0)*s); H=round((y1-y0)*s)
c=im.resize((W,H),Image.LANCZOS,box=(x0,y0,x1,y1))
c.resize((W*16,H*16),Image.NEAREST).save(out)
chars=' .:-=+*#%@'
print('    '+''.join(str(i%10) for i in range(W)))
for y in range(H):
  row=''
  for x in range(W):
    r,g,b=c.getpixel((x,y)); L=0.3*r+0.59*g+0.11*b
    row+=chars[min(9,int(L/256*10))]
  print('%3d '%y+row)
