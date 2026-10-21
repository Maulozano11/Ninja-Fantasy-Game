import sys, numpy as np
from PIL import Image, ImageDraw
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/review/'
BG=(36,40,56,255)
def load(tree,name):
    a=np.frombuffer(open(R+tree+'/'+name+'.rgba','rb').read(),dtype=np.uint8).reshape(256,256,4)
    return a
def img(a,box=None,s=1):
    im=Image.fromarray(a.copy(),'RGBA')
    bg=Image.new('RGBA',im.size,BG); bg.alpha_composite(im); im=bg
    if box: im=im.crop(box)
    return im.resize((im.width*s,im.height*s),Image.NEAREST)
def bbox(names,tree):
    xs=[];ys=[]
    for n in names:
        a=load(tree,n); m=a[...,3]>0
        yy,xx=np.where(m); xs+= [xx.min(),xx.max()]; ys+=[yy.min(),yy.max()]
    return min(xs),min(ys),max(xs)+1,max(ys)+1
def grid(rows,box,s,out,labels=None,collabels=None,pad=4):
    # rows: list of list of (tree,name)
    w=(box[2]-box[0])*s; h=(box[3]-box[1])*s
    lw=150 if labels else 0; th=16 if collabels else 0
    W=lw+len(rows[0])*(w+pad); H=th+len(rows)*(h+pad)
    sheet=Image.new('RGBA',(W,H),(20,22,30,255)); d=ImageDraw.Draw(sheet)
    if collabels:
        for j,c in enumerate(collabels): d.text((lw+j*(w+pad)+2,2),c,fill=(230,230,230,255))
    for i,r in enumerate(rows):
        if labels: d.text((2,th+i*(h+pad)+h//2),labels[i],fill=(230,230,230,255))
        for j,(t,n) in enumerate(r):
            if n is None: continue
            sheet.paste(img(load(t,n),box,s),(lw+j*(w+pad),th+i*(h+pad)))
    sheet.save(out); print(out,sheet.size)
PC={1:(255,230,0),2:(120,120,120),4:(255,140,0),5:(255,90,0),6:(255,0,0),7:(0,160,255),8:(0,90,255),9:(0,255,80),17:(200,0,255)}
def partimg(tree,name,box,s):
    a=load(tree,name).copy()
    pm=np.frombuffer(open(R+tree+'/'+name+'.part','rb').read(),dtype=np.uint8).reshape(256,256)
    out=a.astype(float)
    g=out[...,:3].mean(axis=2,keepdims=True)*0.35
    out[...,:3]=g
    for k,c in PC.items():
        m=(pm==k)&(a[...,3]>0)
        out[m,:3]=np.array(c)*0.55+a[m,:3]*0.45
    return img(out.astype(np.uint8),box,s)
def gridimgs(rows,out,pad=4):
    w=max(i.width for r in rows for i in r); h=max(i.height for r in rows for i in r)
    sheet=Image.new('RGBA',(len(rows[0])*(w+pad),len(rows)*(h+pad)),(20,22,30,255))
    for i,r in enumerate(rows):
        for j,im in enumerate(r): sheet.paste(im,(j*(w+pad),i*(h+pad)))
    sheet.save(out); print(out,sheet.size)
