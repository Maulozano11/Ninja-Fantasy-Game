import json, numpy as np
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
G=S+'/staging/vfx_earth_v3'
R=S+'/review-earth-set-r5-1'
def man(g=G): return json.load(open(g+'/manifest.json'))
def frames(name, anim=None, g=G):
    m=man(g)['sprites'][name]
    im=np.array(Image.open(g+'/'+m['file']).convert('RGBA'))
    W,H=m['frameW'],m['frameH']
    out={}
    for a,b in m['anims'].items():
        if anim and a!=anim: continue
        r=b['row']
        out[a]=[im[r*H:(r+1)*H, i*W:(i+1)*W] for i in range(b['frames'])]
    return out if anim is None else out[anim]
