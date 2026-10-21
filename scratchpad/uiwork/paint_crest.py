import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/uiwork')
from wirelib import G
g=G(48,22)
# rail: a rope along the bar's top rail
for x in range(1,39): g.P(x,21,'M' if x%2 else 'l')
# foot: a small curl at the outer end and a bigger one beside it
g.arcband(2,18,1.0,2.2,0,360); g.clear([(2,18),(1,17),(2,17),(1,18)])
g.stamp(0,16,['.LL.','L..l','L..M','.MM.'])
g.stamp(5,15,['.LLL.','L...l','L.M.M','.l..M','..MM.'])
# the arm: a two-row wave, lit above and shaded below, rising from the rail to a crest and
# coming down on the right into the neck of the tall curl
top=[(10,19),(11,18),(12,17),(13,16),(14,15),(15,14),(16,13),(17,12),(18,12),(19,11),(20,11),(21,10),(22,10),(23,10),(24,10),(25,10),(26,10),(27,11),(28,11),(29,12)]
g.seq(top,'L'); g.seq([(16,13),(17,12),(18,12),(19,11),(20,11),(21,10),(22,10),(23,10)],'H')
bot=[(10,20),(11,19),(12,18),(13,17),(14,16),(15,15),(16,14),(17,13),(18,13),(19,12),(20,12),(21,11),(22,11),(23,11),(24,11),(25,11),(26,11)]
g.seq(bot,'l'); g.seq(bot[:6],'M')
# under the arch: the pale hollow bead and a small curl beside it
g.stamp(21,13,['.oo.','occo','oCCo','.oo.'])
g.stamp(26,13,['.ll.','M...','M.M.','.M..'])
# a small curl on the rail under the arm
g.stamp(14,18,['.LL.','L..l','.MM.'])
g.seq([(18,19),(19,20)],'M')
# the tall curl at the trough end: a thick round scroll (lit outside up-left) curling in to an eye
g.arcband(35.5,5.5,3.5,5.6,150,95)
g.arcband(35.5,5.5,1.2,2.4,200,120,False)
g.clear([(35,5)])
# neck: a thick S from the bottom of the tall curl down to the rail, with curls in its bays
for y,x in [(8,31),(9,31),(10,31),(11,30),(12,29),(13,29),(14,30),(15,31),(16,32),(17,32),(18,31),(19,30),(20,30)]:
    g.P(x,y,'L' if y<15 else 'l'); g.P(x+1,y,'l' if y<15 else 'M')
g.P(29,12,'H'); g.P(29,13,'H')
g.stamp(32,11,['.LL','L..','L.M','.M.'])
g.stamp(34,16,['.L','L.','.M'])
g.stamp(27,17,['ll.','..M','.M.'])
# tail out to a knob over the trough
g.seq([(41,2),(42,2),(43,2)],'L'); g.stamp(44,1,['.L.','L.l','.M.'])
for r in g.out(): print("  '"+r+"',")
