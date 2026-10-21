import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/heroine/work2')
from draw import Canvas, far_shift, near_shift, stretch

blocks = []

# --- clear the auto body (keep the long hair at the left and the head) ---
c = Canvas(96, 149, 156, 221, '.')
for y in range(150, 221):
    c.h(96, 155, y, '_')
blocks.append(c.block('None'))

# --- her long straight hair flowing down behind the near arm ---
c = Canvas(96, 146, 118, 180, ' ')
c.art(96, 146, [
    '              kHh',
    '            kHHhjh',
    '           kHHhhjh',
    '          kHHhhjjh',
    '         kHHhhjjhj',
    '        kHHhhjjhjk',
    '       kHHhhjjhjk',
    '      kHHhhjjhjjk',
    '     kHHhhjjhjJk',
    '    kHHhhjjhjJk',
    '    kHhhjjhjJJk',
    '   kHHhjjhjJjk',
    '   kHhhjhjJjk',
    '  kHHhjhjJjhk',
    '  kHhhjhJjhk',
    '  kHhjhjJjhk',
    '  kHhjhJjhjk',
    '  kHhjhJjhk',
    ' kHhjhJjhjk',
    ' kHhjhJjhk',
    ' kHhjJjhjk',
    ' kHhjJjhk',
    ' kHhjJjhk',
    'kHhjJjhk',
    'kHhjJhjk',
    'kHhjJhk',
    'kHjJkhk',
    'kHjkkjk',
    'kjk  k',
    ' k',
])
blocks.append(c.block('hair'))

# --- coat: near tail, lining, far tail ---
c = Canvas(96, 149, 156, 221, ' ')
near_tail = {
    172: (113, 118), 173: (113, 118), 174: (112, 118), 175: (112, 118), 176: (111, 118), 177: (111, 118),
    178: (110, 118), 179: (110, 118), 180: (109, 117), 181: (109, 117), 182: (108, 117), 183: (108, 117),
    184: (107, 116), 185: (107, 116), 186: (106, 116), 187: (106, 116), 188: (105, 116), 189: (105, 116),
    190: (104, 115), 191: (104, 115), 192: (103, 115), 193: (103, 115), 194: (102, 115), 195: (102, 114),
    196: (101, 114), 197: (101, 114), 198: (100, 114), 199: (100, 113), 200: (99, 113), 201: (99, 113),
    202: (99, 113), 203: (99, 112), 204: (100, 111),
}
for y, (a, b) in near_tail.items():
    for x in range(a, b + 1):
        t = (x - a) / max(1, b - a)
        ch = 'm' if t < 0.3 else 'B' if t < 0.65 else 'b'
        c.p(x, y, ch)
    # her two gold lines along the outer edge, the pale lining at the inner edge
    c.p(a, y, 'Y')
    if b - a > 4:
        c.p(a + 2, y, 'o')
    c.p(b, y, 'I')
    c.p(b - 1, y, 't')
c.h(100, 111, 204, 'Y')
c.h(101, 110, 203, 'o')
c.h(100, 110, 205, 'k')
# her gold scroll on the blue near the hem
c.art(103, 198, ['Y  Y', ' YY'])
# pale grey lining between and behind the legs
for y in range(184, 205):
    for x in range(121, 138):
        ch = 'I' if (x + 2 * y) % 9 else 'g'
        if x in (128, 129) or y > 201:
            ch = 'g'
        c.p(x, y, ch)
