import json, re, sys
import numpy as np
from PIL import Image
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
st=A+'staging/vfx_beasts_crows/'
man=json.load(open(st+'manifest.json'))['sprites']['genjutsu']
sheet=np.asarray(Image.open(st+man['file']).convert('RGBA'))
FW,FH=man['frameW'],man['frameH']
print('manifest', {k:man[k] for k in ('frameW','frameH','anchor')}, {k:(v['frames'],v['fps'],v['loop'],v['row']) for k,v in man['anims'].items()}, 'sheet', sheet.shape[1], 'x', sheet.shape[0])
ts=open('/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-beasts-ref-genjutsu.ts',encoding='utf-8').read()
size=tuple(map(int,re.search(r'SIZE: \[number, number\] = \[(\d+), (\d+)\]',ts).groups()))
alph=re.search(r"ALPHABET = '([^']*)'",ts).group(1)
pal=re.findall(r"'(#[0-9a-f]{8})'",ts.split('export const PALETTE')[1].split('];')[0])
pal=[(int(c[1:3],16),int(c[3:5],16),int(c[5:7],16),int(c[7:9],16)) for c in pal]
body=ts.split('export const FRAMES')[1]
anchor=tuple(map(int,re.search(r'ANCHOR: \[number, number\] = \[(\d+), (\d+)\]',ts).groups()))
bad=0; border=0; Y=np.array([.299,.587,.114])
for anim in ('fly','summon'):
    seg=body.split(f'  {anim}: [')[1].split('\n  ],')[0]
    a=man['anims'][anim]
    light=[]
    for i,blk in enumerate(seg.split('    [')[1:]):
        rows=re.findall(r"      '([^']*)',",blk)
        img=np.zeros((size[1],size[0],4),np.uint8)
        for y,row in enumerate(rows):
            x=0
            for m in re.finditer(r'(\D)(\d*)',row):
                k=alph.index(m.group(1)); n=int(m.group(2)) if m.group(2) else 1
                if k>0: img[y,x:x+n]=pal[k]
                x+=n
        fr=sheet[a['row']*FH:(a['row']+1)*FH, i*FW:(i+1)*FW]
        # staged frame = data frame cropped to the union + 1 px: find offset via anchors
        ox,oy=anchor[0]-man['anchor'][0], anchor[1]-man['anchor'][1]
        d=img[oy:oy+FH, ox:ox+FW]
        bad+=int((d!=fr).any(-1).sum()) + int((img[...,3]>0).sum()-(d[...,3]>0).sum())
        al=fr[...,3]>0
        border+=int(al[0].sum()+al[-1].sum()+al[:,0].sum()+al[:,-1].sum())
        light.append(float((fr[...,3]/255*(fr[...,:3]@Y)).sum()/(FW*FH)))
    r=[light[(j+1)%len(light)]/light[j] for j in range(len(light) if a['loop'] else len(light)-1)]
    print(anim,'mean alpha x brightness per frame',[round(v,2) for v in light],'step ratios',[round(v,2) for v in r])
print('pixels differing between staged PNG and data module:',bad)
print('opaque pixels on frame borders (all frames):',border)
