import runpy, sys, numpy as np
from PIL import Image
sys.argv=['x','/home/user/Ninja-Fantasy-Game/docs/reference/poison-set-owner-reference.jpg','/tmp/x.ts']
g=runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/cobra-from-ref.py')
C=g['C']; M=g['M']; CW=g['CW']; CH=g['CH']
f=g['FRAMES'][3]; c=C['R']
base=C['L']['P'][-1]+(C['R']['P'][-1]-C['L']['P'][-1])*g['smoothstep'](0.6)
top=c['P'][-1]+np.round(base+np.array(f['strike'])-c['P'][-1])
Pt=g['target_spine']('L','R',0.6,'R',top)
yy,xx=np.mgrid[0:CH,0:CW]
Q=np.stack([xx.ravel(),yy.ravel()],1).astype(float)
s_,v_,d=g['project'](Pt,Q); u=g['to_index'](s_,Pt)
pt,nm=g['along'](dict(P=c['Pm'],N=c['Nm'],seg=c['segm']),u)
q=pt+nm*v_[:,None]; ix=np.clip(np.round(q[:,0]).astype(int),0,CW-1); iy=np.clip(np.round(q[:,1]).astype(int),0,CH-1)
w=np.where(v_>0,g['interp_profile'](c['wrm'],u),g['interp_profile'](c['wlm'],u))
A=np.abs(v_)<=w+1.0; B=c['coil_src'][iy,ix]
want=np.interp(np.clip(u,0,M-1),np.arange(M),c['s_of_sigma'])*(M-1)
want=np.where(u<0,u*c['segm']/c['seg'],want)
us=np.where(np.isnan(c['u'][iy,ix]),want,c['u'][iy,ix]); Cc=np.abs(us-want)*c['seg']<5
vis=np.zeros((CH*CW,3),np.uint8)
vis[A&B&Cc]=(0,200,0); vis[A&~B]=(200,0,0); vis[A&B&~Cc]=(255,255,0)
vis[(u<0)&A]=vis[(u<0)&A]//2+np.array([0,0,120],np.uint8)
vis=vis.reshape(CH,CW,3)[55:125,20:90]
Image.fromarray(vis).resize((70*7,70*7),Image.NEAREST).save('work/dbg3.png')
print('tip u range', u.min())
