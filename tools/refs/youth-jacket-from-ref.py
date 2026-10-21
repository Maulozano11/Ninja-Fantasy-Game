"""The owner's open blue jacket from his Joven salvaje paint-over (docs/reference/joven-salvaje-owner-reference.jpg)
as the Wild Jacket (top_wild_jacket, a new item: top_bomber stays as it is): the jacket's body with its
collar and the dark-grey shirt in its open front, each sleeve cut at the elbow into an upper part (turning
with our upper arm about the shoulder) and a forearm part with the cuff (turning with our forearm about the
elbow), the far upper sleeve also continued across under the jacket's side (WILD_SLEEVE_UP_F_FULL, for the far
arm reaching out from behind the body), and his bare fists under the cuffs (pinned to our wrists, in the
character's skin).

Colour slots: 'main' his jacket blues, 'under' his shirt's greys, 'skin' his fists' skin (follows the
character's), 'line' his black line (stays).

  python3 -I tools/refs/youth-jacket-from-ref.py src/sprite/items/wildJacketArt.ts [study dir]

The same picture always gives the same bytes.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import youth_ref as Y  # noqa: E402

DOC = ("// The owner's open jacket on his Joven salvaje, his pixels (tools/refs/youth-jacket-from-ref.py from\n"
       f'// {Y.REF}). Generated: rerun the script to change it.\n')


def main():
    out_ts, study_dir = Y.argv_out()
    a, K, M, P, black = Y.youth()
    body = Y.slot_by_kind({'blue': 'main'}, 'under')
    sleeve = Y.slot_by_kind({}, 'main')
    skin = Y.slot_by_kind({}, 'skin')
    up_n, fore_n = Y.angle('shoulderN', 'elbowN'), Y.angle('elbowN', 'wristN')
    up_f, fore_f = Y.angle('shoulderF', 'elbowF'), Y.angle('elbowF', 'wristF')
    pieces = [
        ('WILD_JACKET_BODY', *P['jacket'], "The jacket's body: its panels, the collar and the shirt in its open front, the far shoulder; continued under the belt to its hem. Rides the torso about the neck.", 'neck', Y.angle('pelvis', 'neck'), body),
        ('WILD_SLEEVE_UP_N', *P['sleeve_up_n'], 'The near sleeve from the shoulder to the elbow.', 'shoulderN', up_n, sleeve),
        ('WILD_SLEEVE_FORE_N', *P['sleeve_fore_n'], 'The near sleeve from the elbow to the cuff.', 'elbowN', fore_n, sleeve),
        ('WILD_SLEEVE_UP_F', *P['sleeve_up_f'], 'The far sleeve from under the far shoulder to the elbow.', 'shoulderF', up_f, sleeve),
        ('WILD_SLEEVE_UP_F_FULL', *P['sleeve_up_f_full'], "The far upper sleeve as the arm reaches out from behind the body: his strip continued under the jacket's side to the arm's whole breadth.", 'shoulderF', up_f, sleeve),
        ('WILD_SLEEVE_FORE_F', *P['sleeve_fore_f'], 'The far sleeve from the elbow to the cuff.', 'elbowF', fore_f, sleeve),
        ('WILD_FIST_N', *P['fist_n'], 'His near fist, hanging closed under the cuff.', 'wristN', Y.angle('wristN', 'handN'), skin),
        ('WILD_FIST_F', *P['fist_f'], 'His far fist, hanging closed under the cuff.', 'wristF', Y.angle('wristF', 'handF'), skin),
    ]
    Y.run(out_ts, DOC, pieces, 'WILD_JACKET', {'main': 'WILD_JACKET_BLUE', 'under': 'WILD_JACKET_SHIRT'}, uncounted=('WILD_SLEEVE_UP_F_FULL',))
    if study_dir:
        layers = [P[n] for n in ('sleeve_up_f', 'sleeve_fore_f', 'fist_f', 'jacket', 'sleeve_up_n', 'sleeve_fore_n', 'fist_n')]
        Y.study(a, layers, os.path.join(study_dir, 'wild-jacket@8.png'), (24, 26, 76, 68))


if __name__ == '__main__':
    main()
