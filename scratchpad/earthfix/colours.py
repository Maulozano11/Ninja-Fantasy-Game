import json, sys
import numpy as np
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
G=S+'/art2/staging/vfx_earth_v3/'
man=json.load(open(G+'manifest.json'))['sprites']
REF=Image.open(S+'/art2/REF-earth-set-owner.jpg').convert('RGB')
CFG={'sphere':((1801,236),2.35),'multi_hit':((750,556),2.35),'wall':((379.5,1177),2.34),'wall_depth':((140,1736),2.26),'multi':((444,557),2.35),'hit':((962,562),2.35)}
KEY={'hit':('hit',3),'multi_hit':('hit',3)}
def frame(n):
    m=man[n]; an=m['anims']
    a,i=('idle',0) if 'idle' in an and 'rise' in an else KEY.get(n,(list(an)[0],0))
    sh=Image.open(G+m['file']).convert('RGBA'); fw,fh=m['frameW'],m['frameH']; r=an[a]['row']
    return np.asarray(sh.crop((i*fw,r*fh,(i+1)*fw,(r+1)*fh))).astype(float)
def his(n):
    m=man[n]; (hx,hy),s=CFG[n]; ax,ay=m['anchor']; W,H=m['frameW'],m['frameH']
    return np.asarray(REF.resize((W,H),Image.BOX,box=(hx-ax*s,hy-ay*s,hx+(W-ax)*s,hy+(H-ay)*s))).astype(float)
def comp(f,bg=(34,34,45)):
    a=f[...,3:]/255; return f[...,:3]*a+np.array(bg)*(1-a)
for n in ['sphere']:
    f=frame(n); h=his(n); o=comp(f)
    g=lambda c:((c[...,1]>c[...,0]+3)&(c[...,1]>c[...,2]+20)).sum()
    print(n,'green px his',g(h),'ours',g(o))
    print(' his x29-37,y30-37 mean',h[30:38,29:38].reshape(-1,3).mean(0).round(), 'ours',o[30:38,29:38].reshape(-1,3).mean(0).round())
for n in ['multi_hit','hit']:
    f=frame(n); h=his(n); o=comp(f, (23,22,30) if n=='multi_hit' else (34,34,45))
    m=f[...,3]>200
    def st(c):
        mx=c.max(-1); mn=c.min(-1); return ((mx-mn)/np.maximum(mx,1))[m].mean(), (0.3*c[...,0]+0.59*c[...,1]+0.11*c[...,2])[m].mean()
    print(n,'sat/bright his %.2f %.0f'%st(h),'ours %.2f %.0f'%st(o))
f=frame('wall'); o=comp(f); h=his('wall')
ys,xs=np.nonzero(f[...,3]>0); yb=ys.max()
# ground strip: high-chroma pixels in the bottom 10 rows
def amb(c,rows):
    sub=c[rows].reshape(-1,3); sel=sub[(sub[:,2]<0.45*sub[:,0])&(sub[:,0]>140)]
    return len(sel), sel.mean(0).round() if len(sel) else None
print('wall bottom amber his',amb(h,slice(yb-12,yb+1)),'ours',amb(o,slice(yb-12,yb+1)))
f=frame('wall_depth'); o=comp(f); h=his('wall_depth')
ys,xs=np.nonzero(f[...,3]>0); yb=ys.max()
print('wall_depth bottom amber his',amb(h,slice(yb-30,yb+1)),'ours',amb(o,slice(yb-30,yb+1)))
f=frame('wall_depth'); o=comp(f); h=his('wall_depth')
print('pebble his', h[243:250,77:83].reshape(-1,3).mean(0).round(), 'ours', o[243:250,77:83].reshape(-1,3).mean(0).round())
sub=o[240:252,74:86].reshape(-1,3); print('ours most orange', sub[np.argmax(sub[:,0]-sub[:,2])])
sub=h[240:252,74:86].reshape(-1,3); print('his most orange', sub[np.argmax(sub[:,0]-sub[:,2])])
f=frame('multi'); o=comp(f); h=his('multi')
# streak pixels: thin pale near-horizontal; compare brightest 30 px luminance
L=lambda c:0.3*c[...,0]+0.59*c[...,1]+0.11*c[...,2]
print('multi top-40 bright mean his', np.sort(L(h).ravel())[-40:].mean().round(), 'ours', np.sort(L(o).ravel())[-40:].mean().round())
