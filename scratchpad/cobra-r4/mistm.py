import sys, numpy as np
fly=np.load(sys.argv[1]).astype(np.int32)
# canvas coords; hump-top box
x0,y0,x1,y1=[int(v) for v in sys.argv[2].split(',')]
res=[]; tot=[]
for f in fly:
    r,g,b,a=f[...,0],f[...,1],f[...,2],f[...,3]
    pur=(r>g+10)&(b>g+10)&(a>0)
    s=(a*pur)[y0:y1,x0:x1].sum()/255.0
    res.append(round(float(s),1)); tot.append(round(float((a*pur).sum()/255.0),1))
print('box',res); print('all mist',tot)
pk=max(res)
print('steps % of peak',[round((res[(i+1)%8]-res[i])/pk*100,1) for i in range(8)])
