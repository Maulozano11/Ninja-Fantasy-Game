"""The owner's wrapped open-toe shin boots from his Cazador 2 (docs/reference/cazador2-owner-reference.jpg), for
the Shinobi Boots (`feet_shinobi`) on the female bodies (the male bodies wear his Cazador 1 boots,
tools/refs/cazador1-boots-from-ref.py).

His picture is our second Hunter-nin painted over in his own pixels (tools/refs/cazador2_ref.py). This script
lifts out of it, every pixel in his exact colour, on each leg: the wrapped shaft from below the knee to the
foot (it turns with the shin about the ankle) and the foot with its open toes in her skin (it stays flat on
the ground). His wraps leave no cloth under the toes, so these boots have no sole of their own. Her legs are
longer than our female body's: each piece is pinned on her own ankle (cazador2_ref.HIS_LEGS), carried by
our leg's angles along her thigh and shin, so at rest it lands where he drew it and her feet stay on her
shins. His cloth follows Boot, her
toes the character's skin; his black line stays.

It writes src/sprite/items/shinobiBootsFemaleArt.ts and, in <study>, the pieces at 8x. The same picture
always gives the same bytes:

  python3 -I tools/refs/cazador2-boots-from-ref.py src/sprite/items/shinobiBootsFemaleArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cazador2_ref as C  # noqa: E402

DOC = (
    "// The owner's wrapped open-toe shin boots on his Cazador 2, his pixels (tools/refs/cazador2-boots-from-ref.py\n"
    '// from docs/reference/cazador2-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
NAMES = ['boot_f', 'foot_f', 'boot_n', 'foot_n']


def kind_of(_n, h):
    k = C.kind(C.rgb(h))
    return 'line' if k == 'line' else 'skin' if k in ('skin', 'wood', 'red') else 'boot'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = C.native()
    masks, cols, filled, _K, _bg = C.pieces(a)
    is_ = lambda want: lambda c: kind_of('', C.hexc(c)) == want
    bases = {
        'BOOT_F_CLOTH': C.middle(a, masks, cols, NAMES, is_('boot')),
        'BOOT_F_SKIN': C.his_skin(a, masks, cols),
    }
    specs = []
    for s, S, name in (('n', 'N', 'near'), ('f', 'F', 'far')):
        shin = C.angle('knee' + S, 'ankle' + S)
        specs += [
            (f'BOOT_F_SHIN_{S}', 'boot_' + s, f'The {name} wrapped shaft: it turns with the shin about her ankle.', C.HIS_LEGS[S]['ankle'], shin),
            (f'BOOT_F_FOOT_{S}', 'foot_' + s, f'The {name} foot, open toes: it stays flat on the ground.', C.HIS_LEGS[S]['ankle'], shin),
        ]
    text = C.emit(masks, cols, specs, bases, kind_of, 'BOOT_F', "'line' | 'boot' | 'skin'", DOC, C.his_legs_ts('BOOT_F_LEGS'))
    if out_ts:
        C.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        C.sheet(masks, cols, filled, NAMES, os.path.join(study, 'boots@8.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
