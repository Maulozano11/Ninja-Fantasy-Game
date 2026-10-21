"""Measure a crows data module against his picture: chroma counts, MAE, eyes. usage: measure.py <ts> [outdir]"""
import re, sys, os
import numpy as np
from PIL import Image
SP='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
ts=open(sys.argv[1],encoding='utf-8').read()
OUT=sys.argv[2] if len(sys.argv)>2 else None
size=tuple(map(int,re.search(r'SIZE: \[number, number\] = \[(\d+), (\d+)\]',ts).groups()))
anc=tuple(map(int,re.search(r'ANCHOR: \[number, number\] = \[(\d+), (\d+)\]',ts).groups()))
alph=re.search(r"ALPHABET = '([^']*)'",ts).group(1)
pal=re.findall(r"'(#[0-9a-f]{8})'",ts.split('export const PALETTE')[1].split('];')[0])
pal=[(int(c[1:3],16),int(c[3:5],16),int(c[5:7],16),int(c[7:9],16)) for c in pal]
fr={}
body=ts.split('export const FRAMES')[1]
for anim in ('fly','summon'):
    seg=body.split(f'  {anim}: [')[1].split('\n  ],')[0]
    frames=[]
    for blk in seg.split('    [')[1:]:
        rows=re.findall(r"      '([^']*)',",blk)
        img=np.zeros((size[1],size[0],4),np.uint8)
        for y,row in enumerate(rows):
            x=0
            for m in re.finditer(r'(\D)(\d*)',row):
                i=alph.index(m.group(1)); n=int(m.group(2)) if m.group(2) else 1
                if i>0: img[y,x:x+n]=pal[i]
                x+=n
        frames.append(img)
    fr[anim]=frames
W,H=size
ref=Image.open(SP+'REF-genjutsu-set-owner.jpg').convert('RGB')
s=96/124.0
def his(box,off):
    c=ref.crop(box); c=c.resize((round(c.width*s),round(c.height*s)),Image.BOX)
    can=Image.new('RGB',(W,H),(31,31,41)); can.paste(c,off); return np.asarray(can).astype(float)
def comp(f,bg=(31,31,41)):
    a=f[...,3:4]/255.0; return f[...,:3]*a+np.array(bg)*(1-a)
res={}
for name,box,fn,off in [('L',(262,798,522,1009),0,(21,-1)),('R',(522,798,785,1009),4,(5,1))]:
    h=his(box,off); o=comp(fr['fly'][fn].astype(float))
    ch=lambda c: c.max(2)-c.min(2)
    hc,oc=ch(h),ch(o)
    # inside his picture box
    bw,bh=round((box[2]-box[0])*s),round((box[3]-box[1])*s)
    ins=np.zeros((H,W),bool); ins[max(0,off[1])+1:off[1]+bh-1, off[0]+1:off[0]+bw-1]=True
    print(name,'chroma>30 his',int((ins&(hc>30)).sum()),'ours',int((ins&(oc>30)).sum()),' >40 his',int((ins&(hc>40)).sum()),'ours',int((ins&(oc>40)).sum()),
          ' MAE',round(float(np.abs(h-o)[ins].mean()),2))
    # blue-violet sheen: B-G>=40 count
    bgm=lambda c: c[...,2]-c[...,1]
    print('   B-G>=30 his',int((ins&(bgm(h)>=30)).sum()),'ours',int((ins&(bgm(o)>=30)).sum()),' B-G>=40 his',int((ins&(bgm(h)>=40)).sum()),'ours',int((ins&(bgm(o)>=40)).sum()))
    mg=lambda c: (c[...,1]<0.6*np.minimum(c[...,0],c[...,2]))
    for t in (30,40):
        print(f'   >{t} his-magenta region: his',int((ins&(hc>t)&mg(h)).sum()),'ours',int((ins&(oc>t)&mg(h)).sum()),' other: his',int((ins&(hc>t)&~mg(h)).sum()),'ours',int((ins&(oc>t)&~mg(h)).sum()))
    if OUT:
        os.makedirs(OUT,exist_ok=True)
        sheet=np.concatenate([h,np.full((H,4,3),80.0),o],1).astype(np.uint8)
        Image.fromarray(sheet).resize((sheet.shape[1]*3,H*3),Image.NEAREST).save(OUT+f'/side-{name}.png')
        cm=np.zeros((H,W,3),np.uint8); cm[(hc>30)&~(oc>30)]=(255,80,80); cm[(oc>30)&~(hc>30)]=(80,160,255); cm[(hc>30)&(oc>30)]=(230,230,230)
        Image.fromarray(cm).resize((W*3,H*3),Image.NEAREST).save(OUT+f'/chroma-{name}.png')
mass=[int((f[...,3]>0).sum()) for f in fr['fly']]
print('fly mass',mass)
