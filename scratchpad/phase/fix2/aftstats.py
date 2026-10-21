import sys, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from comp import composite
d = sys.argv[1]
ground = np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-fix/src/assets/maps/river_forest/ground.webp').convert('RGB')).astype(float)
print('ground', ground.shape)
spots = [(800,600),(300,1500),(700,2400),(200,3000)]
cases = [('k1',1,1),('k.65',0.65,1),('k.46',0.46,1),('k.27',0.27,1),('land.27x.5',0.135,1),('land.27x.25',0.0675,1),('hidAlly',1,0.55),('hidEnemy',1,0.35),('hidAlly.27',0.27,0.55)]
for name, k, al in cases:
    res=[]
    for f in sorted(glob.glob(f'{d}/p*_run_2.raw')):
        b = np.frombuffer(open(f,'rb').read(), np.uint8).reshape(256,256,4)
        s = np.frombuffer(open(f.replace('/p','/s'),'rb').read(), np.uint8).reshape(256,256,4)
        fig = s[...,3] >= 24
        for (y,x) in spots:
            g = ground[y:y+256, x:x+256]
            o = composite(b, g, k=k*1, hue=min(1,4*k), alpha=al)
            px = o[fig]; gp = g[fig]
            res.append(((px[:,2] > px[:,1]).mean(), *px.mean(0), np.abs(px-gp).mean()))
    r = np.array(res).mean(0)
    print(f'{name:12s} blue>green {r[0]*100:5.1f}%  mean ({r[1]:.0f},{r[2]:.0f},{r[3]:.0f})  |diff from ground| {r[4]:.1f}')
