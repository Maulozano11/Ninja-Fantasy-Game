import sys,pickle,json,re,numpy as np
from PIL import Image
S=sys.argv[1]; sys.path.insert(0,S+'/gj-fix'); from gjutil import lab
d=pickle.load(open(S+'/gj-fix/dump.pkl','rb'))
REF=Image.open(S+'/REF-genjutsu-set-owner.jpg').convert('RGB')
fin=np.asarray(Image.open(S+'/staging/vfx_genjutsu_v3/multi.png').convert('RGBA')).astype(float)
for name in ('multi',):
    dd=d[name]; ox,oy=dd['origin']; k=dd['k']; W,H=dd['w'],dd['h']
    his=np.asarray(REF.resize((W,H),Image.BOX,box=(ox,oy,ox+W/k,oy+H/k))).astype(float)
    f=fin[:H,:W]
    for kind in ('body','glow','outline'):
        m=dd['kind']==kind
        if not m.any(): continue
        for lbl,arr in (('his',his),('pre',dd['rgb']),('fin',f[...,:3])):
            L=lab(arr[m]); print(kind,lbl,m.sum(),'L %.1f C %.1f'%(L[:,0].mean(),np.hypot(L[:,1],L[:,2]).mean()))
    print('fin alpha of glow px', f[...,3][dd['kind']=='glow'].mean())
