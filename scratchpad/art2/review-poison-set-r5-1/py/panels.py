import sys; sys.path.insert(0, sys.argv[1])
from lib import *
im=np.array(Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/poison-set-owner-reference.jpg').convert('RGB')).astype(int)
for p in [(5,400),(300,700),(200,350),(190,345),(250,600),(400,30),(600,20),(60,30),(120,140)]:
    print(p, im[p[0],p[1]])
# border lines: row profiles around blast panel
y=250
print([tuple(im[y,x]) for x in range(330,345)])
print([tuple(im[yy,400]) for yy in range(172,186)])
