import sys
from PIL import Image
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg').convert('RGB').resize((1600,900),Image.LANCZOS)
def inside(x,y, tri):
    (x1,y1),(x2,y2),(x3,y3)=tri
    d=(y2-y3)*(x1-x3)+(x3-x2)*(y1-y3)
    a=((y2-y3)*(x-x3)+(x3-x2)*(y-y3))/d; b=((y3-y1)*(x-x3)+(x1-x3)*(y-y3))/d
    return a>=0 and b>=0 and 1-a-b>=0
def st(img, tri, mirror=False):
    L=[]
    for y in range(850,905):
        for x in range(500,600):
            if inside(x+0.5,y+0.5,tri):
                X = 1600-1-x if mirror else x
                p=img.getpixel((X,y)); L.append(0.299*p[0]+0.587*p[1]+0.114*p[2])
    L.sort(); n=len(L)
    return round(sum(L)/n), [round(L[int(n*q)]) for q in (0.1,0.25,0.5,0.75,0.9)], 'pale>130: %d%%'%round(100*sum(l>130 for l in L)/n), 'dark<60: %d%%'%round(100*sum(l<60 for l in L)/n)
his_tri=((516,865),(578,865),(553,895))
our_tri=((518,868),(578,868),(556,897))
print('his      ', st(ref, his_tri))
for f in sys.argv[1:]:
    print(f[:24].ljust(24), st(Image.open(f).convert('RGB'), our_tri))
