"""Compare our key frames with his pictures at game scale. usage: metrics.py <module.ts> <debugdir>"""
import re, sys, json
import numpy as np
from PIL import Image
ts = open(sys.argv[1], encoding='utf-8').read()
size = json.loads(re.search(r'SIZE: \[number, number\] = (\[.*?\])', ts).group(1))
alph = re.search(r"ALPHABET = '(.*?)';", ts).group(1)
pal = re.findall(r"'(#[0-9a-f]{8})'", ts.split('export const PALETTE')[1].split('];')[0])
P = np.array([[int(c[1:3],16),int(c[3:5],16),int(c[5:7],16),int(c[7:9],16)] for c in pal], np.uint8)
def frames(anim):
    body = ts.split(f'  {anim}: [')[1]
    out=[]
    for fr in body.split('    [')[1:]:
        rows = re.findall(r"      '(.*?)',", fr.split('    ],')[0])
        img = np.zeros((size[1], size[0], 4), np.uint8)
        for y,row in enumerate(rows):
            x=0
            for m in re.finditer(r'(\D)(\d*)', row):
                n=int(m.group(2)) if m.group(2) else 1
                img[y,x:x+n]=P[alph.index(m.group(1))]; x+=n
        out.append(img)
        if len(out)==6: break
    return out
fly = frames('fly')
LW=np.array([.3,.55,.15])
for key,i in (('L',0),('R',4)):
    his = np.asarray(Image.open(f'{sys.argv[2]}/crows-his-{key}.png').convert('RGBA')).astype(float)
    ours = fly[i].astype(float)
    a = ours[...,3]>0
    hl = his[...,:3]@LW; ol = ours[...,:3]@LW
    bg = np.array([31,31,41.])
    hisfg = (np.abs(his[...,:3]-bg).sum(-1)>15) & (his[...,3]>0)
    comp = ours.copy(); comp[...,:3] = np.where(a[...,None], ours[...,:3]*ours[...,3:4]/255 + bg*(1-ours[...,3:4]/255), bg)
    mad = np.abs(comp[...,:3]-his[...,:3]).mean(-1)[(hisfg|a) & (his[...,3]>0)].mean()
    print(key, 'his>100', int((hl>100).sum()), 'ours>100', int(((ol>100)&a).sum()),
          '| his b-g>80', int(((his[...,2]-his[...,1])>80).sum()), 'ours', int((((ours[...,2]-ours[...,1])>80)&a).sum()),
          '| max b-g his', int((his[...,2]-his[...,1]).max()), 'ours', int(((ours[...,2]-ours[...,1])*a).max()),
          '| MAD', round(mad,1), '| brightest ours', ours[a][np.argmax(ol[a]),:3].astype(int).tolist())
eyec = {(225,90,130),(165,35,75),(95,12,45)}
for key,i in (('L',0),('R',4)):
    his = np.asarray(Image.open(f'{sys.argv[2]}/crows-his-{key}.png').convert('RGBA')).astype(float)
    ours = fly[i]
    a = ours[...,3]>0
    noteye = np.array([[tuple(p[:3]) not in eyec for p in row] for row in ours])
    hl = his[...,:3]@LW; ol = ours[...,:3].astype(float)@LW
    ys,xs = np.nonzero(hl>95)
    print(key,'his >95:', sorted({tuple(his[y,x,:3].astype(int)) for y,x in zip(ys,xs)}, key=lambda c: -sum(c))[:12])
    print(key,'ours non-eye >95:', int(((ol>95)&a&noteye).sum()), 'his >95', len(ys), 'ours >80', int(((ol>80)&a&noteye).sum()), 'his >80', int((hl>80).sum()))
    # magenta his
    bg = his[...,2]-his[...,1]
    ys,xs=np.nonzero(bg>80)
    print(key,'his b-g>80 sample', [tuple(his[y,x,:3].astype(int)) for y,x in list(zip(ys,xs))[::25]][:10])
