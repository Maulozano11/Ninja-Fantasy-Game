import json, sys
from PIL import Image
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_battle/'
OUT='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-r2/'
m=json.load(open(D+'manifest.json'))['pieces']
def period(strip_cols):
    n=len(strip_cols)
    for p in range(1,n+1):
        if all(strip_cols[i]==strip_cols[i%p] for i in range(n)): return p
    return n
def cols(im,x0,x1):
    return [tuple(im.getpixel((x,y)) for y in range(im.height)) for x in range(x0,x1)]
def rows(im,y0,y1):
    return [tuple(im.getpixel((x,y)) for x in range(im.width)) for y in range(y0,y1)]
def tile_css(src_len, tile, W):
    # CSS repeat: tiles centred in area. returns source index for each dest pos
    T=len(tile); start=(W-T)/2  # a tile's left edge at W/2 - T/2
    off=int(start)%T if start>=0 else (int(start)%T)
    res=[]
    for x in range(W):
        res.append(tile[(x-int(start))%T])
    return res
def build(im,sl,W,H,mode):
    t,r,b,l=sl
    w,h=im.size
    cw=w-l-r; ch=h-t-b
    out=Image.new('RGBA',(W,H))
    def map1(n,a,cn,N,mode):
        # returns list of source coordinate for dest coordinate along axis
        res=list(range(a))
        midN=N-a-(n-a-cn)
        tile=list(range(a,a+cn))
        if cn==0 or midN<=0: mid=[]
        elif mode=='start': mid=[tile[i%cn] for i in range(midN)]
        else:
            s=(midN-cn)//2 if (midN-cn)%2==0 else (midN-cn)/2
            s=int((midN-cn)/2)  # floor
            mid=[tile[(i-s)%cn] for i in range(midN)]
        return res+mid+list(range(a+cn,n))
    xs=map1(w,l,cw,W,mode); ys=map1(h,t,ch,H,mode)
    for Y,sy in enumerate(ys):
        for X,sx in enumerate(xs):
            out.putpixel((X,Y),im.getpixel((sx,sy)))
    return out
info={}
for name,v in m.items():
    if 'slice' not in v: continue
    im=Image.open(D+v['file']).convert('RGBA')
    t,r,b,l=v['slice']; w,h=im.size
    pc=period(cols(im,l,w-r)) if w-l-r>0 else None
    pr=period(rows(im,t,h-b)) if h-t-b>0 and (t or b) else None
    print(name, v['size'], 'slice',v['slice'], 'centre w',w-l-r,'h',h-t-b,'col period',pc,'row period',pr)

def dot_rhythm(img, y, x0, x1):
    # return run-lengths of the row
    row=[img.getpixel((x,y)) for x in range(x0,x1)]
    runs=[]; cur=row[0]; n=0
    for p in row:
        if p==cur: n+=1
        else: runs.append(n); cur=p; n=1
    runs.append(n); return runs
if __name__=='__main__' and len(sys.argv)>1:
    name=sys.argv[1]; W=int(sys.argv[2]); H=int(sys.argv[3]); z=int(sys.argv[4])
    v=m[name]; im=Image.open(D+v['file']).convert('RGBA')
    outs=[]
    for mode in ('start','css'):
        o=build(im,v['slice'],W,H,mode)
        bg=Image.new('RGBA',o.size,(50,80,60,255)); bg.alpha_composite(o)
        outs.append(bg)
    tot=Image.new('RGBA',(W, H*2+4),(255,0,255,255))
    tot.paste(outs[0],(0,0)); tot.paste(outs[1],(0,H+4))
    tot=tot.resize((tot.width*z,tot.height*z),Image.NEAREST)
    tot.save(OUT+'s_%s_%dx%d.png'%(name,W,H)); print('saved')
