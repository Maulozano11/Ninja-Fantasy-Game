# runs.py img colours... : longest straight horizontal/vertical run of each colour (rows >= half)
import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB'); w,h=im.size
for col in sys.argv[2:]:
    c=tuple(int(col[i:i+2],16) for i in (1,3,5))
    best=(0,None)
    for y in range(h):
        run=0
        for x in range(w):
            run = run+1 if im.getpixel((x,y))==c else 0
            if run>best[0]: best=(run,('row',y,x-run+1,x))
    bv=(0,None)
    for x in range(w):
        run=0
        for y in range(h):
            run = run+1 if im.getpixel((x,y))==c else 0
            if run>bv[0]: bv=(run,('col',x,y-run+1,y))
    print(col, 'h', best, 'v', bv)
