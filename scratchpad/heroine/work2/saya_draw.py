import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/heroine/work2')
from draw import Canvas, far_shift, near_shift, stretch

blocks = []

# --- clear the auto body below the head ---
c = Canvas(84, 147, 158, 222, '.')
for y in range(150, 222):
    c.h(84, 157, y, '_')
blocks.append(c.block('None'))

# --- her long straight hair flowing down behind her ---
c = Canvas(84, 146, 124, 190, ' ')
c.art(96, 146, [
    '             kHhj',
    '           kHHhjjh',
    '          kHHhhjjh',
    '         kHHhhjjhj',
    '        kHHhhjjhjk',
    '       kHHhhjjhjjk',
    '      kHHhhjjhjJk',
    '     kHHhhjjhjJJk',
    '     kHhhjjhjJJk',
    '    kHHhjjhjJjJk',
    '    kHhhjhjJjJk',
    '   kHHhjhjJjhJk',
    '   kHhhjhJjhJk',
    '   kHhjhjJjhJk',
    '  kHhjhJjhjJJk',
    '  kHhjhJjhjJk',
    '  kHhjhJjhjJk',
    '  kHhjJjhjJJk',
    '  kHhjJjhJJk',
    '  kHhjJjhJJk',
    ' kHhjJhjJJk',
    ' kHhjJhjJJk',
    ' kHhjJhJJk',
    ' kHjJkhJJk',
    ' kHjkkjJk',
    ' kjk  kJk',
    '  k    k',
])
blocks.append(c.block('hair'))

# --- the black scabbard hanging from her near hip, behind her legs ---
c = Canvas(84, 147, 158, 222, ' ')
c.art(102, 176, [
    '             kk',
    '            kKuk',
    '           kKuuk',
    '          kKuUk',
    '         kKuUk',
    '        kKuUk',
    '       kKuUk',
    '      kKuUk',
    '     kKuUk',
    '    kKuUk',
    '   kKuUk',
    '  kKuUk',
    ' kYoUk',
    'kYyok',
    'kOok',
    ' kk',
])
blocks.append(c.block('scabbard'))

# --- far leg: thigh, navy legging with red wraps, armoured shoe ---
c = Canvas(84, 147, 158, 222, ' ')
c.bent(130, 182, stretch([
    ' kzSSSSSSzk ',
    ' kzSSSSSzzk ',
    'kqrrRrrrqqqk',
    'kXrrqXXrrrqk',
    'kXeqrrXXqrrk',
    ' kXEeqrrXXqk',
    ' kXEeeXqrrqk',
    ' kXEeeeXXqk',
    '  kXEeeeXXk',
    '  kXEMeeXXk',
    '  kqrrXEeXk',
    '  kXqrrrXXk',
    '  kXEqrrrqk',
    '  kXEeXqrrk',
    '  kqrrXeXXk',
    '  kXqrrrXqk',
    '  kXEeqrrrk',
    '  kXEeXqrk',
    '  kXMEeXXk',
    '  kXMEeXXkk',
    ' kXMMEeeXXXkk',
    ' kXMEeeeeXXXXk',
    ' kXEeeeeeXXXXXk',
    ' kRrrrrrrrrrrrk',
    ' kkkkkkkkkkkkkk',
], 15, 4), far_shift)
blocks.append(c.block('legF'))

# --- near leg ---
c = Canvas(84, 147, 158, 222, ' ')
c.bent(114, 183, stretch([
    ' kzSSSSSSSzk',
    ' kzSSSSSSzzk',
    'kqrrRrrrrqqqk',
    'kXrrqXXrrrqqk',
    'kXeqrrXXqrrqk',
    ' kXEeqrrXXqk',
    ' kXEeeXqrrqk',
    ' kXEeeeXXqk',
    ' kXEMeeeXXk',
    ' kXEMeeeXXk',
    '  kqrrXEeXk',
    '  kXqrrrXXk',
    '  kXEqrrrqk',
    '  kXEeXqrrk',
    '  kqrrXeXXk',
    '  kXqrrrXqk',
    '  kXEeqrrrk',
    '  kXEeXqrk',
    '  kqrrXeXk',
    '  kXqrrrXk',
    '  kXEeqrrk',
    '  kXEeXXk',
    '  kXEeXXk',
    ' kXMMMMXXk',
    'kXMMfMMeXXk',
    'kXMMMMeeXXk',
    'kXEMMEeeXXk',
    'kXEEeeeeXXk',
    'kRrrqqrrrRk',
    'kXEeeeeeXXk',
    'krrrrrrrrrk',
    'kkkkkkkkkkk',
], 17, 4), near_shift)
blocks.append(c.block('legN'))