# far tail: blue, the gold edge outside, the pale lining inside
far_tail = {}
for y in range(173, 206):
    a = 135 + (y - 173) // 6
    b = min(148, 137 + (y - 173) * 11 // 30)
    far_tail[y] = (a, b)
for y, (a, b) in far_tail.items():
    for x in range(a, b + 1):
        ch = 'I' if x < a + 2 else 'b' if x < b - 2 else 'B'
        c.p(x, y, ch)
    c.p(b, y, 'Y')
c.h(far_tail[205][0], far_tail[205][1], 205, 'Y')
blocks.append(c.block('coat'))

# --- far leg: brown cuff, white greave, round knee cop, white sabaton ---
c = Canvas(96, 149, 156, 221, ' ')
c.bent(130, 182, stretch([
    ' zSSSSSSssz ',
    ' sSSSSSSsszz',
    'kpppLLLLLllk',
    'kLLLLlLLLLlk',
    'kllllllllnnk',
    ' kkkkkkkkkk ',
    '  kifIiItTk ',
    '  kfiYYiItk ',
    '  kiYffYItk ',
    '  kiYiiYItk ',
    '   kYYYItk  ',
    '   kfiIItk  ',
    '   kfiIItk  ',
    '   kfiIItk  ',
    '   kfiIItk  ',
    '   kfiIItk  ',
    '   kfiIItk  ',
    '   kfiIItk  ',
    '   kfiIItk  ',
    '   kYoYoYk  ',
    '   kfiIItk  ',
    '   kfiIItkk ',
    '  kfiiIIIttkk',
    '  kfffiiIIIttkk',
    '  kfiiiiiIIIttTk',
    '  kYoYoYoYoYoYok',
    '  kkkkkkkkkkkkkk',
], 14, 2), far_shift)
blocks.append(c.block('legF'))

# --- near leg ---
c = Canvas(96, 149, 156, 221, ' ')
c.bent(114, 183, stretch([
    ' zSSSSSSSssz',
    ' sSSSSSSSssz',
    'kppppLLLLLLlk',
    'kLLLLLlLLLLlk',
    'kllllllllllnk',
    ' kkkkkkkkkkk',
    '  kfiiIIttk',
    '  kiYYYYItk',
    ' kiYffiiYItk',
    ' kiYfiiIYItk',
    ' kiYiiIIYItk',
    ' kiiYYYYIItk',
    '  kfiIIIItk',
    '  kfiiIItTk',
    '  kfiiItTk',
    '  kfiiItTk',
    '  kfiiItTk',
    '  kfiiItTk',
    '  kfiiItTk',
    '  kfiiItTk',
    '  kfiiItk',
    '  kfiiItk',
    '  kYoYoYk',
    '  kfiiItk',
    ' kfiiiIItk',
    'kffiiiIIttk',
    'kfiiiiIIttk',
    'kfiiiiIIttk',
    'kfiiiiIItTk',
    'kiiiiIIIttk',
    'kIIIIIIttTk',
    'kYoYoYoYoYk',
    'kkTTTTTTTkk',
    ' kkkkkkkkk',
], 16, 2), near_shift)
blocks.append(c.block('legN'))

# --- skirt: dark navy pleats, the gold hem ---
c = Canvas(96, 149, 156, 221, ' ')
c.art(116, 172, [
    '  kkkkkkkkkkkkkkkkkkk',
    '  keEeXeEeXeEeXeEeXEk',
    '  kEeXeEeXeEeXeEeXeEek',
    ' keEeXeEeXeEeXeEeXeEek',
    ' kEeXeEeXeEeXeEeXeEeEk',
    ' keEXeEeXeEeXeEeXeEeEk',
    ' kEeXeEeXeEeXeEeXeEeEk',
    'keEXeEeXeEeXeEeXeEeEek',
    'kEeXeEeXeEeXeEeXeEeEEk',
    'kYYyYYYYyYYYYyYYYYyYYk',
    'kooooOoooooOooooOooook',
    ' kkkkkkkkkkkkkkkkkkkkk',
])
blocks.append(c.block('skirt'))

# --- far arm: blue band, white guard, blue glove ---
c = Canvas(96, 149, 156, 221, ' ')
c.art(133, 155, [
    '   kkkk',
    '  kYYYYk',
    '  kmBBbk',
    '  kYYYok',
    '  kfiIIk',
    '  kfiIIk',
    '  kiiItk',
    '  kiiItk',
    '  kBBbbk',
    '  kmBbbk',
    '  kBBbbk',
    '   kfiIItk',
    '   kfiIItk',
    '   kiiItTk',
    '   kiiItTk',
    '   kYYYok',
    '    kBBbbk',
    '    kmBbuk',
    '    kSSSszk',
    '    kSSSszk',
    '    kSSSszk',
    '    kzSzsz k',
    '     kzkzk',
])
blocks.append(c.block('armF'))
blocks.append(c.below(171).block('handF'))

# --- hair behind, between the near arm and the body ---
c = Canvas(96, 149, 156, 221, ' ')
c.art(113, 159, [
    'kjhjk',
    'kjhJk',
    'kJhjk',
    'kjJhk',
    'kJjhk',
    'kjhjk',
    'kJhjk',
    'kjJhk',
    'kJjjk',
    'kjJhk',
    'kkJjk',
    ' kkkk',
])
blocks.append(c.block('hair'))

# --- torso: high collar, choker, white breastplate, dark corset with two buckles, blue coat ---
c = Canvas(96, 149, 156, 221, ' ')
c.art(117, 147, [
    '     kYk     kYk',
    '     kBYk   kYBk',
    '     kBmkZZkmBBk',
    '     kmBkSSkBbbk',
    '    kYmBKKKKBbYk',
    '    kYmkSSSSkBbYk',
    '    kYBkSSSSkbbYk',
    '   kYmBkfffiikbYk',
    '  kYmBkfffiIiIkbYk',
    '  kYmBkffiIkfiIkbYk',
    '  kYmBkfiIItkiItkbYk',
    '  kYmBkiItTkiItTkbYk',
    '  kYmBkkkkKKkkkkkbYk',
    '  kYmBkKuuKKuuKkbbYk',
    '  kYmBkuKNNNNKukbbYk',
    '  kYmBkuKuufiKukbbYk',
    '  kYmBkKuuuitKukbbYk',
    '  kYmBkuKNNNNKukbbYk',
    '  kYmBkuKuufiKukbbYk',
    '  kYmBkKuuuitKukbbYk',
    '   kYmkuKuuuuKukbYk',
    '   kYmkKuuuuuuKkbYk',
    '   kYmkkkkkkkkkkbYk',
])
# the belt, its steel buckle, the coat's front edges below it with their gold scrolls; the pouch
c.art(110, 170, [
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'lLLLLlllkiiiklLlLLlllLlLLLLl',
    'knnnnnnnkfkikkknnnnnnnnnnnnk',
    ' kkkkkkkkiiikkkkkkkkkkkkkkk',
])
c.art(113, 173, [
    'kYmBYk',
    'kYmBYk',
    'kYmBYYk',
    ' kYmBYk',
    ' kYmBYk',
    ' kYmBYk',
    '  kYmBk',
    '  kYmBk',
    '  kYmk',
    '   kk',
])
c.art(133, 173, [
    'kYbBYk',
    'kYbBYk',
    'kYYbBYk',
    ' kYbBYk',
    ' kYbBYk',
    '  kYbBk',
    '  kYbBk',
    '   kYbk',
    '   kkk',
])
c.art(135, 166, [
    ' kkkkk',
    'kiffitk',
    'kttttik',
    'kNllLNk',
    'kNlLlNk',
    'kNlllNk',
    'kNlLlNk',
    'kNNNNNk',
    ' kkkkk',
])
blocks.append(c.block('torso'))

# --- near arm: blue band with its gold trim, white guard, blue sleeve, white forearm plate, glove ---
c = Canvas(96, 149, 156, 221, ' ')
c.art(106, 151, [
    '        kkkkk',
    '       kSSSSSk',
    '      ksSSSSSzk',
    '      ksSSSSSSzk',
    '     ksSSSSSSzzk',
    '    kYYYYYYYYYYYk',
    '   kmmBBBBBBBbbbk',
    '   kYYYYYYYYYYkk',
    '  kffiiiIItTk',
    ' kfffiiiIIttk',
    ' kffiiiIIIttk',
    ' kfiiiIIIttTk',
    ' kmBBBBBbbuuk',
    ' kmmBBBBbbuk',
    '  kmBBBbbuk',
    '  kmBBBbbk',
    '  kfiIBbbk',
    '  kfiIBbuk',
    ' kffiIBbbk',
    ' kfiIIBbuk',
    ' kfiIIbbbk',
    ' kYYYYobuk',
    ' kmBBBbuk',
    'kfffiiItk',
    'kiiIItTk',
])
blocks.append(c.block('armN'))

# --- the sword: the golden blade, the gold swept hilt, her gloved fist over the grip ---
c = Canvas(96, 149, 156, 221, ' ')
for y in range(183, 218):
    xc = 114 + (y - 183) * 0.8
    xi = int(round(xc))
    if y < 215:
        c.spans(y, [(xi - 1, 'OYGyo')])
    elif y < 217:
        c.spans(y, [(xi - 1, 'OYyo')])
    else:
        c.spans(y, [(xi, 'Oo')])
c.p(142, 218, 'O')
blocks.append(c.block('blade'))
c = Canvas(96, 149, 156, 221, ' ')
c.art(98, 172, [
    ' kk',
    'kyYk',
    'kYoYk',
    ' kYoYkk',
    '  kkYok',
    ' k  kYok',
    'kYk  kok  kk',
    'kYk   kk kYok',
    'kYk     kYyok',
    ' kYk   kYoyYk',
    ' kYk  kYoyoYok',
    '  kYk kYoYoYOk',
    '   kYkkoYOkOok',
    '    kYYYok kkk',
    '     kkk',
])
blocks.append(c.block('hilt'))
c = Canvas(96, 149, 156, 221, ' ')
c.art(102, 174, [
    '  kkkkkk',
    ' kmBBBBbk',
    'kmBBBBBbk',
    'kSzSzSzzk',
    'kSzSzSzZk',
    ' kZkZkZk',
    '  k k k',
])
blocks.append(c.block('handN'))

# --- the glow: her golden light along the blade, sparkles ---
c = Canvas(96, 149, 156, 221, ' ')
for y in range(186, 216, 2):
    xc = 114 + (y - 183) * 0.8
    xi = int(round(xc))
    c.p(xi + 3, y, 'Q')
    if y % 4 == 0:
        c.p(xi - 3, y + 1, 'Q')
for x, y, ch in [(134, 194, 'y'), (138, 200, 'Q'), (145, 206, 'y'), (149, 212, 'y'), (130, 203, 'Q'),
                 (146, 216, 'Q'), (151, 208, 'y'), (125, 194, 'Q')]:
    c.p(x, y, ch)
blocks.append(c.block('glow'))

# --- head: her blue eyes, brows, mouth ---
h = Canvas(120, 136, 136, 149, ' ')
h.art(122, 137, [
    '  jjjj    j',
    ' kkkkkk  kk',
    ' k231k   1k',
    '  w12z   2',
    '',
    '',
    '',
    '',
    '',
    '       ZZ',
])
blocks.append(h.block('head'))

print('\n'.join(blocks))
