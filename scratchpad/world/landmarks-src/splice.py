# Replace the code between "// @section NAME" and "// @end NAME" in landmarks.ts with a file's content
# (or append a new section before "// @main" when it does not exist yet).
import sys
p = '/home/user/Ninja-Fantasy-Game/tools/world-sprites/landmarks.ts'
name, src = sys.argv[1], sys.argv[2]
s = open(p).read()
body = open(src).read()
a, b = f'// @section {name}\n', f'// @end {name}\n'
if a in s:
    i = s.index(a) + len(a)
    j = s.index(b)
    s = s[:i] + body + s[j:]
else:
    k = s.index('// @main\n')
    s = s[:k] + a + body + b + '\n' + s[k:]
open(p, 'w').write(s)
print('spliced', name)
