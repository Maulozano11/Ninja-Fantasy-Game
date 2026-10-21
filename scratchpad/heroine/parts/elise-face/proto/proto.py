"""Prototype her eyes over our female face: proto.py <std.png> <out.png> <design>"""
import sys
import numpy as np
from PIL import Image

std = np.asarray(Image.open(sys.argv[1]).convert('RGBA')).copy()
SK = {'o': '18090e', 'D': 'ae4946', 's': 'e08a72', 'b': 'facdac', 'l': 'fadbc0'}
nx, ny = 123, 141


def hexrgb(h):
    return [int(h[i:i + 2], 16) for i in range(0, 6, 2)] + [255]


# erase our eyes and brows to skin, keeping the far face edge
for r in range(-3, 3):
    for c in range(-1, 12):
        x, y = nx + c, ny + r
        if std[y, x, 3] == 0:
            continue
        std[y, x] = hexrgb('facdac')
for y, x in ((ny + 2, nx + 11), (ny + 1, nx + 12), (ny, nx + 12), (ny - 1, nx + 12), (ny - 2, nx + 12)):
    std[y, x] = hexrgb('18090e')
std[ny - 1, nx + 11] = std[ny - 2, nx + 11] = std[ny, nx + 11] = hexrgb('e08a72')
P = {
    'K': '080613', 'k': '1a101a', 'n': '342325', 'r': '764534', 'h': 'c4c4ce', 'w': 'fefef9',
    'p': '052c67', 'q': '0e447e', 'd': '115893', 'c': '2bc3d8', 'B': '1276b0', 'v': '79aed9', 'g': '5e7faa',
    'e': '683c30', 'x': 'c67169', 'y': 'b76660', 'z': '9b5754', 'G': '8d8ea0', 'u': '7d564c', 'f': '4c2924',
    'Z': 'd68271', 'E': 'e59580', 'S': 'f3ae92',
}
P.update(SK)
designs = {
    'D': {
        'near': (0, -1, ['kKKKkrn', 'khdwpk.', 'Kwcqpb.', 'bxwvBw.']),
        'far': (8, -1, ['.rKK', 'Zkkk', 'nwko', 'zdko']),
        'browN': (1, -3, ['eeee..', '...eee']),
    },
    'F': {
        'near': (0, -1, ['kKKKkrn', 'khdwpk.', 'Kwcqgb.', 'bxwBvw.']),
        'far': (8, -1, ['.rKKk', 'Zkkk.', 'nwkk.', 'zdko.']),
        'browN': (1, -3, ['eeee..', '...eee']),
    },
    'G': {
        'near': (0, -1, ['kKKKkrn', 'khdwpk.', 'Kwcqpb.', 'bxwBvb.']),
        'far': (8, -1, ['.rKKk', 'Zkkk.', 'nwkk.', 'zvko.']),
        'browN': (1, -3, ['eeee..', '...eee']),
    },
    'H': {
        'near': (0, -1, ['kKKKkrn', 'khdwpk.', 'uwcqpb.', 'bxwBvw.']),
        'far': (8, -1, ['.rKKk', 'Zkkk.', 'nwkk.', 'zdko.']),
        'browN': (1, -3, ['eeee..', '...eee']),
    },
}
d = designs[sys.argv[3]]
img = std.copy()
for key, (cx, cy, rows) in d.items():
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch == '.':
                continue
            img[ny + cy + r, nx + cx + c] = hexrgb(P[ch])
Image.fromarray(img).save(sys.argv[2])