# --- skirt: navy pleats, two red stripes, the red hem ---
c = Canvas(84, 147, 158, 222, ' ')
c.art(116, 172, [
    '  kkkkkkkkkkkkkkkkkkk',
    '  keEeXeEreXeEeXrEek',
    '  kEeXeEeXreEeXeErEek',
    ' keEeXeEeXreEeXeErXEek',
    ' kEeXeEeXeREeXeEerXEek',
    ' keEXeEeXerEeXeEeXrEek',
    ' kEeXeEeXrEeXeEeXrEeEk',
    'keEXeEeXerEeXeEeXrEeEek',
    'krrrrrrrrrrrrrrrrrrrrrk',
    'kqrRqrrrqrrRrqrrrqrrRqk',
    ' kkkkkkkkkkkkkkkkkkkkk',
])
blocks.append(c.block('skirt'))

# --- far arm: navy guard with red bands, the red-and-navy glove ---
c = Canvas(84, 147, 158, 222, ' ')
c.art(133, 154, [
    '   kkkk',
    '  kXEeXk',
    '  kqrrqk',
    '  kXEeXk',
    '  kXEeXk',
    '  kXeeXk',
    '  kqrrqk',
    '  kXEeXk',
    '  kXEeXk',
    '  kXeeXk',
    '  kXeeXk',
    '   kqrrqk',
    '   kXEeXk',
    '   kXEeXk',
    '   kXeeXk',
    '   kqrrqk',
    '   kXEeXk',
    '    kRrrqk',
    '    kqrXqk',
    '    kSSSszk',
    '    kSSSszk',
    '    kzSzsz k',
    '     kzkzk',
])
blocks.append(c.block('armF'))
blocks.append(c.below(171).block('handF'))

# --- torso: the red scarf round her neck, the cream chest plate, the navy top, belts, pouches ---
c = Canvas(84, 147, 158, 222, ' ')
c.art(118, 148, [
    '    kkkkkkkkkk',
    '   kqRrrRrrRrqk',
    '  kqrRrrqrRrrqk',
    '  kqqrrqqrrqqqk',
    '  kXkkkkkkkkkXk',
    '  kXkcccccccCkXk',
    ' kXkcccccccccCkXk',
    ' kXkcccccccccvCkXk',
    ' kXkCcccvvccvvCkXk',
    ' kXkvCCvVVCCvvvkXk',
    ' kXkYYYYYYYYYYYYkXk',
    ' kXEeeXrXeeeXrXeXXk',
    ' kXEeeXrXeeeXrXeXXk',
    ' kXEeeXrXeeeXrXeXXk',
    ' kXEeeXrXeeeXrXeXXk',
    '  kXEeXrXeeeXrXeXk',
    '  kXEeXrXeeeXrXeXk',
    '  kXEeXrXeeeXrXeXk',
])
c.art(110, 166, [
    '  kkkkkkkkkkkkkkkkkkkkkkk',
    ' kNbNNbbNNNkiiikNbNNbNNNk',
    ' knnnnnnnnnkfkikknnnnnnnk',
    '  kkkkkkkkkkiiikkkkkkkkk',
    '  kNbNNbbNNbNNkiiikNbNNNk',
    '  knnnnnnnnnnnkfkiknnnnnk',
    '   kkkkkkkkkkkkiiikkkkkk',
])
# the pouch at her near hip and its gold clasp, the gold tassels, the pouch at her far hip
c.art(111, 170, [
    'kkkkkkk',
    'kNbbbNk',
    'kbBYbNk',
    'kNbbbNk',
    'kNbbNNk',
    'knnnnnk',
    ' kkkkk',
])
c.art(121, 173, ['Yk', 'oY', 'Yo', 'oY', 'Yk', 'Y'])
c.art(136, 170, [
    'kkkkk',
    'kNbNk',
    'kYoNk',
    'kNbNk',
    'knnnk',
    ' kkk',
])
blocks.append(c.block('torso'))

