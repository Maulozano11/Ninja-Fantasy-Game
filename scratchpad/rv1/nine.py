import json
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
D=S+'/staging/ui_battle/'
m=json.load(open(D+'manifest.json'))['pieces']
def tile(src, w, h):
    # CSS border-image repeat (centered tiling) approximated with start-aligned repeat; use 'round'-less simple repeat from start
    out=Image.new('RGBA',(w,h))
    for x in range(0,w,src.width):
        for y in range(0,h,src.height):
            out.paste(src,(x,y))
    return out
def nine(name,W,H):
    im=Image.open(D+m[name]['file']).convert('RGBA')
    t,r,b,l=m[name]['slice']
    iw,ih=im.size
    out=Image.new('RGBA',(W,H),(0,0,0,0))
    cw=W-l-r; ch=H-t-b
    def part(x0,y0,x1,y1): return im.crop((x0,y0,x1,y1))
    # corners
    if t and l: out.paste(part(0,0,l,t),(0,0))
    if t and r: out.paste(part(iw-r,0,iw,t),(W-r,0))
    if b and l: out.paste(part(0,ih-b,l,ih),(0,H-b))
    if b and r: out.paste(part(iw-r,ih-b,iw,ih),(W-r,H-b))
    if t: out.paste(tile(part(l,0,iw-r,t),cw,t),(l,0))
    if b: out.paste(tile(part(l,ih-b,iw-r,ih),cw,b),(l,H-b))
    if l: out.paste(tile(part(0,t,l,ih-b),l,ch),(0,t))
    if r: out.paste(tile(part(iw-r,t,iw,ih-b),r,ch),(W-r,t))
    out.paste(tile(part(l,t,iw-r,ih-b),cw,ch),(l,t))
    return out
sheet=Image.new('RGBA',(1400,1000),(60,90,70,255))
y=10
tests=[('bar_frame',[(916,104),(52,52),(200,60),(96,180)]),('skill_slot',[(56,56),(20,20),(100,40),(40,100)]),('item_slot',[(52,52),(20,20),(120,52)]),('party_frame',[(60,80),(36,52),(80,120)]),('button_small',[(24,24),(16,16),(60,24)]),('target_bar',[(400,32),(80,32),(120,32),(800,32)]),('crest_strip',[(144,52),(120,52),(448,52),(600,52)]),('lower_plaque',[(160,32),(120,32),(578,32)]),('move_trough',[(48,12),(12,12),(200,12)]),('target_fill',[(8,12),(100,12)]),('hp_fill',[(8,10),(100,10)])]
for n,sizes in tests:
    x=10
    rowh=0
    for (w,h) in sizes:
        im=nine(n,w,h)
        if x+w>1390: x=10; y+=rowh+8; rowh=0
        sheet.alpha_composite(im,(x,y)); x+=w+12; rowh=max(rowh,h)
    y+=rowh+12
sheet=sheet.crop((0,0,1400,y))
sheet.save('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-r1/nineslice.png')
sheet.resize((sheet.width*2,sheet.height*2),Image.NEAREST).save('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-r1/nineslice2x.png')
print(sheet.size)
