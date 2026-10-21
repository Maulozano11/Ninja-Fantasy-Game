import sys
p = sys.argv[1]
new = open(sys.argv[2]).read()
s = open(p).read()
head = "// ---------------------------------------------------------------------------\n// BROWN - Shattered Earth"
anchor = "// ---------------------------------------------------------------------------\n// Idle aura: pulsing rim + a few color-flavored motes\n"
a = s.index(head)
b = s.index(anchor)
s = s[:a] + new + s[b:]
old = """      case 'brown':
        // a pebble lifting off and drifting up
        if (age < 9) rock(c, 1, x0, y0 - age * 0.7 * S, age < 6 ? 3 : 4);
        break;
"""
if old in s:
    s = s.replace(old, """      case 'brown':
        // a pebble lifting off and drifting up
        if (age < 9) boulder(c, 1, x0, y0 - age * 0.7 * S, (age < 6 ? 1.1 : 0.7) * S, c.seed + k * 13 + cyc);
        break;
""")
open(p, 'w').write(s)
print('ok')
