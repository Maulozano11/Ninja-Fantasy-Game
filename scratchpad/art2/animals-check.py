import json,sys
from PIL import Image
root='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/animals/'
man=json.load(open(root+'manifest.json'))
for name,s in man['sprites'].items():
    im=Image.open(root+s['file']).convert('RGBA'); px=im.load()
    fw,fh=s['frameW'],s['frameH']; ax,ay=s['anchor']
    out=[]
    for an,a in s['anims'].items():
        orphans=0; bottoms=[]; edge=0
        for f in range(a['frames']):
            ox,oy=f*fw,a['row']*fh
            lo=-1
            for y in range(fh):
                for x in range(fw):
                    if px[ox+x,oy+y][3]==0: continue
                    lo=max(lo,y)
                    if x in (0,fw-1) or y in (0,fh-1): edge+=1
                    n=0
                    for dy in (-1,0,1):
                        for dx in (-1,0,1):
                            if (dx or dy) and 0<=x+dx<fw and 0<=y+dy<fh and px[ox+x+dx,oy+y+dy][3]>0: n+=1
                    if n==0: orphans+=1
            bottoms.append(lo)
        out.append(f"{an}: orphans={orphans} edgePx={edge} lowestRow={sorted(set(bottoms))}")
    print(f"{name:17s} {fw}x{fh} anchor=({ax},{ay}) tags={s['tags']} | "+' | '.join(out))
