"""Hair template surgery on src/sprite/items/hair.ts.
usage: tpl.py show STYLE PART      (PART f|b|crest)
       tpl.py edit STYLE PART 'cols=4,6' 'rows=3,5'   -> deletes those columns/rows, fixes the anchor
"""
import re, sys
P = '/home/user/Ninja-Fantasy-Game/src/sprite/items/hair.ts'
src = open(P).read()

def locate(style, part):
    if style == 'hair_crest':
        m = re.search(r"const CREST_TEMPLATE = \[\n(.*?)\n\];", src, re.S)
        a = re.search(r"const CREST_ANCHOR: \[number, number\] = \[(\d+), (\d+)\];", src)
        return m, a
    start = src.index(f'  {style}: {{')
    m = re.compile(rf"    {part}: \[\n(.*?)\n    \],", re.S).search(src, start)
    a = re.compile(rf"    {part}a: \[(\d+), (\d+)\],").search(src, start)
    return m, a

def rows_of(m):
    return [re.match(r"\s*'(.*)',", l).group(1) for l in m.group(1).split('\n')]

cmd, style, part = sys.argv[1:4]
m, a = locate(style, part)
rows = rows_of(m)
ax, ay = int(a.group(1)), int(a.group(2))
if cmd == 'show':
    print('anchor', ax, ay, 'size', len(rows[0]), 'x', len(rows))
    print('    ' + ''.join(str(c % 10) for c in range(len(rows[0]))))
    for i, r in enumerate(rows): print(f'{i:3} {r}' + ('   <- anchor row' if i == ay else ''))
    sys.exit()
ops = dict(x.split('=') for x in sys.argv[4:])
dc = sorted({int(x) for x in ops.get('cols', '').split(',') if x}, reverse=True)
dr = sorted({int(x) for x in ops.get('rows', '').split(',') if x}, reverse=True)
for c in dc:
    rows = [r[:c] + r[c + 1:] for r in rows]
    if c < ax: ax -= 1
for r in dr:
    del rows[r]
    if r < ay: ay -= 1
# drop fully empty edge rows/cols
while rows and set(rows[0]) <= {'.'}: rows.pop(0); ay -= 1
while rows and set(rows[-1]) <= {'.'}: rows.pop()
while all(r[0] == '.' for r in rows): rows = [r[1:] for r in rows]; ax -= 1
while all(r[-1] == '.' for r in rows): rows = [r[:-1] for r in rows]
ind = '  ' if style == 'hair_crest' else '      '
body = '\n'.join(f"{ind}'{r}'," for r in rows)
s, e = m.span(1)
out = src[:s] + body + src[e:]
# anchor (position unchanged by the body edit if it precedes; recompute)
m2, a2 = None, None
src = out
m2, a2 = locate(style, part)
s, e = a2.span(1)[0], a2.span(2)[1]
src = src[:s] + f'{ax}, {ay}' + src[e:]
open(P, 'w').write(src)
print('ok', style, part, 'anchor', ax, ay, 'size', len(rows[0]), 'x', len(rows))
