"""reg.py <id> <n> x0 y0 x1 y1 [oursDir]: his reduction and ours in a region, hex. n=0: his window pixels."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import numpy as np
import m
jid, n = sys.argv[1], int(sys.argv[2])
x0, y0, x1, y1 = map(int, sys.argv[3:7])
d = sys.argv[7] if len(sys.argv) > 7 else m.SP + '/base'
if n == 0:
    m.dump(np.asarray(m.his_win(jid)).astype(float), x0, y0, x1, y1, 'his window')
else:
    m.dump(m.his(jid, n), x0, y0, x1, y1, 'his %d' % n)
    m.dump(m.ours(jid, n, d), x0, y0, x1, y1, 'ours %d (%s)' % (n, d.split('/')[-1]))
