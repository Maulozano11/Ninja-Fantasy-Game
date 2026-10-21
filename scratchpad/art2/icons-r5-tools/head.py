# Composes the Kirin 44 head patch: each row is a list of (x, chars) runs; prints TS rows.
import sys
X0, Y0, X1, Y1 = 19, 9, 43, 36
R = {
 9:  [(36, 'bsb')],
 10: [(35, 'boqb')],
 11: [(36, 'boqb')],
 12: [(36, 'boqb')],
 13: [(28, 'bbbbb'), (37, 'boqb')],
 14: [(26, 'bbooqqqbb'), (37, 'boqb')],
 15: [(25, 'bmnoqqqqqqbbbnoqb')],
 16: [(24, 'bkmnobbbbbqqqqoooob')],
 17: [(23, 'bkmnnoooocbbbbooooonb')],
 18: [(22, 'bkkmnnnoobcrrcnnnnnnb')],
 19: [(22, 'bjkmmnnnnnnnnnnnnnmmb')],
 20: [(21, 'bjkkmmmmmmmmmmmmmmkkkb')],
 21: [(21, 'bjbbbbbkkkkkkkkkkjjjjb')],
 22: [(21, 'bbqrrrqbbbbbbbbjjjjjb')],
 23: [(21, 'bkrsssrrrbbrrbbrrbbbbjb')],
 24: [(21, 'bkqsssssrrssbcrsssbrrb')],
 25: [(22, 'bkrssssrqsdddcsss.sb')],
 26: [(22, 'bkqrssrqqddddddcs')],
 27: [(23, 'bkqrrqqdddddc')],
 28: [(23, 'bksqhdddddc')],
 29: [(24, 'bkhdddddc')],
 30: [(24, 'bmkhsddc')],
 31: [(25, 'bmkhdsb')],
 32: [(25, 'bmmkhkb')],
 33: [(26, 'bmmkkb')],
 34: [(27, 'bbmmb')],
 35: [(29, 'bbb')],
}
rows = []
for y in range(Y0, Y1 + 1):
    line = ['.'] * (X1 - X0 + 1)
    for x, run in R.get(y, []):
        for i, ch in enumerate(run):
            line[x + i - X0] = ch
    rows.append(''.join(line).rstrip('.'))
print('  x0: %d,\n  y0: %d,\n  rows: [' % (X0, Y0))
for y, r in zip(range(Y0, Y1 + 1), rows):
    print("    '%s', // %d" % (r, y))
print('  ],')
