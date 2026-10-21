"""The owner's wide black hakama from his Ascended paint-over (docs/reference/ascended-owner-reference.jpg), for the
Wide Hakama (`bottom_hakama`, its id kept).

His picture is our male in the Ascended set painted over in his own pixels (tools/refs/ascended_ref.py: one
of his pixels is one fine pixel of our sprites). This script lifts out of it, every pixel in his exact
colour:

  the top        the hakama round the hips, from the kimono's hem down over the tops of both legs. It
                 rides the torso about the pelvis (over the legs' tops, so a stride opens no gap).
  the legs       each leg between its lines, from the hips to its hem: the near one beside the cloak's
                 front edge, the far one behind the sash's panel (under it his cloth is continued from
                 below). Each parts at our knee: the thigh rides the thigh about the hip, the shin rides
                 the shin about the knee; the two share two rows, so the knee stays closed as it bends.

Every piece is pinned with its pivot on our joint and stamped at its limb's angle at rest, so at rest every
pixel lands where he drew it. His black follows Hakama; his line stays.

It writes src/sprite/items/hakamaArt.ts and, in <study>, the pieces at 10x (continued cells crossed). The
same picture always gives the same bytes:

  python3 -I tools/refs/ascended-hakama-from-ref.py src/sprite/items/hakamaArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ascended_ref as A  # noqa: E402

DOC = (
    "// The owner's wide black hakama on his Ascended paint-over, his pixels\n"
    '// (tools/refs/ascended-hakama-from-ref.py from docs/reference/ascended-owner-reference.jpg).\n'
    '// Generated: rerun the script to change it.\n'
)
NAMES = ['seat', 'thigh_f', 'shin_f', 'thigh_n', 'shin_n']


def kind_of(_n, h):
    return 'line' if A.luma(A.np.array(A.rgb(h), float)) <= 12 else 'cloth'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = A.native()
    masks, cols, filled, _K, _bg = A.pieces(a)
    J = A.JOINTS
    bases = {'HAKAMA_CLOTH': A.middle(a, masks, cols, ['thigh_n', 'shin_n', 'thigh_f', 'shin_f'], lambda c: kind_of('', A.hexc(c)) == 'cloth')}
    specs = [
        ('HAKAMA_SEAT', 'seat', 'The hakama round the hips, over the tops of both legs: it rides the torso about the pelvis.', J['pelvis'], A.angle('pelvis', 'neck')),
        ('HAKAMA_THIGH_N', 'thigh_n', 'The near leg from the hip to below the knee: it rides the thigh about the hip.', J['hipN'], A.angle('hipN', 'kneeN')),
        ('HAKAMA_SHIN_N', 'shin_n', 'The near leg from above the knee to its hem: it rides the shin about the knee.', J['kneeN'], A.angle('kneeN', 'ankleN')),
        ('HAKAMA_THIGH_F', 'thigh_f', 'The far leg from the hip to below the knee: it rides the thigh about the hip.', J['hipF'], A.angle('hipF', 'kneeF')),
        ('HAKAMA_SHIN_F', 'shin_f', 'The far leg from above the knee to its hem: it rides the shin about the knee.', J['kneeF'], A.angle('kneeF', 'ankleF')),
    ]
    text = A.emit(masks, cols, specs, bases, kind_of, 'HAKAMA', "'line' | 'cloth'", DOC)
    if out_ts:
        A.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        A.sheet(masks, cols, filled, NAMES, os.path.join(study, 'hakama@10.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
