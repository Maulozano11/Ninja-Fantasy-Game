import sys
exec(open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/crows-work/r3/tools/measure.py').read().split('res={}')[0])
eyes={'L4':(329,928),'L1':(308,863),'L2':(468,852),'L3':(446,924),'R1':(665,887),'R2':(712,874),'R4':(761,911),'R3':(700,901),'R5':(667,934),'R6':(734,944)}
for name,box,fn,off in [('L',(262,798,522,1009),0,(21,-1)),('R',(522,798,785,1009),4,(5,1))]:
    h=his(box,off); o=comp(fr['fly'][fn].astype(float))
    yy,xx=np.mgrid[0:H,0:W]
    ez=np.zeros((H,W),bool)
    for n,(ex,ey) in eyes.items():
        if n[0]!=name: continue
        gx=(ex-box[0])*s+off[0]; gy=(ey-box[1])*s+off[1]
        ez|=np.hypot(xx+0.5-gx,yy+0.5-gy)<3.6
    hc=h.max(2)-h.min(2); oc=o.max(2)-o.min(2)
    lu=h@np.array([.3,.55,.15])
    print(name,'excl eyes >30',((hc>30)&~ez).sum(),((oc>30)&~ez).sum(),' >40',((hc>40)&~ez).sum(),((oc>40)&~ez).sum(), ' eyes only >40 his',((hc>40)&ez).sum(),'ours',((oc>40)&ez).sum())
    B=[0,30,35,40,45,50,60,200]
    for lo,hi in [(0,45),(45,70),(70,999)]:
        b=(lu>=lo)&(lu<hi)&~ez
        print(f'  luma {lo}-{hi} {B}\n    his ',np.histogram(hc[b],bins=B)[0].tolist(),'\n    ours',np.histogram(oc[b],bins=B)[0].tolist())
