from PIL import Image
import numpy as np, sys
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons/'
a=np.asarray(Image.open(D+sys.argv[1]).convert('RGBA'))
x0,y0,x1,y1=map(int,sys.argv[2:6])
cols={}
for y in range(y0,y1):
    row=''
    for x in range(x0,x1):
        c=tuple(a[y,x])
        if c[3]==0: row+=' .'; continue
        if c not in cols: cols[c]=chr(ord('A')+len(cols)) if len(cols)<26 else chr(ord('a')+len(cols)-26)
        row+=' '+cols[c]
    print('%2d'%y,row)
for c,k in cols.items(): print(k,'#%02x%02x%02x'%c[:3], round((0.2126*c[0]+0.7152*c[1]+0.0722*c[2])/255,2))
