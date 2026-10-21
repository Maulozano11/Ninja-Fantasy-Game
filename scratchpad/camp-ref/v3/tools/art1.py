# Design v1 (his coords): rows are full strings from x = 115.
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

# The near fist under the chin (skin shades: o D s b l L)
FIST_ROWS = {
    158: [(119, '.oooooo.')],
    159: [(118, 'osbllllbo')],
    160: [(118, 'osbbbbbbso')],
    161: [(118, 'oDsDsDsDo')],
}

# The far hand on the right board
HAND_ROWS = {
    168: [(133, '.o.o..')],
    169: [(132, '.olobo.')],
    170: [(132, 'olbDbDo')],
    171: [(132, 'olbDbDbo')],
    172: [(132, 'olbbbbso')],
    173: [(132, 'osbbbbso')],
    174: [(132, '.osbbbso')],
    175: [(133, 'osbbso')],
    176: [(133, 'osbso')],
}
