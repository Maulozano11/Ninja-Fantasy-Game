from PIL import Image
import math, sys
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg').convert('RGB')
his=ref.resize((1600,900),Image.LANCZOS)
mock=Image.open(sys.argv[1] if len(sys.argv)>1 else A+'/ui-battle-mockup.png').convert('RGB')
def prof(img,cx,cy):
    b={}
    for y in range(int(cy-112),int(cy+112)):
        for x in range(int(cx-112),int(cx+112)):
            if not (0<=x<img.width and 0<=y<img.height): continue
            r=math.hypot(x+0.5-cx,y+0.5-cy)
            a=math.degrees(math.atan2(y+0.5-cy,x+0.5-cx))%45
            if not (8<a<37) or r<70 or r>=108: continue
            p=img.getpixel((x,y)); l=0.299*p[0]+0.587*p[1]+0.114*p[2]
            b.setdefault(int(r//2)*2,[]).append(l)
    return {k:(round(sum(v)/len(v)), round(sorted(v)[len(v)//10]), round(sorted(v)[9*len(v)//10])) for k,v in sorted(b.items())}
h=prof(his,1505,103); o=prof(mock,1504,104)
for k in h: print(k, 'his', h[k], ' ours', o.get(k))
