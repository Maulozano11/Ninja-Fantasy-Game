"""Replace the rows of one patch block in the study script: swap.py '<header line>' rows.txt"""
import sys
p = 'tools/refs/scarlet-study.py'
s = open(p).read()
head = sys.argv[1]
rows = open(sys.argv[2]).read().rstrip('\n').split('\n')
i = s.index(head)
i = s.index('\n', i) + 1
# the block's rows run until the first line that is not a row
lines = s[i:].split('\n')
n = 0
while lines[n].strip().startswith("'") and lines[n].strip().endswith("',"):
    n += 1
indent = lines[0][:len(lines[0]) - len(lines[0].lstrip())]
new = [indent + r.strip() for r in rows]
s = s[:i] + '\n'.join(new + lines[n:])
open(p, 'w').write(s)
print('replaced', n, 'rows with', len(new))
