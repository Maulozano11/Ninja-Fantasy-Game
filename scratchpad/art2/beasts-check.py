import json, colorsys, sys
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_beasts/'
m=json.load(open(S+'manifest.json'))['sprites']
# allowed hue ranges (degrees) for saturated pixels per beast
HUES={'fire':[(0,62)],'water':[(165,235)],'wind':[(120,200),(55,75)],'lightning':[(18,62),(185,200)],'earth':[(0,60),(60,110),(40,80)],
      'genjutsu':[(240,345)],'chakra':[(180,250)],'poison':[(60,140),(40,70)]}
for n,s in m.items():
    im=Image.open(S+s['file']).convert('RGBA'); px=im.load()
    fw,fh=s['frameW'],s['frameH']; a=s['anims']['fly']
    off=0; tot=0; edge=0; examples=[]
    for f in range(a['frames']):
        for y in range(fh):
            for x in range(fw):
                r,g,b,al=px[f*fw+x,y]
                if al==0: continue
                tot+=1
                if x in (0,fw-1) or y in (0,fh-1): edge+=1
                h,l,sat=colorsys.rgb_to_hls(r/255,g/255,b/255)
                if sat>0.35 and 0.15<l<0.9:
                    hd=h*360
                    if not any(lo<=hd<=hi for lo,hi in HUES.get(n,[(0,360)])):
                        off+=1
                        if len(examples)<5: examples.append((f,x,y,(r,g,b,al)))
    print(f"{n:10s} {fw}x{fh} anchor={s['anchor']} frames={a['frames']}@{a['fps']} tags={s['tags']} opaque={tot} off-hue={off} edge={edge} {examples}")
