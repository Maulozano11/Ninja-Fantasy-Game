import json, numpy as np
from PIL import Image
def load(d):
    m=json.load(open(d+'/manifest.json'))
    return m
for tag,d in [('NEW','art3/staging/trees'),('OLD','/home/user/Ninja-Fantasy-Game/src/assets/world/trees')]:
    m=load(d)
    print('=====',tag)
    for name,s in m['sprites'].items():
        im=np.array(Image.open(d+'/'+s['file']).convert('RGBA'))
        fw,fh=s['frameW'],s['frameH']
        print(name, 'sheet',im.shape[1],im.shape[0],'frame',fw,fh,'anchor',s['anchor'],'meters',s['meters'])
        for an,a in s['anims'].items():
            for f in range(a['frames']):
                fr=im[a['row']*fh:(a['row']+1)*fh, f*fw:(f+1)*fw]
                al=fr[...,3]
                ys,xs=np.nonzero(al)
                if len(xs)==0: print('  ',an,f,'EMPTY'); continue
                semi=((al>0)&(al<255)).sum()
                edge=[int((al[0,:]>0).sum()),int((al[-1,:]>0).sum()),int((al[:,0]>0).sum()),int((al[:,-1]>0).sum())]
                print('  ',an,f,'bbox',xs.min(),ys.min(),xs.max(),ys.max(),'opaque',int((al>0).sum()),'semi',int(semi),'edges(T,B,L,R)',edge, 'alphas',sorted(set(np.unique(al).tolist()))[:6])
