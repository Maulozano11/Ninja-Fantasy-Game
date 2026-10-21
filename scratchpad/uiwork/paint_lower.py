import sys, math; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/uiwork')
from wirelib import G, raster, bez, cbez, tube
g=G(40,16)
# the sweep: a two-row tube from the outer tip down to the plaque's bottom corner (steep at the
# tip, flattening toward the plaque)
tube(g,raster(cbez((3.5,3.5),(8,9.5),(16,14.6),(34,14.6))),'H','M')
for y in range(16):
    for x in range(40):
        if g.g[y][x]=='H' and x>13: g.P(x,y,'L')
        if g.g[y][x]=='M' and x>15: g.P(x,y,'l')
# the curled tip at the outer end
g.stamp(0,0,['.LL.','L..l','L.M.','.l..'])
# the eye: a pale ring with two dark dots, sitting on the sweep, under a metal brow
g.stamp(9,2,['..ooo..','.o...o.','o.K.K.o','o.....o','.o...o.','..ooo..'])
for (x,y) in [(11,3),(12,3),(13,3),(10,4),(11,4),(13,4),(14,4),(10,5),(11,5),(12,5),(13,5),(14,5),(11,6),(12,6),(13,6),(12,4)]:
    if g.g[y][x]=='.': g.P(x,y,'c' if y<5 else 'C')
for x,y in raster(bez((7.5,2.5),(12,-1.5),(17.5,3.5))): g.P(x,y,'L')
g.P(17,4,'l'); g.P(17,5,'M')
# the X binding by the plaque's end: two C-curves back to back, curled at their tips
tube(g,raster(cbez((20.5,1.5),(25.5,4),(25.5,9),(20.5,11.5))),'L','M')
tube(g,raster(cbez((29.5,1.5),(24.5,4),(24.5,9),(29.5,11.5))),'L','M')
g.stamp(30,10,['.l','..','..'][0:1]); g.stamp(29,12,['l.'])
g.stamp(18,0,['LL.','..L'][0:1]); g.P(19,1,'.')
g.P(30,1,'l'); g.P(31,0,'L'); g.P(32,0,'l')
# small curls on the bar wire and under the sweep
g.stamp(4,0,['.L.','L.l'])
g.stamp(6,9,['.l.','M.M','.M.'])
g.stamp(13,13,['.l.','M.M','.M.'])
for r in g.out(): print("  '"+r+"',")
