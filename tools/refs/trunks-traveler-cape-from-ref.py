"""The owner's brown traveller's hood-cape from his Trunks 2 picture (docs/reference/trunks2-owner-reference.jpg).

His picture is our male painted over in his own pixels (tools/refs/trunks_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts the cape out of it, every pixel in his exact colour:

  the hood       the hood bunched round the neck and falling across the chest to the far shoulder,
                 behind the head on the far side: it rides the torso about the neck.
  the shoulder   the cloth draped over the near shoulder and upper arm to his line above the elbow:
                 it rides the near shoulder, over the arm.
  the back       the cloth hanging behind the near arm to the calf, its dark inside showing between
                 the arm and the body: it hangs from the near shoulder and swings in the wind like the
                 other capes. His near arm, fist, sword and leg hide parts of it: there it is
                 continued up and down his folds.

Each piece is pinned to our joint where it lies in his picture, so at rest every pixel is his. His
browns follow the Cape slot; his line stays.

It writes the pieces as TypeScript (src/sprite/items/travelerCapeArt.ts) and, in <study>, his figure
beside them at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/trunks-traveler-cape-from-ref.py src/sprite/items/travelerCapeArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import trunks_ref as R  # noqa: E402

DOC = (
    "// The owner's brown traveller's hood-cape, his pixels (tools/refs/trunks-traveler-cape-from-ref.py from\n"
    '// docs/reference/trunks2-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a, _K, _M, P, _black = R.trunks2()
    A = lambda j, k: R.angle('trunks2', j, k)  # noqa: E731
    main_ = R.by_kind({}, 'main')
    pieces = [
        ('TRAVELER_BACK', *P['cape_back'], 'The cloth hanging behind the near arm to the calf: it hangs from the near shoulder.', 'shoulderN', A('shoulderN', 'elbowN'), main_),
        ('TRAVELER_HOOD', *P['cape_hood'], 'The hood round the neck, across the chest to the far shoulder: it rides the torso about the neck.', 'neck', A('pelvis', 'neck'), main_),
        ('TRAVELER_SHOULDER', *P['cape_shoulder'], 'The cloth over the near shoulder: it rides the near shoulder.', 'shoulderN', A('shoulderN', 'elbowN'), main_),
        ('TRAVELER_HOOD_BEHIND', *P['cape_hood_behind'], 'The hood continued under the head, the neck and the shoulder (hidden at rest): drawn behind the body, it rides the torso about the neck as the hood does.', 'neck', A('pelvis', 'neck'), main_),
        ('TRAVELER_HOOD_SEAM', *P['cape_hood_seam'], "The shoulder's cloth's last columns beside the hood (under the shoulder's cloth at rest): it rides the torso about the neck, so the hood's edge never parts from it.", 'neck', A('pelvis', 'neck'), main_),
        ('TRAVELER_SHOULDER_SEAM', *P['cape_shoulder_seam'], "The hood's first columns beside the shoulder's cloth (under the hood at rest): it rides the near shoulder, so the shoulder's edge never parts from it.", 'shoulderN', A('shoulderN', 'elbowN'), main_),
    ]
    # His base brown as before the hidden pieces were continued (a continued pixel can match his colour where it lies).
    R.run('trunks2', out_ts, DOC, pieces, 'TRAVELER', {'main': 'TRAVELER_BROWN'}, {'main': '#64422c'})
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, [P['cape_hood_behind'], P['cape_back'], P['cape_hood'], P['cape_shoulder']], os.path.join(study, 'cape@8.png'))


if __name__ == '__main__':
    main()
