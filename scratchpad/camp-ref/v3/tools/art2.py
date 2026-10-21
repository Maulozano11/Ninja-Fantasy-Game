X0 = 115
_book = {
    158: '.......................ooo.',
    159: '......................ocPpo',
    160: '....................ocpPPco',
    161: '...................ocPPPaho',
    162: '....oqqpPPPpcoo...oqPPqgkko',
    163: '...oggghqqpPPPco.oqPpcgnno.',
    164: '...offnnnghqpPPPckPpannfno.',
    165: '...offffhhngkkapppahknfngo.',
    166: '...offnnnnhfffgfhggmffnfgo.',
    167: '..offnnnnnnnnnfkhmmmmfhggo.',
    168: '..offnnnnnnnnnfkhmmmmfhggo.',
    169: '..offnnnnnnnnnfkhmmmmfhggo.',
    170: '..offnnnnnnnnfkhmmmmfhggo..',
    171: '.offnnnnnnnnnfkhmmmmfhggo..',
    172: '.offnnnnnnnnnfkhmmmmfhggo..',
    173: '.offnnnnnnnnnfkhmmmmfhggo..',
    174: '.offfnnnnnnnfkhmmmmfhggo...',
    175: '.offfffffffffkfffffffggo...',
    176: '..oggggggggggkggggggggo....',
    177: '...ooooooooooooooooooo.....',
}
BOOK_ROWS = {y: [(X0, s)] for y, s in _book.items()}


def rows(x0, y0, lines):
    return {y0 + i: [(x0, s)] for i, s in enumerate(lines)}


HAND_VARIANTS = [
    rows(131, 169, [
        '...o.o..',
        '..obobo.',
        '.olbDbDo',
        '.obbDbso',
        'olbbbbso',
        'osbbbsDo',
        '.osbsDo.',
        '..osDo..',
    ]),
    rows(131, 168, [
        '....o...',
        '..oolo..',
        '.olobolo',
        '.obDbDbo',
        'oobbbbso',
        'olobbbso',
        'olsbbsDo',
        '.osbsDo.',
        '..osso..',
    ]),
    rows(131, 169, [
        '..o.o...',
        '.olobo..',
        '.olDbDo.',
        'oobbbDbo',
        'olobbbso',
        'olsbbsDo',
        '.osbbDo.',
        '..osso..',
    ]),
    rows(131, 169, [
        '...oo...',
        '..olbo..',
        '.olbDbo.',
        'olbbDbso',
        'olbbbbDo',
        'osbbbsDo',
        '.osbsDo.',
        '..osso..',
    ]),
    rows(131, 169, [
        '..o.oo..',
        '.olollo.',
        '.obDbbDo',
        'olbDbbso',
        'olbbbbso',
        'osbbbsDo',
        '.osssDo.',
        '..oDDo..',
    ]),
]
FIST_VARIANTS = [
    rows(117, 158, [
        '...oooooo..',
        '..olllllbo.',
        '.osbbbbbbso',
        'osDbDbDbDo.',
        'os.ooooo...',
    ]),
    rows(117, 158, [
        '...oooo....',
        '..olllbo...',
        '.olbbbbso..',
        'osbsDsDso..',
        'osoooooo...',
    ]),
    rows(117, 158, [
        '..ooooo....',
        '.olllbboo..',
        'olbbbbbsDo.',
        'osbDsbDso..',
        'os.ooooo...',
    ]),
    rows(117, 158, [
        '...ooooo...',
        '..ollllbo..',
        '.olbbbbbso.',
        'osbsDsDsDo.',
        'osooooooo..',
    ]),
    rows(117, 158, [
        '...oooo....',
        '..olllboo..',
        '.olbbbbbso.',
        'osbbsDsDo..',
        'os.oooo....',
    ]),
]
