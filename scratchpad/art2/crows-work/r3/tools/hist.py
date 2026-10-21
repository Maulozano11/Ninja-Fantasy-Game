import sys
sys.argv=[sys.argv[0]]+sys.argv[1:]
exec(open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/crows-work/r3/tools/measure.py').read().split('res={}')[0])
for name,box,fn,off in [('L',(262,798,522,1009),0,(21,-1)),('R',(522,798,785,1009),4,(5,1))]:
    h=his(box,off); o=comp(fr['fly'][fn].astype(float))
    hc=h.max(2)-h.min(2); oc=o.max(2)-o.min(2)
    mg=(h[...,1]<0.6*np.minimum(h[...,0],h[...,2]))
    fg=(np.abs(h-np.array([31,31,41])).sum(2)>18)&~mg
    lu=h@np.array([.3,.55,.15])
    print(name,'crow-ish px',fg.sum())
    for lo,hi in [(0,45),(45,70),(70,999)]:
        b=fg&(lu>=lo)&(lu<hi)
        hh=np.histogram(hc[b],bins=[0,20,25,28,30,32,35,40,50,200])[0]; oh=np.histogram(oc[b],bins=[0,20,25,28,30,32,35,40,50,200])[0]
        print(f'  luma {lo}-{hi} bins [0,20,25,28,30,32,35,40,50+]\n    his ',hh.tolist(),'\n    ours',oh.tolist())
