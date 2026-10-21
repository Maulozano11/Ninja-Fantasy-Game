import runpy, sys, numpy as np
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
conv = sys.argv[1]
out = sys.argv[2]
sys.argv=[conv,'/home/user/Ninja-Fantasy-Game/docs/reference/poison-set-owner-reference.jpg', out+'/tmp.ts']
g = runpy.run_path(conv, run_name='__main__')
C=g['C']; fly=g['fly']; BOX=g['BOX']
def up(a,k): return np.repeat(np.repeat(a,k,0),k,1)
bgc=np.array([31,33,46],np.float32)
for fi,k in ((0,'L'),(5,'R')):
    f=fly[fi].astype(np.float32)
    a=f[...,3:4]/255
    comp=f[...,:3]*a+bgc*(1-a)
    his=C[k]['col']
    x0,x1,y0,y1 = BOX[0]+100, BOX[0]+160, BOX[1]+55, BOX[1]+100
    m = np.zeros((y1-y0, x1-x0, 3), np.float32)
    vis=np.concatenate([his[y0:y1,x0:x1], np.full((y1-y0,1,3),200.), comp[y0:y1,x0:x1]],1)
    masks=np.zeros_like(his[y0:y1,x0:x1])
    masks[C[k]['body'][y0:y1,x0:x1]]=(60,120,60)
    masks[C[k]['hidden'][y0:y1,x0:x1]]=(255,0,255)
    masks[C[k]['retint'][y0:y1,x0:x1]]=(255,255,0)
    masks[(C[k]['purple']&~C[k]['body'])[y0:y1,x0:x1]&~C[k]['hidden'][y0:y1,x0:x1]]=(120,0,160)
    vis=np.concatenate([vis, np.full((y1-y0,1,3),200.), masks],1)
    Image.fromarray(up(vis.clip(0,255).astype(np.uint8),8)).save(f'{out}/neck-{fi}.png')
