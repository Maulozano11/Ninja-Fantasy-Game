import sys, numpy as np
from PIL import Image
fly=np.load(sys.argv[1]); box=[int(v) for v in sys.argv[2].split(',')]; z=int(sys.argv[3]); out=sys.argv[4]
order=[int(v) for v in sys.argv[5].split(',')] if len(sys.argv)>5 else list(range(len(fly)))
bg=tuple(int(v) for v in (sys.argv[6] if len(sys.argv)>6 else '100,110,90').split(','))
w=(box[2]-box[0])*z; h=(box[3]-box[1])*z
cv=Image.new('RGBA',((w+6)*len(order),h),(12,12,16,255))
for k,i in enumerate(order):
    f=Image.fromarray(fly[i][box[1]:box[3],box[0]:box[2]],'RGBA')
    b=Image.new('RGBA',f.size,bg+(255,)); b.alpha_composite(f)
    cv.paste(b.resize((w,h),Image.NEAREST),(k*(w+6),0))
cv.save(out)
