from PIL import Image
import math, sys
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg').convert('RGB')
his=ref.resize((1600,900),Image.LANCZOS)
mock=Image.open(sys.argv[1] if len(sys.argv)>1 else A+'/ui-battle-mockup.png').convert('RGB')
def stats(img, cx, cy, r0, r1):
    px=[]
    for y in range(int(cy-r1),int(cy+r1)+1):
        for x in range(int(cx-r1),int(cx+r1)+1):
            if not (0<=x<img.width and 0<=y<img.height): continue
            r=math.hypot(x+0.5-cx,y+0.5-cy)
            if r0<=r<r1:
                a=math.degrees(math.atan2(y+0.5-cy,x+0.5-cx))%45
                if 8<a<37:
                    px.append(img.getpixel((x,y))[:3])
    n=len(px); m=[sum(p[i] for p in px)/n for i in range(3)]
    lum=sorted(0.299*p[0]+0.587*p[1]+0.114*p[2] for p in px)
    return [round(v) for v in m], 'lum p10/50/90', round(lum[n//10]), round(lum[n//2]), round(lum[9*n//10])
print('his lace  ', stats(his,1505,103,90,101))
print('ours lace ', stats(mock,1504,104,90,101))
print('his band  ', stats(his,1505,103,78,88))
print('ours band ', stats(mock,1504,104,78,88))
