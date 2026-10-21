import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/heroine/work2')
from draw import Canvas, far_shift, near_shift, stretch

blocks = []
X0, Y0, X1, Y1 = 92, 147, 184, 222

# --- clear the auto body below the head (and the auto staff) ---
c = Canvas(X0, Y0, X1, Y1, '.')
for y in range(151, Y1):
    c.h(X0, X1 - 1, y, '_')
for y in range(147, 151):
    c.h(112, 121, y, '_')
    c.h(136, X1 - 1, y, '_')
blocks.append(c.block('None'))

# --- the skirt's side and back panels behind her legs: white, the pale lining, gold-embroidered hems ---
c = Canvas(X0, Y0, X1, Y1, ' ')
near_panel = {}
for y in range(173, 207):
    a = max(101, 116 - (y - 173) * 15 // 30)
    b = 121 if y < 190 else 120
    near_panel[y] = (a, b)
for y, (a, b) in near_panel.items():
    for x in range(a, b + 1):
        t = (x - a) / max(1, b - a)
        c.p(x, y, 'w' if t < 0.3 else 'W' if t < 0.55 else 'c' if t < 0.8 else 'C')
    c.p(a, y, 'o')
for y in range(198, 207):
    a, b = near_panel[y]
    c.h(a + 1, a + 8, y, 'W')
c.art(103, 199, ['o O o', ' oYo  o', 'o  O o', ' YoY'])
c.h(101, 112, 206, 'Y')
c.h(101, 112, 207, 'k')
# the pale grey lining between her legs
for y in range(186, 207):
    for x in range(121, 135):
        c.p(x, y, 'C' if (x + y) % 5 else 'v')
    c.p(127, y, 'v')
far_panel = {}
for y in range(173, 207):
    a = 133 + (y - 173) // 8
    b = min(147, 135 + (y - 173) * 12 // 30)
    far_panel[y] = (a, b)
for y, (a, b) in far_panel.items():
    for x in range(a, b + 1):
        c.p(x, y, 'C' if x < a + 2 else 'W' if x < b - 1 else 'w')
    c.p(b, y, 'o')
c.h(far_panel[206][0], far_panel[206][1], 206, 'Y')
blocks.append(c.block('coat'))

# --- far leg: the thigh in the slit, the white boot with its gold lace top, the gold heeled shoe ---
c = Canvas(X0, Y0, X1, Y1, ' ')
c.bent(131, 176, stretch([
    ' kCCCCck',
    ' kCcCCck',
    ' kcCCCczk',
    ' kzSSSszk',
    ' kzSSSszk',
    ' kzSSSszk',
    ' kzSSSszk',
    'kYoYoYoYk',
    'kOYyYyYOk',
    'kYoYoYoYk',
    ' kwWWccCk',
    ' kwWWccCk',
    ' kwWWcCCk',
    ' kwWWcCk',
    ' kwWWcCk',
    ' kwWWcCk',
    ' kwWWcCk',
    ' kwWWcCk',
    ' kwWWcCk',
    ' kwWWcCk',
    ' kwWWcCk',
    ' kwWWcCk',
    ' kwWWcCkk',
    ' kwWWccCCkk',
    ' kyYYYYYYoOkk',
    ' kYYyYYYYYooOk',
    ' kOoOkkkOooOOOk',
    ' kOOk   kkkkkkk',
    '  kk',
], 14, 6), far_shift)
blocks.append(c.block('legF'))

# --- near leg ---
c = Canvas(X0, Y0, X1, Y1, ' ')
c.bent(115, 176, stretch([
    ' kCCcCCck',
    ' kCCCcCck',
    ' kcCCCCck',
    ' kzSSSSszk',
    ' kzSSSSszk',
    ' kzSSSSszk',
    ' kzSSSSszk',
    ' kzSSSSszk',
    'kYoYoYoYok',
    'kOYyYyYyOk',
    'kYoYoYoYok',
    ' kwwWWccCk',
    ' kwwWWccCk',
    ' kwwWWcCCk',
    ' kwwWWcCk',
    ' kwwWWcCk',
    ' kwwWWcCk',
    ' kwwWWcCk',
    ' kwwWWcCk',
    ' kwwWWcCk',
    ' kwwWWcCk',
    ' kwwWWcCk',
    ' kwwWWcCk',
    ' kwwWWcCk',
    ' kwwWWcCk',
    ' kwwWWcCk',
    ' kwWWWcCk',
    ' kwWWccCk',
    ' kwWWcCCk',
    'kwwWWccCk',
    'kwwWWccCk',
    'kwWWcccCk',
    'kYYyyYYYok',
    'kYyyYYYooOk',
    'kOYYYYoOOOk',
    ' kkkkkkkkkk',
], 16, 7), near_shift)
blocks.append(c.block('legN'))

# --- the front panel over her legs: white, gold borders, her gold embroidery, a point at the bottom ---
c = Canvas(X0, Y0, X1, Y1, ' ')
c.art(122, 173, [
    'kYwwwwwwYk',
    'kYwXwwwwYk',
    'kYwwowwwYk',
    'kYwoYowwYk',
    'kYwwowwWYk',
    'kYwwwwwWYk',
    'kYwwYwwWYk',
    'kYwoYowWYk',
    'kYwwYwwWYk',
    'kYwwwwwWYk',
    'kYwwwwwWYk',
    'kYwwwwwWYk',
    'kYwwwwwWYk',
    'kYwwwwWWYk',
    'kYwwwwWWYk',
    'kYwwowWWYk',
    'kYwoYoWWYk',
    'kYwYoYoWYk',
    'kYwoYoWWYk',
    'kYwwowWWYk',
    'kYwwwwWWYk',
    'kYwwwwWWYk',
    'kYwwwwWcYk',
    ' kYwwWcYk',
    ' kYwwWcYk',
    '  kYwWYk',
    '  kYwcYk',
    '   kYYk',
    '    kk',
])
blocks.append(c.block('skirt'))

# --- far arm: the shoulder, the gold band, the white sleeve with its gold-trimmed cuff ---
c = Canvas(X0, Y0, X1, Y1, ' ')
c.art(132, 152, [
    '  kkkk',
    ' kSSSzk',
    ' kSSSzk',
    ' kzSzzk',
    ' kYoYoYk',
    ' kOYYYOk',
    '  kwWcCk',
    '  kwWcCk',
    '  kwWccCk',
    '  kwWWcCk',
    '  kwWWcCCk',
    '  kwWWccCk',
    '  kwWWccCCk',
    '  kwWWWcCCk',
    '  kwWWWccCCk',
    '  kwWWWcCCYk',
    '  kwWWWcCYoYk',
    '  kwWWcCYoYkk',
    '  kYoYoYoYk',
    '  kkkkkkkk',
])
blocks.append(c.block('armF'))
c = Canvas(X0, Y0, X1, Y1, ' ')
c.art(139, 171, [
    ' kkkkk',
    'kSSSszk',
    'kSSSszk',
    'kzSzszk',
    ' kzkzk',
])
blocks.append(c.block('handF'))

# --- torso: the high collar and the gem, the white bodice, gold embroidery, the gold sash, belt, pouch ---
c = Canvas(X0, Y0, X1, Y1, ' ')
c.art(119, 148, [
    '    kkkkkkk',
    '    kYwwwYk',
    '    kYwWwYk',
    '    kYWGWYk',
    '   kkYgigYkk',
    '  kSzkYgYkzSk',
    ' kwwwwkYkwwwwk',
    'kwwwwwoYowwwwWk',
    'kwXwwwwYwwwwwWk',
    'kwwwoYoYoYowwWk',
    'kwwwwoYYYowwWWk',
    'kWwwwwoYowwwWWk',
    ' kWwwwwYwwwwWk',
    ' kWwwwoYowwwWk',
    ' kWwwwwYwwwWWk',
    ' kWWwwoYowwWWk',
    ' kWWwwwYwwwWWk',
    ' kWWwwoYowwWck',
    'kkkkkkkkkkkkkkkk',
    'kYyyYYYyyYYYYYok',
    'kOYYYOoYYYOYYOOk',
    'knNbBNNkikNNbBNk',
    'knnnnnnkkknnnnnk',
    ' kkkkkkkkkkkkkk',
])
c.art(111, 168, [
    ' kkkkkk',
    'kBlllBk',
    'kBlYlBk',
    'kBbbbbk',
    'kbbbbNk',
    'knnnnnk',
    ' kkkkk',
    '  krk',
    '   k',
])
blocks.append(c.block('torso'))

# --- near arm: the shoulder, the gold band, the wide white sleeve with its gold cuff, the open hand ---
c = Canvas(X0, Y0, X1, Y1, ' ')
c.art(103, 151, [
    '         kkkkk',
    '        kSSSSSk',
    '       ksSSSSSzk',
    '       ksSSSSSzk',
    '       kzSSSSzZk',
    '      kYoYoYoYok',
    '      kOYYYYYYOk',
    '      kwwWWccCk',
    '     kwwwWWccCk',
    '     kwwwWWccCk',
    '    kwwwWWWcCCk',
    '    kwwwWWWcCCk',
    '   kwwwWWWccCCk',
    '   kwwwWWWccCk',
    '  kwwwWWWccCCk',
    '  kCwwWWWccCCk',
    ' kYCCwWWWccCCk',
    ' kYoCCcWWccCCk',
    'kYkYoYCCcccCCk',
    'kk  kkYoYoYCCk',
    '        kkkYoYk',
    '      kSSSkkkk',
    '      kSSSszk',
    '      kSzSzszk',
    '      kzkzkzk',
    '       k k k',
])
blocks.append(c.block('armN'))
blocks.append(c.below(172).block('handN'))

# --- the staff: the silver shaft from her far hand, the gold cross-piece, the ring and the pearl, the wings ---
c = Canvas(X0, Y0, X1, Y1, ' ')
c.art(141, 175, [
    'kk',
    'kekk',
    ' kEekk',
    '  kkEek',
    '    kEek',
    '     kkEk',
])
blocks.append(c.block('blade'))
c = Canvas(X0, Y0, X1, Y1, ' ')
c.art(146, 177, [
    '        kk        kkk',
    '       kYyk   kkkkYyyk',
    '   k   kYOk kkYyyYYYOOkk',
    '  kYk kYyOkkYyYYOOOkkk',
    '  kYYkkYOkkYOOkkkkk',
    '   kYYYYk kVLLVk',
    '  kYOYOk kLXXweLk',
    '   kkkOk kLXwwecLk',
    '     kYkkVwwwecLk',
    '     kYOkLwwecVLk',
    '    kYyOkkLeeLLk',
    '    kYYOk kLLLk',
    '    kYyOk  kkk',
    '     kYOk',
    '     kYOOk',
    '      kYOk',
    '       kOk',
    '        k',
])
blocks.append(c.block('hilt'))

# --- the light from the pearl: pale rays fanning down, sparkles ---
c = Canvas(X0, Y0, X1, Y1, ' ')
for i, x in enumerate(range(151, 171, 2)):
    top = 192 + abs(x - 160) // 3
    for y in range(top, min(top + 20 - abs(x - 160), 216)):
        c.p(x, y, 'Q' if y < top + 9 else 'H')
for x, y in [(170, 186), (172, 192), (150, 205), (166, 208), (171, 200), (161, 214), (174, 180)]:
    c.p(x, y, 'y')
blocks.append(c.block('glow'))

# --- head: her blue eyes, mouth ---
h = Canvas(120, 136, 136, 149, ' ')
h.art(122, 138, [
    ' kkkkkk  kk',
    ' kw12k   1k',
    '  w12z   2',
    '',
    '',
    '',
    '',
    '       ZZ',
])
blocks.append(h.block('head'))

print('\n'.join(blocks))
