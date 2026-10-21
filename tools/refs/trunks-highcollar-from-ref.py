"""The owner's dark-blue short-sleeved shirt and bare arms from his Trunks 2 picture
(docs/reference/trunks2-owner-reference.jpg).

His picture is our male painted over in his own pixels (tools/refs/trunks_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the shirt     the dark-blue body with its grey hem: it rides the torso about the neck. His belt,
                its pouches and his mantle cover it: under the belt it is continued from above and
                below, under the mantle up to our neck and shoulders, closed there by his line.
  the sleeves   the far short sleeve (its top under his hood continued up to our shoulder) and the
                near one, of which only the hem shows under his mantle: continued up over our near
                upper arm. Each rides its upper arm about the shoulder.
  the arms      his bare arms below the sleeves, each cut into the upper arm (about the shoulder) and
                the forearm (about the elbow, continued down to our wrist under his glove). He drew
                them broader than ours; at rest every pixel of them is his, where he drew it, and our
                arm under them is taken away. They follow the character's skin.

Each piece is pinned to our joint where it lies in his picture. His blues follow the Shirt slot and his
greys (the hems) the Trim slot; his line stays.

It writes the pieces as TypeScript (src/sprite/items/shortSleeveShirtArt.ts) and, in <study>, his
figure beside them at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/trunks-highcollar-from-ref.py src/sprite/items/shortSleeveShirtArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import trunks_ref as R  # noqa: E402

DOC = (
    "// The owner's dark-blue short-sleeved shirt and bare arms, his pixels (tools/refs/trunks-highcollar-from-ref.py\n"
    '// from docs/reference/trunks2-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a, _K, _M, P, _black = R.trunks2()
    A = lambda j, k: R.angle('trunks2', j, k)  # noqa: E731
    # His hems (the band under the belt, the sleeves' edges) are greyer blues than the shirt's.
    kind = R.by_kind({}, 'main')

    def cloth(h):
        r, g, b = (int(h[i:i + 2], 16) for i in (1, 3, 5))
        if kind(h) == 'line':
            return 'line'
        return 'trim' if R.colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)[1] < 0.4 else 'main'
    skin = R.by_kind({}, 'skin')
    pieces = []
    for s, side in (('F', 'far'), ('N', 'near')):
        k = s.lower()
        up = A('shoulder' + s, 'elbow' + s)
        fore = A('elbow' + s, 'wrist' + s)
        pieces += [
            (f'SHIRT_ARM_UP_{s}', *P['arm_up_' + k], f'His bare {side} upper arm: it turns with the upper arm about the shoulder.', 'shoulder' + s, up, skin),
            (f'SHIRT_ARM_FORE_{s}', *P['arm_fore_' + k], f'His bare {side} forearm: it turns with the forearm about the elbow.', 'elbow' + s, fore, skin),
            (f'SHIRT_SLEEVE_{s}', *P['sleeve_' + k], f'The {side} short sleeve: it turns with the upper arm about the shoulder.', 'shoulder' + s, up, cloth),
        ]
        if s == 'F':
            pieces.append(('SHIRT_BODY', *P['shirt'], 'The shirt from the neck to its hem: it rides the torso about the neck.', 'neck', A('pelvis', 'neck'), cloth))
    R.run('trunks2', out_ts, DOC, pieces, 'SHIRT', {'main': 'SHIRT_BLUE', 'trim': 'SHIRT_TRIM'})
    if study:
        os.makedirs(study, exist_ok=True)
        names = ('arm_up_f', 'arm_fore_f', 'sleeve_f', 'shirt', 'arm_up_n', 'arm_fore_n', 'sleeve_n')
        R.study(a, [P[n] for n in names], os.path.join(study, 'shirt@8.png'))


if __name__ == '__main__':
    main()