# --- the scarf's ends flowing back behind her near shoulder ---
c = Canvas(84, 147, 158, 222, ' ')
c.art(92, 152, [
    '              kkkkk',
    '          kkkkqrRrrk',
    '       kkkqrRrrrrqqk',
    '    kkkqrRrrrrqqqkk',
    '  kkqrRrrrrqqqkkk',
    ' kqrRrrqqqkkk',
    'kqrRrqqkk',
    'kRrqqk',
    'krqk',
    'kqk',
    'kk',
])
blocks.append(c.block('scarf'))

# --- near arm: bare shoulder, the navy guard with its red bands, the glove ---
c = Canvas(84, 147, 158, 222, ' ')
c.art(108, 151, [
    '      kkkkk',
    '     kSSSSSk',
    '    ksSSSSSzk',
    '    ksSSSSSzk',
    '    ksSSSSzzk',
    '    kzSSSzzZk',
    '   kkkkkkkkkk',
    '   kXEeeeeXXk',
    '   kqrrrrrqqk',
    '   kXEeeeXXk',
    '   kXEeeeXXk',
    '   kXeeeeXXk',
    '  kqrrrrrqqk',
    '  kXEeeeXXk',
    '  kXEeeeXXk',
    '  kXeeeeXXk',
    '  kqrrrrqqk',
    '  kXEeeXXk',
    '  kXEeeXXk',
    '  kXeeeXXk',
    '  kqrrrqqk',
    '  kXEeeXXk',
    '  kRrrrqqk',
])
blocks.append(c.block('armN'))

# --- the swords: the second blade down to the left, the blade down to the right, the gold hilt ---
c = Canvas(84, 147, 158, 222, ' ')
for y in range(185, 213):
    xc = 108 - (y - 185) * 0.72
    xi = int(round(xc))
    c.spans(y, [(xi - 2, 'kfiY')] if y % 3 == 0 else [(xi - 2, 'kfik')])
c.p(88, 213, 'k')
c.p(87, 214, 'k')
blocks.append(c.block('blade2'))
c = Canvas(84, 147, 158, 222, ' ')
for y in range(184, 214):
    xc = 114 + (y - 184) * 1.0
    xi = int(round(xc))
    c.spans(y, [(xi - 1, 'kfiYk')] if y % 3 == 0 else [(xi - 1, 'kfiIk')])
c.spans(214, [(143, 'kik')])
c.spans(215, [(144, 'kk')])
blocks.append(c.block('blade'))
c = Canvas(84, 147, 158, 222, ' ')
c.art(101, 171, [
    ' kk',
    'kyYk',
    'kYoBk',
    ' kBlBk',
    '  kBlk',
    '    kk',
    '      kkkk',
    '     kYyyYk',
    '    kYk  kYk',
    '    kYk kiYk',
    '    kYkkfkYk',
    '     kYYYYk',
    '      kkkk',
])
blocks.append(c.block('hilt'))
c = Canvas(84, 147, 158, 222, ' ')
c.art(103, 174, [
    '  kkkkkk',
    ' kXEeeXk',
    'kqrrrrqk',
    'kSzSzSzk',
    'kSzSzSZk',
    ' kZkZkk',
])
blocks.append(c.block('handN'))

# --- golden sparkles along both blades ---
c = Canvas(84, 147, 158, 222, ' ')
for x, y, ch in [(124, 195, 'g'), (131, 199, 'G'), (140, 204, 'g'), (147, 208, 'G'), (135, 213, 'g'),
                 (127, 205, 'G'), (95, 192, 'g'), (99, 198, 'G'), (89, 205, 'g'), (102, 205, 'g'),
                 (93, 211, 'G'), (106, 189, 'g')]:
    c.p(x, y, ch)
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
