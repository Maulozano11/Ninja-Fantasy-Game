import numpy as np, sys
d=sys.argv[1]
SP=np.load(d+'/spines.npy'); TJ,jL,jR=[int(v) for v in np.load(d+'/tailj.npy')]
out=[]
for i,P in enumerate(SP):
    Q=P[:TJ+12]
    dd=np.diff(Q,axis=0); th=np.unwrap(np.arctan2(dd[:,1],dd[:,0]))
    L=np.concatenate([[0],np.cumsum(np.hypot(*dd.T))])
    s=np.arange(0,L[-2],1.0); h=np.interp(s,L[:-1],th)
    k=np.degrees(h[3:]-h[:-3])  # turn per 3 px
    # skip the tip piece (first 14 px)
    out.append(int(np.abs(k[14:]).max()))
print('max |turn per 3 px| past the tip piece, per frame:', out)
