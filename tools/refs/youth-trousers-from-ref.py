"""The owner's trousers from his Joven salvaje paint-over (docs/reference/joven-salvaje-owner-reference.jpg) as
the Shinobi Pants (bottom_shinobi, same id): slate trousers with his cream leg wraps round the shins.

The seat rides the pelvis; on each leg the thigh turns with our thigh about the hip and the shin (with its
wrap) with our shin about the knee. His legs are shorter than ours (youth_ref.LEG_SHIFT): each shin hangs
that much lower than he drew it (its pivot is moved up by the shift), and each thigh runs on down that far
in his own trousers' pixels, so at rest the leg is whole and his wrap sits right over his sandal on our
ground. Under the belt the seat is continued up from his trousers below.

Colour slots: 'main' his trousers' slates, 'wrap' his wraps' creams and tans, 'line' his black line.

  python3 -I tools/refs/youth-trousers-from-ref.py src/sprite/items/shinobiPantsArt.ts [study dir]

The same picture always gives the same bytes.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import youth_ref as Y  # noqa: E402

DOC = ("// The owner's trousers and leg wraps on his Joven salvaje, his pixels (tools/refs/youth-trousers-from-ref.py\n"
       f'// from {Y.REF}). Generated: rerun the script to change it.\n')


def main():
    out_ts, study_dir = Y.argv_out()
    a, K, M, P, black = Y.youth()
    slot = Y.slot_by_kind({'cream': 'wrap', 'brown': 'wrap', 'pale': 'wrap', 'white': 'wrap', 'grey': 'wrap'}, 'main')
    pieces = [('SHINOBI_PANTS_SEAT', *P['seat'], 'The seat, from under the belt to the top of the thighs. Rides the pelvis.', 'pelvis', Y.angle('pelvis', 'neck'), slot)]
    for s, side in (('N', 'near'), ('F', 'far')):
        sh = Y.LEG_SHIFT[s]
        pieces += [
            (f'SHINOBI_PANTS_THIGH_{s}', *P['thigh_' + s.lower()], f'The {side} thigh, from the hip on down over the top of the shin.', 'hip' + s, Y.angle('hip' + s, 'knee' + s), slot),
            (f'SHINOBI_PANTS_SHIN_{s}', *P['shin_' + s.lower()], f'The {side} shin and its wrap, hung {sh} px lower than he drew it.', 'knee' + s, Y.angle('knee' + s, 'ankle' + s), slot, (0, -sh)),
        ]
    Y.run(out_ts, DOC, pieces, 'SHINOBI_PANTS', {'main': 'SHINOBI_PANTS_SLATE', 'wrap': 'SHINOBI_PANTS_WRAP'}, {'wrap': 0.6})
    if study_dir:
        layers = [P[n] for n in ('thigh_f', 'shin_f', 'thigh_n', 'shin_n', 'seat')]
        Y.study(a, layers, os.path.join(study_dir, 'shinobi-pants@8.png'), (34, 50, 72, 90))


if __name__ == '__main__':
    main()
