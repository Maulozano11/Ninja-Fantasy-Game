import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from comp import composite
ground = np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-fix/src/assets/maps/river_forest/ground.webp').convert('RGB')).astype(float)
b = np.frombuffer(open('raw3/p0_run_2.raw','rb').read(), np.uint8).reshape(256,256,4).copy()
s = np.frombuffer(open('raw3/s0_run_2.raw','rb').read(), np.uint8).reshape(256,256,4)
fig = s[...,3] >= 24
glow = (~fig) & (b[...,3] > 0)
def boost(body, f):
    o = body.astype(float).copy()
    a = o[...,3:4]/255
    na = np.minimum(1, a*f)
    o[...,:3] = np.where(glow[...,None], o[...,:3]*a/np.maximum(na,1e-6), o[...,:3])
    o[...,3:4] = np.where(glow[...,None], na*255, o[...,3:4])
    return np.clip(o,0,255).astype(np.uint8)
ys, xs = np.where(b[...,3] > 0); x0,x1,y0,y1 = xs.min()-2, xs.max()+3, ys.min()-2, ys.max()+3
g = ground[700:700+256, 2400:2656]
variants = [('now', b, lambda k: min(1, .3+1.6*k)), ('hue4k', b, lambda k: min(1, .4+2.4*k)), ('hue4k+glow1.5', boost(b,1.5), lambda k: min(1,.4+2.4*k)), ('hue4k+glow2', boost(b,2.0), lambda k: min(1,.4+2.4*k))]
rows=[]
for name, body, hf in variants:
    tiles=[]
    line = name
    for k in (1, 0.65, 0.46, 0.27, 0.12):
        o = composite(body, g, k=k, hue=hf(k))
        ring = o[glow & (b[...,3] > 60)]
        figpx = o[fig]
        line += f' | k{k}: body {((figpx[:,2]>figpx[:,1]).mean()*100):.0f}% halo {((ring[:,2]>ring[:,1]).mean()*100):.0f}%'
        tiles.append(Image.fromarray(o[y0:y1,x0:x1].astype(np.uint8)).resize(((x1-x0)*3,(y1-y0)*3), Image.NEAREST))
    print(line)
    row = Image.new('RGB', (sum(t.width for t in tiles), tiles[0].height))
    x=0
    for t in tiles: row.paste(t,(x,0)); x+=t.width
    rows.append(row)
sheet = Image.new('RGB', (rows[0].width, sum(r.height for r in rows)))
y=0
for r in rows: sheet.paste(r,(0,y)); y+=r.height
sheet.save('variants.png'); print(sheet.size)
