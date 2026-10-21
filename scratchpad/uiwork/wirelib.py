import math
class G:
    def __init__(s,W,H): s.W,s.H=W,H; s.g=[['.']*W for _ in range(H)]
    def P(s,x,y,c='L'):
        if 0<=x<s.W and 0<=y<s.H: s.g[y][x]=c
    def seq(s,pts,c='L'):
        for p in pts: s.P(p[0],p[1],c)
    def stamp(s,x0,y0,rows,keys=None):
        for j,r in enumerate(rows):
            for i,ch in enumerate(r):
                if ch!='.' and ch!=' ': s.P(x0+i,y0+j,(keys or {}).get(ch,ch))
    def clear(s,pts):
        for x,y in pts: s.P(x,y,'.')
    def tone(s,v):
        return 'H' if v>0.55 else 'L' if v>0.05 else 'l' if v>-0.45 else 'M'
    def arcband(s,cx,cy,r0,r1,a0,a1,inner_dark=True):
        """band between radii r0..r1 for angles a0..a1 (degrees, screen: 0=right, 90=down), tube-shaded."""
        L=(-0.6,-0.8)
        for y in range(s.H):
            for x in range(s.W):
                dx,dy=x+0.5-cx,y+0.5-cy; r=math.hypot(dx,dy)
                if r<r0 or r>r1: continue
                a=math.degrees(math.atan2(dy,dx))%360
                lo,hi=a0%360,a1%360
                ok = lo<=a<=hi if lo<=hi else (a>=lo or a<=hi)
                if not ok: continue
                n=(dx/r,dy/r) if r else (0,0)
                v=n[0]*L[0]+n[1]*L[1]
                mid=(r0+r1)/2
                if r1-r0>1.4 and r<mid and inner_dark: v=-v*0.6-0.2
                s.P(x,y,s.tone(v))
    def out(s):
        return [''.join(r) for r in s.g]

def raster(pts):
    """8-connected, pixel-perfect pixels along a dense polyline of float points."""
    dense=[]
    for i in range(len(pts)-1):
        (x0,y0),(x1,y1)=pts[i],pts[i+1]
        n=max(1,int(math.hypot(x1-x0,y1-y0)*6))
        for k in range(n):
            t=k/n; dense.append((x0+(x1-x0)*t,y0+(y1-y0)*t))
    dense.append(pts[-1])
    px=[]
    for x,y in dense:
        q=(math.floor(x),math.floor(y))
        if not px or px[-1]!=q:
            if px and abs(px[-1][0]-q[0])>1 or px and abs(px[-1][1]-q[1])>1:
                pass
            px.append(q)
    # drop L-corners iteratively
    changed=True
    while changed:
        changed=False
        for i in range(1,len(px)-1):
            a,b=px[i-1],px[i+1]
            if abs(a[0]-b[0])==1 and abs(a[1]-b[1])==1:
                del px[i]; changed=True; break
    return px
def bez(p0,c,p1,n=60):
    return [((1-t)**2*p0[0]+2*(1-t)*t*c[0]+t*t*p1[0],(1-t)**2*p0[1]+2*(1-t)*t*c[1]+t*t*p1[1]) for t in [i/n for i in range(n+1)]]
def cbez(p0,c0,c1,p1,n=80):
    out=[]
    for i in range(n+1):
        t=i/n; s=1-t
        out.append((s**3*p0[0]+3*s*s*t*c0[0]+3*s*t*t*c1[0]+t**3*p1[0], s**3*p0[1]+3*s*s*t*c0[1]+3*s*t*t*c1[1]+t**3*p1[1]))
    return out

def tube(g,px,hi='L',lo='l',hi2=None,below=True):
    """a 2-px stroke: the raster pixels lit, the pixel under each (or right of it on steep runs) shaded."""
    for i,(x,y) in enumerate(px):
        a=px[max(0,i-1)]; b=px[min(len(px)-1,i+1)]
        dx,dy=b[0]-a[0],b[1]-a[1]
        steep=abs(dy)>abs(dx)
        if g.g[y][x] in '.lM': g.P(x,y,hi)
        sx,sy=(x+1,y) if steep else (x,y+1)
        if 0<=sx<g.W and 0<=sy<g.H and g.g[sy][sx]=='.': g.P(sx,sy,lo)
