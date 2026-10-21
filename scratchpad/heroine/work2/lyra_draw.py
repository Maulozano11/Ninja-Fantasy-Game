import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/heroine/work2')
from draw import Canvas, far_shift, near_shift, stretch

blocks = []

# --- clear the auto body (keep the long hair at the left and the head) ---
c = Canvas(96, 149, 156, 221, '.')
for y in range(150, 221):
    xa = 112 if y < 176 else 97
    c.h(xa, 155, y, '_')
blocks.append(c.block('None'))

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
        ch = 'c' if t < 0.35 else 'C' if t < 0.7 else 'v'
        if y >= 197:
            ch = 'r' if t < 0.75 else 'q'
        c.p(x, y, ch)
# her cream flames rising into the red hem, the gold edge round the red
c.art(100, 196, [' cc C', '  c  c', '   c'])
for y in range(197, 205):
    a, b = near_tail[y]
    c.p(a, y, 'Y')
c.h(100, 111, 204, 'Y')
c.h(100, 110, 205, 'k')
# the shadow fold down the panel
for y in range(178, 196):
    c.p(near_tail[y][0] + 4 + (196 - y) // 6, y, 'v')
# the panel's front edge: her red lining and its gold trim, curving in at the top
for y in range(172, 197):
    a, b = near_tail[y]
    c.p(b, y, 'Y')
    c.p(b - 1, y, 'r')
c.art(112, 175, ['Yr', ' Yr', '  Y'])
# lining between and behind the legs
for y in range(184, 205):
    xa, xb = 121, 137
    for x in range(xa, xb + 1):
        ch = 'l' if (x + y) % 7 else 'L'
        if x in (128, 129) or y > 201:
            ch = 'L'
        c.p(x, y, ch)
# far tail
far_tail = {}
for y in range(173, 206):
    a = 135 + (y - 173) // 6
    b = min(148, 137 + (y - 173) * 11 // 30)
    far_tail[y] = (a, b)
for y, (a, b) in far_tail.items():
    for x in range(a, b + 1):
        ch = 'V' if x < b - 3 else 'v' if x < b - 1 else 'C'
        c.p(x, y, ch)
    c.p(b, y, 'Y')
    if b - 1 > a:
        c.p(b - 1, y, 'r')
for y in range(201, 206):
    a, b = far_tail[y]
    c.h(a, b - 1, y, 'r')
c.h(far_tail[205][0], far_tail[205][1], 205, 'Y')
blocks.append(c.block('coat'))

# --- far leg ---
c = Canvas(96, 149, 156, 221, ' ')
c.bent(130, 182, stretch([
    ' zSSSSSSssz ',
    ' sSSSSSSsszz',
    'kYyyyYYYYYYk',
    'kYYYYyYYYYok',
    'kooOooooOOOk',
    ' kkkkkkkkkk ',
    '  kNbBbNnnk ',
    '  kbBbbbNnk ',
    '  kNbbbNnnk ',
    '  knNNNnnk  ',
    '   kNbNnnk  ',
    '   kNbNnnk  ',
    '   kNbNnnk  ',
    '   kNbNnnk  ',
    '   kNbNnnk  ',
    '   kNbNnnk  ',
    '   kNbNnnk  ',
    '   kNbNnnk  ',
    '   kNbNnnk  ',
    '   konononk ',
    '   kNbNnnk  ',
    '   kNbNnnkk ',
    '  kNbbNnnnNkk',
    '  kNbBbbNnnNNkk',
    '  kNbbbbbbNNnnNk',
    '  knNNNNNNNNNnnk',
    '  kkkkkkkkkkkkkk',
], 14, 2), far_shift)
blocks.append(c.block('legF'))

# --- near leg ---
c = Canvas(96, 149, 156, 221, ' ')
c.bent(114, 183, stretch([
    ' zSSSSSSSssz',
    ' sSSSSSSSssz',
    'kYyyyYYYYYYYk',
    'kYYYyYYYYYYok',
    'kooOoooooOOOk',
    ' kkkkkkkkkkk',
    '  kbNNNNnnk',
    '  kNbBBbNnk',
    ' kNBbbbbBNnk',
    ' kNBbnnbBNnk',
    ' kNbbnnbbNnk',
    ' kNNBbbBNNnk',
    '  kNNNNNNnk',
    '  kNbBNNnnk',
    '  kNbBNNnk',
    '  kNbBNNnk',
    '  kNbBNnnk',
    '  kNbBNnnk',
    '  kNbBNnnk',
    '  kNbBNnnk',
    '  kNbBNnk',
    '  kNbBNnk',
    '  konoonk',
    '  kNbBNnk',
    ' kNbBBNnnk',
    'kNbBBbNNnnk',
    'kNbBbbNNnnk',
    'kNbbbbNNnnk',
    'kNbbbbNNnnk',
    'kNNbbNNNnnk',
    'knNNNNNNnnk',
    'kbBbbbbbNnk',
    'kknnnnnnnkk',
    ' kkkkkkkkk',
], 16, 2), near_shift)
blocks.append(c.block('legN'))

# --- skirt ---
c = Canvas(96, 149, 156, 221, ' ')
c.art(116, 172, [
    '  kkkkkkkkkkkkkkkkkkk',
    '  keEeXeErEeXeEreXEek',
    '  kEeXeEeXrEeXeErXeEek',
    ' keEeXeEeXrEeXeEreXEek',
    ' kEeXeEeXrEeXeEeXreEek',
    ' keEXeEeXerEeXeEeXrEek',
    ' kEeXeEeXrEeXeEeXrEeEk',
    'keEXeEeXerEeXeEeXrEeEek',
    'kEeXeEeXrEeXeEeXeXrEeEk',
    'krrrrrrrrrrrrrrrrrrrrrk',
    'kqrrqrrrqrrrrqrrrqrrrqk',
    ' kkkkkkkkkkkkkkkkkkkkk',
])
blocks.append(c.block('skirt'))

# --- far arm (behind the torso) ---
c = Canvas(96, 149, 156, 221, ' ')
c.art(133, 156, [
    '   kkkk',
    '  kCCvvk',
    '  kCCvvk',
    '  kCvvVk',
    '  kCvvVk',
    '  kvvVVk',
    '  kvvVVk',
    '  kvVVVk',
    '  kvVVVk',
    '  kkVVkk',
    '   kbBNnk',
    '   kbBNnk',
    '   kbBNnnk',
    '   kbbNnnk',
    '   kbBNnnk',
    '    kbNnnk',
    '    kbNnnk',
    '    kcCvCk',
    '    ksSSszk',
    '    kSSSszk',
    '    kSSSszk',
    '    kzSzsz k',
    '     kzkzk',
])
blocks.append(c.block('armF'))
blocks.append(c.below(174).block('handF'))

# --- hair behind, between the near arm and the body ---
c = Canvas(96, 149, 156, 221, ' ')
c.art(113, 159, [
    'kjJjk',
    'kjhJk',
    'kJhjk',
    'kjJhk',
    'kJjhk',
    'kjJjk',
    'kJhjk',
    'kjJJk',
    'kJjjk',
    'kjJhk',
    'kkJjk',
    ' kkkk',
])
blocks.append(c.block('hair'))

# --- torso ---
c = Canvas(96, 149, 156, 221, ' ')
c.art(117, 149, [
    '        kZZZZk',
    '        kzSSzk',
    '       knnnnnnk',
    '     kkzSSSSSSzk',
    '    kSSSSSSSSSSSk',
    '   kYYYYrrrrYYYYk',
    '  kcccCYrrrrrYCcvk',
    '  kcccCCYrrrYCcccvk',
    '  kCcccCCYrYCccccvk',
    '  kCCcCCvCYCvCccCvk',
    '  kvCCvvVVVVVVvvCVk',
    '  kYYooYYYYYYYYooYk',
    '  kNbNoNbbbbfiNbNnk',
    '  kNboNbbbbbitNNbnk',
    '  kNoNbbbbbbbNNoNnk',
    '  kNbNoNbbbbfiNbNnk',
    '  knbNbbbbbbitNoNnk',
    '   kNoNbbbbbbNNbnk',
    '   kNbNbbbbbbbNNnk',
    '   knNNNNNNNNNNNnk',
    '   kooYYooYoooYYok',
])
# the gold pauldron on the far shoulder, over the blouse
c.art(130, 150, [
    '  kkkkk',
    ' kYyyYok',
    'kYyYYoOok',
    'kOYoYOoYk',
    'kYoOoYOok',
    ' kOoYoOk',
    ' kkOoOkk',
    '   kkk',
])
# the belt, its steel buckle, the gold piece below it, the pouch at the far hip
c.art(110, 170, [
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'nNNNNnnnkiiiknNnNNnnnNnNNNNn',
    'knnnnnnnkfkikkknnnnnnnnnnnnk',
    ' kkkkkkkkiiikYyyyYkkkkkkkkk',
    '              kYyYk',
    '               kok',
    '                k',
])
c.art(135, 166, [
    ' kkkkk',
    'kiffitk',
    'kttttik',
    'kqrrrqk',
    'kqrrrqk',
    'kqrqrqk',
    'kqrrrqk',
    'kqqqqqk',
    ' kkkkk',
])
blocks.append(c.block('torso'))

# --- near arm ---
c = Canvas(96, 149, 156, 221, ' ')
c.art(106, 151, [
    '        kkkkk',
    '       kSSSSSk',
    '      ksSSSSSzk',
    '      ksSSSSSSzk',
    '     ksSSSSSSzzk',
    '    krrrrrrrrrrrk',
    '   krrrrrrrrrqqqk',
    '   kqqqrrrrqqqkk',
    '  kcbcccCCCCvk',
    ' kcccccCCCCvvk',
    ' kccccCCCCvvVk',
    ' kcccCCCCvvvVk',
    ' kCcCCCCvvvVVk',
    ' kCCCCvvvvVVk',
    '  kvCvvvVVVk',
    '  kkVvVVVkk',
    '  kbBbbNNk',
    '  kBbobNnk',
    ' kbBbbNNnk',
    ' kBboNNnnk',
    ' kbBbbNNnk',
    ' kBbobNnnk',
    ' kbbbbNnk',
    'kcccCCvvk',
    'kCcCvCvk',
])
blocks.append(c.block('armN'))

# --- braid over the near shoulder ---
c = Canvas(96, 149, 156, 221, ' ')
c.art(118, 149, [
    'kphk',
    'khPjk',
    'kjhpk',
    'kPjhk',
    'khpjk',
    'kjPhk',
    'kpjhk',
    'kPhjk',
    'kjhpk',
    'kkqkk',
    'khPhk',
    'kjhjk',
    ' kpk',
    '  k',
])
blocks.append(c.block('hairFront'))

# --- the sword: blade, then the hilt, then her fist over the grip ---
c = Canvas(96, 149, 156, 221, ' ')
for y in range(183, 218):
    xc = 114 + (y - 183) * 0.8
    xi = int(round(xc))
    if y < 215:
        c.spans(y, [(xi - 1, 'k2a1')])
    elif y < 217:
        c.spans(y, [(xi - 1, 'k21')])
    else:
        c.spans(y, [(xi, 'k1')])
c.p(142, 218, 'k')
blocks.append(c.block('blade'))
c = Canvas(96, 149, 156, 221, ' ')
c.art(98, 172, [
    ' kk',
    'kifk',
    'ktIik',
    ' ktIkk',
    '  kkttk',
    ' k  ktIk',
    'kik  kIk  kk',
    'kik   kk kYok',
    'kik     kYyok',
    ' kik   kYoaYk',
    ' kik  kYoaoYok',
    '  kik kYoYoYOk',
    '   kikkoYOkOok',
    '    kiiYok kkk',
    '     kkk',
])
blocks.append(c.block('hilt'))
c = Canvas(96, 149, 156, 221, ' ')
c.art(102, 174, [
    '  kkkkkk',
    ' kSSSSSzk',
    'kSSzSSSzk',
    'kszSzSzzk',
    'kSzSzSzZk',
    ' kZkZkZk',
    '  k k k',
])
blocks.append(c.block('handN'))

# --- the glow: her cyan sparkles round the blade's lower half ---
c = Canvas(96, 149, 156, 221, ' ')
for x, y, ch in [(134, 194, 'a'), (138, 200, '1'), (145, 206, 'a'), (149, 212, 'a'), (130, 203, 'a'),
                 (146, 216, '1'), (151, 208, '1'), (136, 209, 'a'), (125, 194, '1')]:
    c.p(x, y, ch)
blocks.append(c.block('glow'))

# --- head: her eyes, brows, mouth ---
c = Canvas(96, 149, 156, 221, ' ')
blocks.append(c.block('head'))
h = Canvas(120, 136, 136, 149, ' ')
h.art(122, 137, [
    '  jjjj    j',
    ' kkkkkk  kk',
    ' Kwdgk   gk',
    '  wgGz   G',
    '',
    '',
    '',
    '',
    '',
    '       ZZ',
])
blocks.append(h.block('head'))

print('\n'.join(blocks))
