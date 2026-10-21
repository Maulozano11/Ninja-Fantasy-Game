from PIL import Image, ImageDraw; import numpy as np
exec(open('cmp.py').read().split('stats={}')[0])
s=158/64
def build(fi, headshift):
    t=frame('stream','fly',fi); h=frame('stream_head','fly',fi)
    n=3; Wc=n*64+h.width; c=Image.new('RGBA',(Wc+20,84),(0,0,0,0))
    X0=10
    for i in range(n): c.alpha_composite(t,(X0+i*64-0,0))
    end=X0+n*64
    c.alpha_composite(h,(end-32+headshift,0))
    return c,end
# his row aligned so that his x 975 (joint) = end
c,end=build(0,0)
c2,_=build(0,32)
hisx0=975-(end)*s
hisrow=REF.resize((c.width,84),Image.BOX,box=(hisx0,262-63*s,hisx0+c.width*s,262+21*s))
rows=[hisrow,on(c,BG),on(c2,BG)]
k=3
out=Image.new('RGB',(c.width*k,(84*k+14)*3),(0,0,0)); d=ImageDraw.Draw(out)
for j,(r,t) in enumerate(zip(rows,['HIS row (joint at x975 = line end)','OURS as the game draws it (3 tiles anchor 0 + head anchor 32 at line end)','OURS with head moved +32 (head col0 at tile end)'])):
    out.paste(up(r,k),(0,j*(84*k+14)+14)); d.text((4,j*(84*k+14)),t,fill=(255,255,0))
    d.line([(end*k,j*(84*k+14)+14),(end*k,j*(84*k+14)+14+84*k)],fill=(255,0,0))
out.save(OUT+'/stream-row-renderer.png'); print(out.size, end)
