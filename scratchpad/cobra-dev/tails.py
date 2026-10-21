import sys, numpy as np
from PIL import Image, ImageDraw
sys.argv=['x','/home/user/Ninja-Fantasy-Game/docs/reference/poison-set-owner-reference.jpg','/dev/null']
src=open('/home/user/Ninja-Fantasy-Game/tools/refs/cobra-from-ref.py').read()
cut=src.index('# His LEFT is frame 0 and his RIGHT frame 5')
g={}
import io, contextlib
with contextlib.redirect_stdout(io.StringIO()):
    exec(compile(src[:cut],'conv','exec'),g)
C=g['C']; J=g['TAIL_J']; seg_geom=g['seg_geom']; bend_pts=g['bend_pts']
TOP=g['TAIL_TOP_PT']; LEFT=g['TAIL_LEFT_PT']
SEQ=[('L','R',0.0),('L','R',0.2),('L','R',0.4),('L','R',0.6),('L','R',0.8),('R','L',0.0),('R','L',1/3),('R','L',2/3)]
def geo(a,b,w):
    tha, la = seg_geom(C[a]['Pm']); thb, lb = seg_geom(C[b]['Pm'])
    return tha, la, thb, lb
def build(P, J, th, ln):
    Q=P.copy()
    for i in range(J-1,-1,-1):
        Q[i]=Q[i+1]-ln[i]*np.array([np.cos(th[i]),np.sin(th[i])])
    return Q
def varA(P,a,b,w):
    tha,la,thb,lb=geo(a,b,w); thp,_=seg_geom(P)
    rel=(tha[:J]-tha[J])*(1-w)+(thb[:J]-thb[J])*w; ln=la[:J]*(1-w)+lb[:J]*w
    return build(P,J,thp[J]+rel,ln)
def varB(P,a,b,w):
    tha,la,thb,lb=geo(a,b,w)
    rel=(tha[:J]-tha[J])*(1-w)+(thb[:J]-thb[J])*w; ln=la[:J]*(1-w)+lb[:J]*w
    gg=np.arange(-3,3.0001,0.05); K=np.stack(np.meshgrid(gg,gg,indexing='ij'),-1).reshape(-1,2)
    Q=bend_pts(P,J,rel,ln,K)
    over=np.maximum(0,TOP-Q[...,1].min(1))+np.maximum(0,LEFT-Q[...,0].min(1))
    c=(K**2).sum(1)+50*over**2
    best=K[np.argmin(c)]
    R=P.copy(); R[:J]=bend_pts(P,J,rel,ln,best)[0]; return R
def wave(P,a,b,w,outward=True,soft=0.25):
    tha,la,thb,lb=geo(a,b,w); thp,_=seg_geom(P)
    ka=np.diff(tha[:J+1]); kb=np.diff(thb[:J+1])  # curvature between segments i and i+1 (i<J)
    x=(J-np.arange(J))/J  # 0 at J .. 1 at tip
    pos = x if outward else 1-x
    ww=np.clip((w*(1+soft)-pos)/soft,0,1)  # converted where pos < w
    ww=ww*ww*(3-2*ww)
    k=ka*(1-ww)+kb*ww
    # angle of segment i = th[J] - sum_{m=i}^{J-1} k[m]
    th=thp[J]-np.cumsum(k[::-1])[::-1]
    ln=la[:J]*(1-ww)+lb[:J]*ww
    return build(P,J,th,ln)
