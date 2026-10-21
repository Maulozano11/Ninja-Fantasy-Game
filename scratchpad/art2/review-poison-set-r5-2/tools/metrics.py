from lib import *
def light(f):
    a=f[...,3]/255; l=(0.3*f[...,0]+0.59*f[...,1]+0.11*f[...,2])/255
    return (a*l).mean()*1000
def step(a,b):
    # mean abs RGBA diff over union of drawn pixels
    m=(a[...,3]>0)|(b[...,3]>0)
    pa=a.astype(float); pb=b.astype(float)
    pa[...,:3]*=pa[...,3:4]/255; pb[...,:3]*=pb[...,3:4]/255
    return np.abs(pa-pb).mean(-1)[m].mean()
out=[]
for name,s in M['sprites'].items():
    if name=='beast': continue
    for k,a in s['anims'].items():
        fs=frames(name,k)
        L=[light(f) for f in fs]
        st=[step(fs[i-1],fs[i]) for i in range(1,len(fs))]
        if a['loop']: st.append(step(fs[-1],fs[0]))
        enc=[int(enclosed(f[...,3],128).sum()) for f in fs]
        enc64=[int(enclosed(f[...,3],64).sum()) for f in fs]
        print(f"{name:11s} {k:5s} light {' '.join(f'{v:.0f}' for v in L)}")
        print(f"{'':17s} step  {' '.join(f'{v:.0f}' for v in st)}{'  (last=loop close)' if a['loop'] else ''}")
        print(f"{'':17s} encl<128 {enc}  encl<64 {enc64}")
