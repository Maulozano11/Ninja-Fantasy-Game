exec(open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/v3/tools/art2.py').read().split('def rows')[0])


def rows(x0, y0, lines):
    return {y0 + i: [(x0, s)] for i, s in enumerate(lines)}


HAND_VARIANTS = [rows(131, 169, [
    '...o.o..',
    '..obobo.',
    '.olbDbDo',
    '.obbDbso',
    'olbbbbso',
    'osbbbsDo',
    '.osbsDo.',
    '..osDo..',
    '...oo...',
])]
# rows from his y 157 (ours 158): the first row may reach into the chin's outline row
FIST_VARIANTS = [
    # a: top merges with the chin on the right (no line between), finger creases below
    rows(117, 157, [
        '............',
        '.....ssbs...',
        '..oolllbbo..',
        '.osbbbbbbso.',
        'osbsDbDbDso.',
        'os.ooooooo..',
    ]),
    # b: as a, fist shifted right, rounded right end, creases slanting
    rows(117, 157, [
        '............',
        '......sbbs..',
        '..oollllbso.',
        '.osbbbbbbbDo',
        'osbbsDbsDDo.',
        'os.ooooooo..',
    ]),
    # c: thumb along the jaw (lit line on top), the fingers curled below it
    rows(117, 157, [
        '............',
        '....slllls..',
        '..oosbbbbbo.',
        '.osbDbDbDbso',
        'osbsDsDsDDo.',
        'os.ooooooo..',
    ]),
    # d: his colours: muted, light on the top right, merging into the chin
    rows(117, 157, [
        '............',
        '.....sbbbs..',
        '..oobbllbbo.',
        '.ossbbbbbsDo',
        'osssDsDsDDo.',
        'os.oooooo...',
    ]),
    # e: smaller fist, right under the chin, its top in the chin
    rows(117, 157, [
        '............',
        '.....sbbs...',
        '...oolllbo..',
        '..osbbbbbo..',
        'oosbDbDbDo..',
        'os.ooooo....',
    ]),
]
