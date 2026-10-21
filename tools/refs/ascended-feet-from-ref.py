"""The owner's bandaged shins and bare-toed feet from his Ascended paint-over (docs/reference/ascended-owner-reference.jpg),
for the Foot Wraps (`feet_wraps`, its id kept).

His picture is our male in the Ascended set painted over in his own pixels (tools/refs/ascended_ref.py: one
of his pixels is one fine pixel of our sprites). This script lifts out of it, every pixel in his exact
colour:

  the shins      each shin bound in bandages from the hakama's hem to the ankle; above the hem his turns
                 are repeated six rows on up, so the shin stays bound under shorter trousers and when the
                 hem swings away. Each turns with the shin about the ankle.
  the feet       each foot bound over the arch, the toes and heel bare (the near one toward us, the far
                 one pointing ahead). Each stays flat on the ground like our feet.

His legs stand wider than ours, so each foot and shin is moved onto our leg (ascended_ref.FOOT_SHIFT: his
sole on our sole). His bandage follows Bandage, his bare skin the character's skin; his dark line stays.

It writes src/sprite/items/footWrapsArt.ts and, in <study>, the pieces at 10x (continued cells crossed).
The same picture always gives the same bytes:

  python3 -I tools/refs/ascended-feet-from-ref.py src/sprite/items/footWrapsArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ascended_ref as A  # noqa: E402

DOC = (
    "// The owner's bandaged shins and bare-toed feet on his Ascended paint-over, his pixels\n"
    '// (tools/refs/ascended-feet-from-ref.py from docs/reference/ascended-owner-reference.jpg).\n'
    '// Generated: rerun the script to change it.\n'
)
NAMES = ['wshin_f', 'wfoot_f', 'wshin_n', 'wfoot_n']


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = A.native()
    masks, cols, filled, _K, _bg = A.pieces(a)
    kind_of = lambda _n, h: A.bandage_kind(A.rgb(h))
    is_ = lambda want: lambda c: A.bandage_kind(c) == want
    bases = {
        'FOOTWRAPS_CLOTH': A.middle(a, masks, cols, ['wshin_n', 'wshin_f', 'wfoot_n', 'wfoot_f'], is_('cloth'), 0.6),
        # His lit skin stands for the character's skin colour, which our bodies show in the light.
        'FOOTWRAPS_SKIN': A.his_skin(a, masks, cols),
    }
    shin = lambda s: A.angle('knee' + s.upper(), 'ankle' + s.upper())
    specs = [
        ('FOOTWRAPS_SHIN_N', 'wshin_n', 'The near shin bound to the ankle: it turns with the shin about the ankle.', A.his_ankle('n'), shin('n'), A.FOOT_SHIFT['n']),
        ('FOOTWRAPS_FOOT_N', 'wfoot_n', 'The near foot, toward us, bound over the arch, the toes bare: it stays flat, its pivot on the ankle.', A.his_ankle('n'), 0, A.FOOT_SHIFT['n']),
        ('FOOTWRAPS_SHIN_F', 'wshin_f', 'The far shin bound to the ankle: it turns with the shin about the ankle.', A.his_ankle('f'), shin('f'), A.FOOT_SHIFT['f']),
        ('FOOTWRAPS_FOOT_F', 'wfoot_f', 'The far foot, pointing ahead, bound over the arch, the toes bare: it stays flat, its pivot on the ankle.', A.his_ankle('f'), 0, A.FOOT_SHIFT['f']),
    ]
    text = A.emit(masks, cols, specs, bases, kind_of, 'FOOTWRAPS', "'line' | 'cloth' | 'skin'", DOC)
    if out_ts:
        A.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        A.sheet(masks, cols, filled, NAMES, os.path.join(study, 'feet@10.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
