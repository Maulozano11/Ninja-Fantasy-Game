exec(open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/v3/tools/art2.py').read().split('def rows')[0])


def rows(x0, y0, lines):
    return {y0 + i: [(x0, s)] for i, s in enumerate(lines)}


HAND_VARIANTS = [
    # v0: current
    rows(131, 169, [
        '...o.o..',
        '..obobo.',
        '.olbDbDo',
        '.obbDbso',
        'olbbbbso',
        'osbbbsDo',
        '.osbsDo.',
        '..osDo..',
        '...oo...',
    ]),
    # v1: muted (shadow base), three fingers of different length, thumb out left
    rows(131, 169, [
        '....o...',
        '...obo..',
        '..oosDo.',
        '..obsDso',
        '.oossDso',
        'obssssDo',
        '.ossssDo',
        '..osDDo.',
        '...oo...',
    ]),
    # v2: his: two lit finger tips, back of hand broad, wrist narrow
    rows(131, 169, [
        '...o.o..',
        '..obobo.',
        '..osDsDo',
        '.obsDsso',
        '.obbsssDo',
        '.osbsssDo',
        '..ossDDo',
        '...osDo.',
        '....oo..',
    ]),
    # v3: fingers wrap over the board's right edge (curl to the right), knuckles lit
    rows(131, 169, [
        '........',
        '...ooo..',
        '..obbsoo',
        '.obsDsDo',
        '.obsssDo',
        'obsssDDo',
        '.ossDDo.',
        '..osDo..',
        '...oo...',
    ]),
    # v4: like v2, lit
    rows(131, 169, [
        '...o.o..',
        '..olobo.',
        '..obDbDo',
        '.olbDbso',
        '.olbbbbso',
        '.osbbbsDo',
        '..osbsDo',
        '...osDo.',
        '....oo..',
    ]),
]
FIST_VARIANTS = [
    rows(117, 158, [
        '...ooooo...',
        '..ollllbo..',
        '.osbbbbbso.',
        'osbbsDsDso.',
        'os.ooooo...',
    ]),
    # wider, shifted right, creases two rows
    rows(117, 158, [
        '....oooooo..',
        '..oobllllbo.',
        '.osbbbbbbbso',
        'osbbDbDbDsDo',
        'os.oooooooo.',
    ]),
    # knuckle bumps on top
    rows(117, 158, [
        '...oo.oo.o..',
        '..olbolbolo.',
        '.osbbbbbbbso',
        'osbsDsDsDsDo',
        'os.oooooooo.',
    ]),
    # thumb on top-left along the jaw, fingers to the right
    rows(117, 158, [
        '...ooo.ooo..',
        '..olbbollbo.',
        '.osbbsbbbbso',
        'osbsDsDsDsDo',
        'os.oooooooo.',
    ]),
    # muted like his (shadow tones), one lit row
    rows(117, 158, [
        '....oooooo..',
        '..oobbbbbso.',
        '.ossssssssDo',
        'osssDsDsDDo.',
        'os.ooooooo..',
    ]),
]
