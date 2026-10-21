import sys
from PIL import Image
def lin(c):
    v=c/255; return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
def L(p):
    r,g,b=[lin(c) for c in p[:3]]
    l=(0.4122214708*r+0.5363325363*g+0.0514459929*b)**(1/3); m=(0.2119034982*r+0.6806995451*g+0.1073969566*b)**(1/3); s=(0.0883024619*r+0.2817188376*g+0.6299787005*b)**(1/3)
    return 0.2104542553*l+0.793617785*m-0.0040720468*s
def mean(path,box):
    im=Image.open(path).convert('RGB'); x0,y0,x1,y1=box
    v=[L(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    return sum(v)/len(v)
W=sys.argv[1]
for box in [(22,20,34,30),(23,21,30,27),(24,21,29,26)]:
    print(box, 'his %.3f ours %.3f r2 %.3f'%(mean(W+'/k-hisbox44.png',box), mean(W+'/stage/kirin_thunder.png',box), mean('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons/kirin_thunder.png',box)))
def Y(p):
    r,g,b=[lin(c) for c in p[:3]]; return 0.2126*r+0.7152*g+0.0722*b
def meanY(path,box):
    im=Image.open(path).convert('RGB'); x0,y0,x1,y1=box
    v=[Y(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    return sum(v)/len(v)
for box in [(22,20,34,30),(23,21,30,27),(22,19,36,30),(20,18,40,32)]:
    print('Y',box, 'his %.3f ours %.3f r2 %.3f'%(meanY(W+'/k-hisbox44.png',box), meanY(W+'/stage/kirin_thunder.png',box), meanY('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons/kirin_thunder.png',box)))
