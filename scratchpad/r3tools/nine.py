# CSS border-image-repeat: repeat (tiles centred in each run)
from PIL import Image
import numpy as np, json, math
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_battle/'
O='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-r3/'
man=json.load(open(D+'manifest.json'))['pieces']
def tile_run(src, L):
    # src: array (n, ...) along axis0; produce length L by centred repeat
    n=src.shape[0]
    if n==0 or L<=0: return src[:0]
    # CSS: one tile centred in the run => tiles start at offset (L - n)/2 mod n
    off=((L - n)/2) % n  # position of a tile start relative to run start
    off=int(math.floor(off))
    idx=[ (i - off) % n for i in range(L)]
    return src[idx]
def nine(name,W,H):
    a=np.asarray(Image.open(D+name+'.png').convert('RGBA'))
    h,w=a.shape[:2]; t,r,b,l=man[name]['slice']
    out=np.zeros((H,W,4),np.uint8)
    rows=[(0,t,0,t),(t,h-b,t,H-b),(h-b,h,H-b,H)]
    cols=[(0,l,0,l),(l,w-r,l,W-r),(w-r,w,W-r,W)]
    for (sy0,sy1,dy0,dy1) in rows:
        for (sx0,sx1,dx0,dx1) in cols:
            part=a[sy0:sy1,sx0:sx1]
            if part.size==0 or dy1<=dy0 or dx1<=dx0: continue
            ph,pw=part.shape[:2]
            if ph!=dy1-dy0: part=tile_run(part,dy1-dy0)
            if pw!=dx1-dx0: part=tile_run(part.transpose(1,0,2),dx1-dx0).transpose(1,0,2)
            out[dy0:dy1,dx0:dx1]=part
    return Image.fromarray(out)
tests={'bar_frame':[(920,112),(128,80),(400,96),(1000,160),(80,80)],
 'skill_slot':[(56,56),(40,40),(120,56),(56,100)],
 'item_slot':[(52,52),(30,30),(140,52)],
 'party_frame':[(60,80),(40,60),(120,80),(60,140)],
 'button_small':[(24,24),(16,16),(60,24)],
 'target_bar':[(144,40),(200,40),(390,40),(702,40)],
 'crest_strip':[(192,44),(208,44),(512,44),(800,44)],
 'lower_plaque':[(176,32),(192,32),(578,32),(900,32)],
 'move_trough':[(12,12),(106,12),(300,12)],
 'target_fill':[(12,12),(330,12)], 'hp_fill':[(172,12)], 'chakra_line':[(132,6)],
}
sheet=[]
for n,sz in tests.items():
    for (W,H) in sz:
        im=nine(n,W,H)
        sheet.append((n,W,H,im))
# compose
z=3
Wmax=max(im.width for *_,im in sheet)*z+20
Ht=sum(im.height*z+10 for *_,im in sheet)
canvas=Image.new('RGB',(min(Wmax,3200),Ht),(50,80,60))
y=0
for n,W,H,im in sheet:
    bg=Image.new('RGBA',im.size,(50,80,60,255)); bg.alpha_composite(im)
    bg=bg.resize((im.width*z,im.height*z),Image.NEAREST)
    canvas.paste(bg.convert('RGB'),(10,y)); y+=im.height*z+10
canvas.save(O+'nineslice_tests.png')
# save individual for viewing
for n,W,H,im in sheet:
    pass
# individually check bar_frame at 920x112 corners crops
for n,W,H,im in sheet:
    if n in('bar_frame','target_bar','crest_strip','lower_plaque'):
        bg=Image.new('RGBA',im.size,(50,80,60,255)); bg.alpha_composite(im)
        bg.resize((im.width*z,im.height*z),Image.NEAREST).convert('RGB').save(O+'ns_%s_%dx%d.png'%(n,W,H))
print('done')
