import sys,pickle,json,re,numpy as np
S=sys.argv[1]
sys.path.insert(0,S+"/gj-fix"); from gjutil import lab
d=pickle.load(open(S+'/gj-fix/dump.pkl','rb'))
txt=open(S+'/gj-fix/refdata-r1.ts').read()
pal=json.loads(re.search(r'GJ_PAL: GjPal\[\] = (\[.*?\]);',txt).group(1))
for kind in ('body','glow'):
    P=np.array([[int(p['rgba'][i:i+2],16) for i in (1,3,5,7)] for p in pal if p['kind']==kind],float)
    L=lab(P[:,:3]); C=np.hypot(L[:,1],L[:,2])
    print(kind,len(P),'chroma pct',np.percentile(C,[10,50,90,100]).round(1))
for name in ('multi','hit','sphere','slash'):
    dd=d[name]; m=dd['kind']=='body'; L=lab(dd['rgb'][m]); C=np.hypot(L[:,1],L[:,2])
    print(name,'body px',m.sum(),'chroma pct',np.percentile(C,[10,50,90,99]).round(1))
    m=dd['kind']=='glow'; 
    if m.any():
        L=lab(dd['rgb'][m]); C=np.hypot(L[:,1],L[:,2]); print(name,'glow px',m.sum(),np.percentile(C,[10,50,90,99]).round(1))
