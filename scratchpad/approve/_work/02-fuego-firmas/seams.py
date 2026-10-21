import json, numpy as np
from PIL import Image
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_fire/'
man=json.load(open(D+'manifest.json'))
def frames(name,an):
    s=man['sprites'][name]; im=np.array(Image.open(D+s['file']).convert('RGBA')).astype(int)
    a=s['anims'][an]; fw,fh=s['frameW'],s['frameH']
    return [im[a['row']*fh:(a['row']+1)*fh, f*fw:(f+1)*fw] for f in range(a['frames'])]
def diff(a,b):
    # fraction of pixels whose alpha-occupancy or color differs notably
    oa=a[:,:,3]>0; ob=b[:,:,3]>0
    occ=(oa!=ob).sum()
    col=((np.abs(a[:,:,:3]-b[:,:,:3]).sum(2)>60)&oa&ob).sum()
    return occ+col
for name,an in [('fireball','fly'),('fireball_great','fly'),('annihilation','burn'),('annihilation_enh','burn')]:
    fr=frames(name,an); n=len(fr)
    print(name,an,[diff(fr[i],fr[(i+1)%n]) for i in range(n)], '(last is wrap)')
for name in ['annihilation','annihilation_enh']:
    s=frames(name,'surge'); b=frames(name,'burn'); f=frames(name,'fade')
    print(name,'surge7->burn0',diff(s[-1],b[0]),'burn5->fade0',diff(b[-1],f[0]), 'burn5->burn0', diff(b[-1],b[0]))
for name in ['fireball','fireball_great']:
    fl=frames(name,'fly'); bu=frames(name,'burst')
    print(name,'burst steps',[diff(bu[i],bu[i+1]) for i in range(len(bu)-1)])
