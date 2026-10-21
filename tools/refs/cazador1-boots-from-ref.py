"""The owner's black open-toe boots from his Cazador 1 (docs/reference/cazador1-owner-reference.jpg), for
the Shinobi Boots (`feet_shinobi`, its id kept).

His picture is our Hunter-nin painted over in his own pixels (tools/refs/cazador1_ref.py: one of his
pixels is one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour,
on each leg:

  the shaft   the boot from its top to the foot: it turns with the shin about the ankle. Where the
              naginata's blade crosses it he drew none of it: there each column is continued from his
              boot below it (the near one) or above it (the far one), inside its outline.
  the foot    the open toes in his skin over the dark foot: it stays flat on the ground like our feet.
  the sole    the foot's last row of cloth, which follows the Sole colour.

Every piece is pinned with its pivot on our ankle, so at rest it lands where he drew it. His cloth
follows Boot, the last row Sole, his skin the character's skin; his black line stays.

It writes src/sprite/items/shinobiBootsArt.ts and, in <study>, the pieces at 8x (continued cells
crossed). The same picture always gives the same bytes:

  python3 -I tools/refs/cazador1-boots-from-ref.py src/sprite/items/shinobiBootsArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import cazador1_ref as C  # noqa: E402

DOC = (
    "// The owner's black open-toe boots on his Cazador 1, his pixels (tools/refs/cazador1-boots-from-ref.py\n"
    '// from docs/reference/cazador1-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
NAMES = ['boot_f', 'foot_f', 'sole_f', 'boot_n', 'foot_n', 'sole_n']
# The row of his soles under each foot.
SOLE_ROW = {'n': 97, 'f': 93}


def kind_of(_n, h):
    k = C.kind(C.rgb(h))
    return 'line' if k == 'line' else 'skin' if k in ('skin', 'wood', 'red') else 'boot'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = C.native()
    masks, cols, filled, K, _bg = C.pieces(a)
    for s, y in SOLE_ROW.items():
        sole = masks['foot_' + s] & (K != 'line') & (np.arange(C.SIZE)[:, None] == y)
        masks['sole_' + s] = sole
        cols['sole_' + s] = cols['foot_' + s]
        filled['sole_' + s] = filled['foot_' + s] & sole
        masks['foot_' + s] = masks['foot_' + s] & ~sole
    J = C.JOINTS
    is_ = lambda want: lambda c: kind_of('', C.hexc(c)) == want
    bases = {
        'BOOT_CLOTH': C.middle(a, masks, cols, ['boot_n', 'boot_f', 'foot_n', 'foot_f'], is_('boot')),
        'BOOT_SOLE': C.middle(a, masks, cols, ['sole_n', 'sole_f'], is_('boot')),
        # His toes recolour from his lit skin (cazador1_ref.his_skin), as all his skin does.
        'BOOT_SKIN': C.his_skin(a, masks, cols),
    }
    specs = []
    for s, S, name in (('n', 'N', 'near'), ('f', 'F', 'far')):
        shin = C.angle('knee' + S, 'ankle' + S)
        specs += [
            (f'BOOT_SHIN_{S}', 'boot_' + s, f'The {name} boot\'s shaft: it turns with the shin about the ankle.', J['ankle' + S], shin),
            (f'BOOT_FOOT_{S}', 'foot_' + s, f'The {name} foot, open toes over the dark foot: it stays flat on the ground.', J['ankle' + S], shin),
            (f'BOOT_SOLE_{S}', 'sole_' + s, f'The {name} sole, the foot\'s last row of cloth: flat on the ground with the foot.', J['ankle' + S], shin),
        ]
    text = C.emit(masks, cols, specs, bases, kind_of, 'BOOT', "'line' | 'boot' | 'skin'", DOC)
    if out_ts:
        C.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        C.sheet(masks, cols, filled, NAMES, os.path.join(study, 'boots@8.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
