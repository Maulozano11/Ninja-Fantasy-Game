import numpy as np, sys
d=sys.argv[1]
SP=np.load(d+'/spines.npy'); TJ,jL,jR=np.load(d+'/tailj.npy')
for i,P in enumerate(SP):
    Q=P[:TJ+1]
    dd=np.diff(Q,axis=0); th=np.unwrap(np.arctan2(dd[:,1],dd[:,0]))
    L=np.concatenate([[0],np.cumsum(np.hypot(*dd.T))])
    # heading sampled every 3 px of length from low point to tip
    s=np.arange(0,L[-2],3.0)
    h=np.interp(s,L[:-1],th)
    k=np.degrees(np.diff(h))  # turn per 3 px
    k=np.convolve(k,np.ones(2)/2,'valid')
    sg=np.sign(np.where(np.abs(k)<2,0,k)); sg=sg[sg!=0]
    nflip=int((np.diff(sg)!=0).sum())
    print(i,'len %.0f'%L[-1],'turn/3px from tip to low pt:',np.round(k).astype(int).tolist(),'flips',nflip)
