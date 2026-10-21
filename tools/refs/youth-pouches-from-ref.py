"""The owner's pouch belt from his Joven salvaje paint-over (docs/reference/joven-salvaje-owner-reference.jpg) as
the Pouch Belt (waist_pouches, same id): three khaki pouches with white snaps on a dark-brown belt with a
grey buckle, riding the pelvis where he drew it (at rest every pixel is his).

His belt is seen only between the pouches and across their middles, where it runs through their loops
(STRAP): those dark browns are the belt's colour slot ('main'); the rest of his browns are the pouches'
('pouch'), his greys and whites the buckle's and the snaps' ('buckle', as the old drawing's snaps took the
buckle's metal); his black and near-black brown outlines stay ('line'). The strap is its own piece, so each
piece keeps his exact colours however close the belt's and the pouches' browns are.

  python3 -I tools/refs/youth-pouches-from-ref.py src/sprite/items/pouchBeltArt.ts [study dir]

The same picture always gives the same bytes.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import youth_ref as Y  # noqa: E402

DOC = ("// The owner's pouch belt on his Joven salvaje, his pixels (tools/refs/youth-pouches-from-ref.py from\n"
       f'// {Y.REF}). Generated: rerun the script to change it.\n')
# Where his belt shows: beside the buckle, and across the pouches' middles (his pixel corners).
STRAP = [Y.box(51, 53, 54, 58), Y.box(46, 56, 51, 57), Y.box(41, 57, 45, 58), Y.box(60, 56, 62, 57)]


def main():
    out_ts, study_dir = Y.argv_out()
    a, K, M, P, black = Y.youth()
    m = P['belt'][0]
    strap = m & Y.region(STRAP) & (K == 'brown') & (Y.luma(a) < 75)
    pouches = m & ~strap
    pouch = Y.slot_by_kind({'pale': 'buckle', 'grey': 'buckle', 'white': 'buckle'}, 'pouch')
    belt = Y.slot_by_kind({}, 'main')
    up = Y.angle('pelvis', 'neck')
    pieces = [
        ('POUCH_BELT_POUCHES', pouches, a, 'The three pouches with their snaps, the buckle and his outlines. Rides the pelvis.', 'pelvis', up, pouch),
        ('POUCH_BELT_STRAP', strap, a, 'The belt where it shows, beside the buckle and across the pouches. Rides the pelvis.', 'pelvis', up, belt),
    ]
    Y.run(out_ts, DOC, pieces, 'POUCH_BELT', {'main': 'POUCH_BELT_LEATHER', 'pouch': 'POUCH_BELT_KHAKI', 'buckle': 'POUCH_BELT_BUCKLE'}, {'pouch': 0.6})
    if study_dir:
        Y.study(a, [(pouches, a), (strap, a // 2 + 100)], os.path.join(study_dir, 'pouch-belt@8.png'), (36, 48, 66, 66))


if __name__ == '__main__':
    main()
