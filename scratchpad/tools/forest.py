# Composes a daytime forest clearing from the staged sprites at 1x, saved at 2x.
import json, math, random
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art3'
W,H=1000,700
def h(x,y,s=0):
    n=(x*374761393+y*668265263+s*2147483647)&0xffffffff
    n=((n^(n>>13))*1274126177)&0xffffffff
    return ((n^(n>>16))&0xffffffff)/4294967296
def vnoise(x,y,c,s):
    fx,fy=x/c,y/c; x0,y0=math.floor(fx),math.floor(fy); tx,ty=fx-x0,fy-y0
    sx,sy=tx*tx*(3-2*tx),ty*ty*(3-2*ty)
    a,b,cc,d=h(x0,y0,s),h(x0+1,y0,s),h(x0,y0+1,s),h(x0+1,y0+1,s)
    return a+(b-a)*sx+(cc-a)*sy+(a-b-cc+d)*sx*sy
G=[(38,58,36),(48,72,40),(60,88,46),(74,104,52),(94,122,60),(122,146,74)]
D=[(70,56,40),(92,74,52),(116,96,68),(138,118,86)]
img=Image.new('RGBA',(W,H),(0,0,0,255)); px=img.load()
pond=(470,452,78,30)
for y in range(H):
    for x in range(W):
        n=vnoise(x,y*1.5,26,3)*0.6+vnoise(x,y*1.5,9,4)*0.4
        dirt=((x-520)/150)**2+((y-560)/60)**2 + (vnoise(x,y,14,7)-0.5)*0.8
        # grass: mid tones, tufts of darker and lighter blades in small clusters
        # Mostly one mid green; small tufts of darker blades and a few lit blade tips.
        k=3 if n>0.32 else 2
        t=h(x//2,y//3,9)
        if t<0.07+0.08*(n<0.42): k=2
        if h(x//2,y//3,10)<0.025: k=1
        elif t>0.95 or h(x,y,11)<0.02: k=4
        c=G[max(0,min(5,k))]
        if dirt<1.0:
            j=1 if dirt>0.75 else 2
            if h(x//2,y//2,12)<0.12: j-=1
            if h(x,y,13)<0.03: j=3
            c=D[j]
        u=(x-pond[0])/pond[2]; v=(y-pond[1])/pond[3]; r=u*u+v*v+(vnoise(x,y,8,15)-0.5)*0.25
        if r<1.0:
            c=(36,76,104) if r>0.82 else (44,96,128) if (v<-0.2 and r<0.6) or h(x//3,y,16)<0.05 else (40,86,116)
            if r>0.92: c=(30,58,62)
        elif r<1.18: c=(60,74,46) if h(x,y,17)<0.5 else (52,66,40)
        px[x,y]=c+(255,)
# a few stones
d=ImageDraw.Draw(img)
for (sx,sy,rr) in [(600,585,3),(455,600,2),(560,612,2),(700,560,3)]:
    d.ellipse((sx-rr,sy-rr*0.7,sx+rr,sy+rr*0.7),fill=(120,122,124,255),outline=(40,40,48,255))
def man(g):
    return json.load(open(f'{S}/staging/{g}/manifest.json'))['sprites']
M={'trees':man('trees'),'plants':man('plants')}
def frame(g,n,fi=0,row=0):
    sp=M[g][n]; im=Image.open(f'{S}/staging/{g}/{sp["file"]}').convert('RGBA')
    return im.crop((fi*sp['frameW'],row*sp['frameH'],fi*sp['frameW']+sp['frameW'],row*sp['frameH']+sp['frameH'])), sp['anchor']
items=[]
def put(g,n,x,y,fi=0,flip=False,shadow=0):
    im,(ax,ay)=frame(g,n,fi)
    if flip: im=im.transpose(Image.FLIP_LEFT_RIGHT); ax=im.width-1-ax
    items.append((y,im,x-ax,y-ay,shadow,x))
# trees frame the clearing
put('trees','bamboo',330,372,0,shadow=60)
put('trees','maple',612,338,2,shadow=110)
put('trees','oak',172,648,3,shadow=190)
put('trees','pine',902,612,5,shadow=95)
put('trees','stump',420,560)
# plants
put('plants','mushroom_log',700,402,2)
put('plants','bush_round',770,452,0)
put('plants','bush_wide',232,452,1)
put('plants','bush_flower',712,668,2)
put('plants','tall_grass',318,606,1)
put('plants','tall_grass',810,580,3,True)
put('plants','fern',262,668,0)
put('plants','fern',86,612,2,True)
put('plants','fern',846,648,1)
put('plants','fern',388,380,3)
put('plants','flowers',488,632,0)
put('plants','flowers',640,478,2,True)
put('plants','flowers',300,520,1)
put('plants','reeds',548,446,0)
put('plants','reeds',398,444,3,True)
put('plants','lily_pads',470,460,1)
c0=Image.open(f'{S}/char0.png').convert('RGBA'); c1=Image.open(f'{S}/char1.png').convert('RGBA')
items.append((548,c0,520-64,548-120,0,520)); items.append((586,c1.transpose(Image.FLIP_LEFT_RIGHT),604-63,586-120,0,604))
# shadows: canopy shadows fall to the lower right (light from the upper left), then contact shadows
sh=Image.new('RGBA',(W,H),(0,0,0,0)); sd=ImageDraw.Draw(sh)
for y,im,x0,y0,s,x in items:
    if s: sd.ellipse((x-s*0.55+s*0.25,y-s*0.16+6,x+s*0.55+s*0.25,y+s*0.16+6),fill=(10,24,18,70))
for y,im,x0,y0,s,x in items:
    if s: sd.ellipse((x-s*0.16,y-5,x+s*0.2,y+5),fill=(10,20,14,70))
sd.ellipse((520-20,548-5,520+20,548+4),fill=(0,0,0,80)); sd.ellipse((604-20,586-5,604+20,586+4),fill=(0,0,0,80))
img.alpha_composite(sh)
for y,im,x0,y0,s,x in sorted(items,key=lambda t:t[0]):
    img.alpha_composite(im,(x0,y0)) if x0>=0 and y0>=0 else img.paste(im,(x0,y0),im)
img.resize((W*2,H*2),Image.NEAREST).save(f'{S}/forest-sample.png'); print('ok')
