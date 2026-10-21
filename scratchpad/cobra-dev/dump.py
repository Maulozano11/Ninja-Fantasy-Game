import runpy, sys, pickle, numpy as np
conv = sys.argv[1]; out = sys.argv[2]
sys.argv=[conv,'/home/user/Ninja-Fantasy-Game/docs/reference/poison-set-owner-reference.jpg', out+'/tmp.ts']
g = runpy.run_path(conv, run_name='__main__')
keep = {k: g[k] for k in ('C','fly','BOX','PAL','MISTPAL','OVERPAL','OUTLINE','AX','AY','CW','CH','FRAMES','LIGHT','MASS')}
for k,c in keep['C'].items():
    keep['C'][k] = {kk: vv for kk, vv in c.items() if isinstance(vv,(np.ndarray,float,int,list))}
pickle.dump(keep, open(out+'/state.pkl','wb'))