VARS={'A':varA,'B':varB,'Dout':lambda P,a,b,w:wave(P,a,b,w,True),'Ein':lambda P,a,b,w:wave(P,a,b,w,False)}
K=4
img=Image.new('RGB',(len(VARS)*130*K//2, 8*60*K//2+20),(20,20,26))
dr=ImageDraw.Draw(img)
for vi,(nm,fn) in enumerate(VARS.items()):
    tips=[]
    tops=[]
    for fi,(a,b,w) in enumerate(SEQ):
        P=C[a]['Pm']*(1-w)+C[b]['Pm']*w
        Q=C[a]['Pm'] if w==0 else fn(P,a,b,w)
        tips.append(Q[0]); tops.append(Q[:J,1].min())
        ox=vi*130*K//2; oy=fi*60*K//2+20
        pts=[(ox+(p[0]-10)*K//2*1.0,oy+(p[1]-50)*K//2*1.0) for p in Q[:J+30]]
        dr.line(pts,fill=(200,200,90),width=2)
        dr.line([(ox,oy+(TOP-50)*K//2),(ox+120*K//2,oy+(TOP-50)*K//2)],fill=(90,40,40))
        dr.text((ox+2,oy+2),f'{nm} f{fi}',fill=(255,255,255))
    steps=[np.hypot(*(tips[(i+1)%8]-tips[i])) for i in range(8)]
    print(nm,'tip steps',[round(s,1) for s in steps],'tops',[round(t,1) for t in tops],'TOP',TOP)
img.save(sys.argv[0].replace('tails.py','tails.png') if False else '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/cobra-dev/tails.png')

# --- continuation along L->R
def tip_target(P,a,b,w,mode):
    ra, rb = C[a]['Pm'][0]-C[a]['Pm'][J], C[b]['Pm'][0]-C[b]['Pm'][J]
    if mode=='line':
        return P[J]+ra*(1-w)+rb*w
    an_a, an_b = np.arctan2(ra[1],ra[0]), np.arctan2(rb[1],rb[0])
    an_b = an_a + (an_b-an_a+np.pi)%(2*np.pi)-np.pi
    an, rr = an_a*(1-w)+an_b*w, np.hypot(*ra)*(1-w)+np.hypot(*rb)*w
    return P[J]+rr*np.array([np.cos(an),np.sin(an)])
def contin(mode, lam=0.3, steps=100):
    a,b='L','R'
    tha,la,thb,lb=geo(a,b,0)
    k=np.zeros(2); out={}
    for s in range(steps+1):
        w=s/steps
        P=C[a]['Pm']*(1-w)+C[b]['Pm']*w
        rel=(tha[:J]-tha[J])*(1-w)+(thb[:J]-thb[J])*w; ln=la[:J]*(1-w)+lb[:J]*w
        tip=tip_target(P,a,b,w,mode)
        for r,st in ((0.2,0.01),(0.012,0.001)):
            gg=np.arange(-r,r+st/2,st)
            K=k[None]+np.stack(np.meshgrid(gg,gg,indexing='ij'),-1).reshape(-1,2)
            Q=bend_pts(P,J,rel,ln,K)
            d2=((Q[:,0]-tip[None])**2).sum(1)
            over=np.maximum(0,TOP-Q[...,1].min(1))+np.maximum(0,LEFT-Q[...,0].min(1))
            c=d2+lam*(K**2).sum(1)+50*over**2
            k=K[np.argmin(c)]
        Q=bend_pts(P,J,rel,ln,k)[0]
        out[s]=(k.copy(), float(np.hypot(*(Q[0]-tip))))
    return out
for mode in ('line','arc'):
    res=contin(mode)
    print(mode, 'k at w=0..1 by .1', [tuple(np.round(res[s][0],2)) for s in range(0,101,10)])
    print('   residual px', [round(res[s][1],1) for s in range(0,101,10)])

def contin_box(lam=1.0, steps=200, slack=1.0):
    a,b='L','R'
    tha,la,thb,lb=geo(a,b,0)
    k=np.zeros(2); out={}
    for s in range(steps+1):
        w=s/steps
        P=C[a]['Pm']*(1-w)+C[b]['Pm']*w
        rel=(tha[:J]-tha[J])*(1-w)+(thb[:J]-thb[J])*w; ln=la[:J]*(1-w)+lb[:J]*w
        for r,st in ((0.1,0.005),(0.006,0.0005)):
            gg=np.arange(-r,r+st/2,st)
            K=k[None]+np.stack(np.meshgrid(gg,gg,indexing='ij'),-1).reshape(-1,2)
            Q=bend_pts(P,J,rel,ln,K)
            over=np.maximum(0,TOP+slack-Q[...,1].min(1))+np.maximum(0,LEFT+slack-Q[...,0].min(1))
            c=lam*(K**2).sum(1)+200*over**2
            k=K[np.argmin(c)]
        out[s]=k.copy()
    return out
res=contin_box()
print('box k', [tuple(np.round(res[s],2)) for s in range(0,201,20)])
def varBc(P,a,b,w):
    tha,la,thb,lb=geo(a,b,w)
    rel=(tha[:J]-tha[J])*(1-w)+(thb[:J]-thb[J])*w; ln=la[:J]*(1-w)+lb[:J]*w
    wl = w if a=='L' else 1-w
    k=res[int(round(wl*200))]
    R=P.copy(); R[:J]=bend_pts(P,J,rel,ln,k)[0]; return R
VARS2={'A':varA,'Bc':varBc,'Ein1':lambda P,a,b,w:wave(P,a,b,w,False,1.0),'Ein2':lambda P,a,b,w:wave(P,a,b,w,False,2.0)}
img=Image.new('RGB',(len(VARS2)*130*K//2, 8*60*K//2+20),(20,20,26))
dr=ImageDraw.Draw(img)
for vi,(nm,fn) in enumerate(VARS2.items()):
    tips=[]; tops=[]
    for fi,(a,b,w) in enumerate(SEQ):
        P=C[a]['Pm']*(1-w)+C[b]['Pm']*w
        Q=C[a]['Pm'] if w==0 else fn(P,a,b,w)
        tips.append(Q[0]); tops.append(Q[:J,1].min())
        ox=vi*130*K//2; oy=fi*60*K//2+20
        dr.line([(ox+(p[0]-10)*K//2,oy+(p[1]-50)*K//2) for p in Q[:J+30]],fill=(200,200,90),width=2)
        dr.line([(ox,oy+(TOP-50)*K//2),(ox+120*K//2,oy+(TOP-50)*K//2)],fill=(90,40,40))
        dr.text((ox+2,oy+2),f'{nm} f{fi}',fill=(255,255,255))
    steps=[np.hypot(*(tips[(i+1)%8]-tips[i])) for i in range(8)]
    print(nm,'tip steps',[round(float(s),1) for s in steps],'tops',[round(float(t),1) for t in tops])
img.save('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/cobra-dev/tails2.png')

def ik(P,a,b,w,mode='arc',pw=1.0):
    tha,la,thb,lb=geo(a,b,w); thp,_=seg_geom(P)
    rel=(tha[:J]-tha[J])*(1-w)+(thb[:J]-thb[J])*w; ln=la[:J]*(1-w)+lb[:J]*w
    th=thp[J]+rel
    T=tip_target(P,a,b,w,mode)
    x=((J-np.arange(J))/J)**pw
    for _ in range(20):
        tip=P[J]-(ln[:,None]*np.stack([np.cos(th),np.sin(th)],1)).sum(0)
        r=T-tip
        if np.hypot(*r)<0.01: break
        Jm=np.stack([ln*np.sin(th), -ln*np.cos(th)],0)  # d tip / d th_i
        W=x*x
        A=(Jm*W[None])@Jm.T
        d=W*(Jm.T@np.linalg.solve(A+1e-9*np.eye(2),r))
        th=th+np.clip(d,-0.2,0.2)
    return build(P,J,th,ln)
VARS3={'IKarc1':lambda P,a,b,w:ik(P,a,b,w,'arc',1.0),'IKarc2':lambda P,a,b,w:ik(P,a,b,w,'arc',2.0),'IKline1':lambda P,a,b,w:ik(P,a,b,w,'line',1.0),'IKarc05':lambda P,a,b,w:ik(P,a,b,w,'arc',0.5)}
img=Image.new('RGB',(len(VARS3)*130*K//2, 8*60*K//2+20),(20,20,26))
dr=ImageDraw.Draw(img)
for vi,(nm,fn) in enumerate(VARS3.items()):
    tips=[]; tops=[]; lefts=[]
    for fi,(a,b,w) in enumerate(SEQ):
        P=C[a]['Pm']*(1-w)+C[b]['Pm']*w
        Q=C[a]['Pm'] if w==0 else fn(P,a,b,w)
        tips.append(Q[0]); tops.append(Q[:J,1].min()); lefts.append(Q[:J,0].min())
        ox=vi*130*K//2; oy=fi*60*K//2+20
        dr.line([(ox+(p[0]-10)*K//2,oy+(p[1]-50)*K//2) for p in Q[:J+30]],fill=(200,200,90),width=2)
        dr.line([(ox,oy+(TOP-50)*K//2),(ox+120*K//2,oy+(TOP-50)*K//2)],fill=(90,40,40))
        dr.line([(ox+(LEFT-10)*K//2,oy),(ox+(LEFT-10)*K//2,oy+60*K//2)],fill=(90,40,40))
        dr.text((ox+2,oy+2),f'{nm} f{fi}',fill=(255,255,255))
    steps=[np.hypot(*(tips[(i+1)%8]-tips[i])) for i in range(8)]
    print(nm,'tip steps',[round(float(s),1) for s in steps],'tops',[round(float(t),1) for t in tops],'lefts',[round(float(t),1) for t in lefts], TOP, LEFT)
img.save('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/cobra-dev/tails3.png')

_tt = tip_target
def tip_target(P,a,b,w,mode):
    if mode.startswith('mix'):
        m=float(mode[3:])
        return _tt(P,a,b,w,'line')*(1-m)+_tt(P,a,b,w,'arc')*m
    return _tt(P,a,b,w,mode)
VARS4={'line05':lambda P,a,b,w:ik(P,a,b,w,'line',0.5),'line2':lambda P,a,b,w:ik(P,a,b,w,'line',2.0),'mix.5':lambda P,a,b,w:ik(P,a,b,w,'mix0.5',1.0),'mix.5p2':lambda P,a,b,w:ik(P,a,b,w,'mix0.5',2.0)}
img=Image.new('RGB',(len(VARS4)*130*K//2, 8*60*K//2+20),(20,20,26))
dr=ImageDraw.Draw(img)
for vi,(nm,fn) in enumerate(VARS4.items()):
    tips=[]; tops=[]; lefts=[]
    for fi,(a,b,w) in enumerate(SEQ):
        P=C[a]['Pm']*(1-w)+C[b]['Pm']*w
        Q=C[a]['Pm'] if w==0 else fn(P,a,b,w)
        tips.append(Q[0]); tops.append(Q[:J,1].min()); lefts.append(Q[:J,0].min())
        ox=vi*130*K//2; oy=fi*60*K//2+20
        dr.line([(ox+(p[0]-10)*K//2,oy+(p[1]-50)*K//2) for p in Q[:J+30]],fill=(200,200,90),width=2)
        dr.line([(ox,oy+(TOP-50)*K//2),(ox+120*K//2,oy+(TOP-50)*K//2)],fill=(90,40,40))
        dr.text((ox+2,oy+2),f'{nm} f{fi}',fill=(255,255,255))
    steps=[np.hypot(*(tips[(i+1)%8]-tips[i])) for i in range(8)]
    print(nm,'tip steps',[round(float(s),1) for s in steps],'tops',[round(float(t),1) for t in tops])
img.save('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/cobra-dev/tails4.png')
