import sys
exec(open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/crows-work/r3/tools/measure.py').read().split('res={}')[0])
for name,box,fn,off in [('L',(262,798,522,1009),0,(21,-1))]:
    h=his(box,off); o=comp(fr['fly'][fn].astype(float))
    hc=h.max(2)-h.min(2); oc=o.max(2)-o.min(2)
    mg=(h[...,1]<0.6*np.minimum(h[...,0],h[...,2]))
    lu=h@np.array([.3,.55,.15])
    B=[0,20,30,35,40,45,50,60,80,200]
    for lo,hi in [(0,20),(20,30),(30,45),(45,70),(70,999)]:
        b=mg&(lu>=lo)&(lu<hi)
        print(f'  luma {lo}-{hi} n={b.sum()} bins {B}\n    his ',np.histogram(hc[b],bins=B)[0].tolist(),'\n    ours',np.histogram(oc[b],bins=B)[0].tolist(), ' our luma mean',round(float((o[b]@np.array([.3,.55,.15])).mean()),1))
