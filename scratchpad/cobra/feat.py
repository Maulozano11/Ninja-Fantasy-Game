import runpy, sys, numpy as np
sys.argv=['x','/home/user/Ninja-Fantasy-Game/docs/reference/poison-set-owner-reference.jpg','/tmp/x.ts']
g=runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/cobra-from-ref.py')
C=g['C']; M=g['M']; AX=g['AX']; AY=g['AY']
for k in 'LR':
    P=C[k]['P']; y=P[:,1]; x=P[:,0]
    print(k)
    for i in range(3,M-3):
        if (y[i]>=y[i-3:i+4]).all() or (y[i]<=y[i-3:i+4]).all():
            print('  ', 'max' if y[i]>=y[i-1] else 'min', i, round(i/(M-1),3), 'xy rel anchor', round(x[i]-AX,1), round(y[i]-AY,1))
    for i in range(3,M-3):
        if (x[i]>=x[i-3:i+4]).all() or (x[i]<=x[i-3:i+4]).all():
            print('   x-ext', i, round(i/(M-1),3), 'xy', round(x[i]-AX,1), round(y[i]-AY,1))
