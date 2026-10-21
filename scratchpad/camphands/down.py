rows = [
    '.p............PPPPPPPPPPPPPpp..',
    '.ppq..........PPPPPPPPPPPPPppp.',
    '..ppqp.......PPPPPPPPPPPPPPqqq.',
    '..qppqpp.....PPPPPPPPPPppppppp.',
    '...kppqppq..PPPPPPPppppPPPPooo.',
    '...okmpqppqpPPPppppPPPPoooodgg.',
    '....kmkkqppqpppPPPPoooodddddGg.',
    '....kmkkkkppPPPoooooCdddbbbbdC.',
    '....okmkkkkkooooCdddddbbbccbdC.',
    '.....kmkkkkkoCddddbbbbbccccbdC.',
    '.....okmkkkkoCdbbbbccccccccbdC.',
    '......kmkkkkoCdbcccccccccccbdC.',
    '......okmkkkobdbcccccccccccbdC.',
    '.......kmkkkoCdbcccccccccccbdC.',
    '.......kmkkkoCdbcccccbbbbbbbdg.',
    '.......okmkkobdbbbbbbbddddddGg.',
    '........kmkkoCddddddddooooooog.',
    '........ooko.oddoooooo.........',
    '...........o.oooo..............',
]
W0, H0 = 31, 19
import sys
W, H = int(sys.argv[1]), int(sys.argv[2])
out = []
for y in range(H):
    line = ''
    for x in range(W):
        x0, x1 = x * W0 / W, (x + 1) * W0 / W
        y0, y1 = y * H0 / H, (y + 1) * H0 / H
        wts = {}
        for sy in range(int(y0), min(H0, int(y1 + 0.999))):
            for sx in range(int(x0), min(W0, int(x1 + 0.999))):
                ox = max(0, min(x1, sx + 1) - max(x0, sx))
                oy = max(0, min(y1, sy + 1) - max(y0, sy))
                c = rows[sy][sx]
                wts[c] = wts.get(c, 0) + ox * oy
        tot = sum(wts.values())
        if wts.get('.', 0) > tot * 0.5:
            line += '.'
            continue
        wts.pop('.', None)
        # outline wins ties when it is a big share
        best = max(wts, key=lambda c: wts[c] * (1.25 if c == 'o' else 1))
        line += best
    out.append(line)
for l in out: print(repr(l) + ',')
