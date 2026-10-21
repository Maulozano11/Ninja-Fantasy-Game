import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA')
x0,y0,w,h=map(int,sys.argv[2:6])
cols={}
for y in range(y0,y0+h):
    row=[]
    for x in range(x0,x0+w):
        p=im.getpixel((x,y))
        if p[3]==0: row.append(' .'); continue
        k=p[:3]
        if k not in cols: cols[k]=chr(ord('A')+len(cols)) if len(cols)<26 else chr(ord('a')+len(cols)-26)
        row.append(' '+cols[k])
    print('%2d'%y+''.join(row))
for k,v in cols.items(): print(v,'#%02x%02x%02x'%k, end='  ')
print()
