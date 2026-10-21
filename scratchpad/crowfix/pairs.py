import itertools, numpy as np
S=0.7742
AL=(384.4,905.3); AR=(665.2,902.6)
L={'L4':(329,928),'L1':(308,863),'L2':(468,852),'L3':(446,924)}
R={'R1':(665,887),'R2':(712,874),'R4':(761,911),'R3':(700,901),'R5':(667,934),'R6':(734,944)}
gl={k:np.array([(x-AL[0])*S,(y-AL[1])*S]) for k,(x,y) in L.items()}
gr={k:np.array([(x-AR[0])*S,(y-AR[1])*S]) for k,(x,y) in R.items()}
for k,v in gl.items(): print(k, v.round(1))
for k,v in gr.items(): print(k, v.round(1))
VC=np.array([(383-AL[0])*S,(933-AL[1])*S]); print('VC',VC.round(1))
best=[]
for perm in itertools.permutations(R.keys(),4):
    d=[np.linalg.norm(gl[l]-gr[r]) for l,r in zip(L.keys(),perm)]
    best.append((max(d),sum(d),perm,[round(x,1) for x in d]))
best.sort()
for b in best[:8]: print(b)
cur=('R5','R1','R2','R6')
print('current', [round(np.linalg.norm(gl[l]-gr[r]),1) for l,r in zip(L.keys(),cur)])
for r in R: print(r,'to VC', round(np.linalg.norm(gr[r]-VC),1))
