import json, sys, numpy as np
from PIL import Image
g=sys.argv[1]
man=json.load(open(g+'/manifest.json'))['sprites']['poison']
img=np.asarray(Image.open(g+'/poison.png').convert('RGBA')).astype(int)
fw,fh=man['frameW'],man['frameH']; n=man['anims']['fly']['frames']
print('sheet',img.shape[1],'x',img.shape[0],'frame',fw,fh,'anchor',man['anchor'],'fly',n,'@',man['anims']['fly']['fps'])
fr=[img[:, i*fw:(i+1)*fw] for i in range(n)]
LUMA=np.array([0.3,0.55,0.15])
light=[float(((f[...,3]/255)*(f[...,:3]@LUMA/255)).mean()*1000) for f in fr]
opq=[int((f[...,3]==255).sum()) for f in fr]
bord=[int((f[0,:,3]>0).sum()+(f[-1,:,3]>0).sum()+(f[:,0,3]>0).sum()+(f[:,-1,3]>0).sum()) for f in fr]
def body(f):
    r,g_,b,a=f[...,0],f[...,1],f[...,2],f[...,3]
    return (a==255)&~((r>g_+10)&(b>g_+10))
sil=[]
for i in range(n):
    A=body(fr[i]); B=body(fr[(i+1)%n])
    sil.append(round(100*float((A^B).sum())/float((A|B).sum()),1))
pk=max(light)
print('light x1000',[round(v,2) for v in light])
print('light steps % of peak',[round((light[(i+1)%n]-light[i])/pk*100,1) for i in range(n)])
print('light steps % of larger',[round(abs(light[(i+1)%n]-light[i])/max(light[i],light[(i+1)%n])*100,1) for i in range(n)])
print('opaque',opq,'steps %',[round(abs(opq[(i+1)%n]-opq[i])/max(opq[i],opq[(i+1)%n])*100,1) for i in range(n)])
print('border opaque px per frame',bord)
print('body silhouette change to next frame %',sil)
