# Runs the converter in-process (checks collected, nothing written past them) and keeps its globals.
import runpy, sys, pickle, numpy as np
conv = sys.argv[1]; out = sys.argv[2]
sys.argv = [conv, '/home/user/Ninja-Fantasy-Game/docs/reference/poison-set-owner-reference.jpg', out + '/tmp.ts', out + '/dbg']
import os; os.makedirs(out + '/dbg', exist_ok=True)
try:
    g = runpy.run_path(conv, run_name='__main__')
except SystemExit as e:
    print('EXIT', str(e)[:300])
    import traceback
    tb = sys.exc_info()[2]
    while tb.tb_next: tb = tb.tb_next
    g = tb.tb_frame.f_globals
keep = {k: g[k] for k in ('C','fly','PAL','MAIN','ACCENT','MISTPAL','OVERPAL','OUTLINE','AX','AY','CW','CH','FRAMES','TAIL_J','M') if k in g}
for k,c in keep['C'].items():
    keep['C'][k] = {kk: vv for kk, vv in c.items() if isinstance(vv,(np.ndarray,float,int,list))}
pickle.dump(keep, open(out+'/state.pkl','wb'))
