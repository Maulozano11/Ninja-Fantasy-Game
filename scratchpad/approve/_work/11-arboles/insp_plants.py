import json, numpy as np
from PIL import Image
def comps(al):
    H,Wd=al.shape; lab=np.zeros((H,Wd),int); n=0; sizes=[]
    ys,xs=np.nonzero(al)
    for y0,x0 in zip(ys,xs):
        if lab[y0,x0]: continue
        n+=1; st=[(y0,x0)]; lab[y0,x0]=n; cnt=0
        while st:
            y,x=st.pop(); cnt+=1
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    yy,xx=y+dy,x+dx
                    if 0<=yy<H and 0<=xx<Wd and al[yy,xx] and not lab[yy,xx]:
                        lab[yy,xx]=n; st.append((yy,xx))
        sizes.append((cnt,int(x0),int(y0)))
    return sorted(sizes,key=lambda t:-t[0])
for tag,d in [('NEW','art3/staging/plants'),('OLD','/home/user/Ninja-Fantasy-Game/src/assets/world/plants')]:
    m=json.load(open(d+'/manifest.json'))
    print('=====',tag)
    for name,s in m['sprites'].items():
        im=np.array(Image.open(d+'/'+s['file']).convert('RGBA'))
        fw,fh=s['frameW'],s['frameH']
        for an,a in s['anims'].items():
            info=[]
            prev=None; steps=[]
            for f in range(a['frames']):
                fr=im[a['row']*fh:(a['row']+1)*fh, f*fw:(f+1)*fw]
                al=fr[...,3]
                edge=[int((al[0,:]>0).sum()),int((al[-1,:]>0).sum()),int((al[:,0]>0).sum()),int((al[:,-1]>0).sum())]
                semi=int(((al>0)&(al<255)).sum())
                c=comps(al>0)
                small=[t for t in c if t[0]<=3]
                if prev is not None: steps.append(int((np.abs(fr.astype(int)-prev.astype(int)).sum(-1)>0).sum()))
                prev=fr
                info.append((edge if sum(edge) else '', semi if semi else '', len(c), small[:4] if small else ''))
            print(name,an,a['frames'],'fps',a['fps'],'steps',steps)
            for i,x in enumerate(info):
                if any(v!='' for v in (x[0],x[1],x[3])) or x[2]>1: print('    f',i,'edges',x[0],'semi',x[1],'ncomp',x[2],'small',x[3])
