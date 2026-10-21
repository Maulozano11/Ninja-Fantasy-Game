"""The owner's kimono and its wide sleeves from his Ascended paint-over (docs/reference/ascended-owner-reference.jpg),
for the Wrap Kimono (`top_kimono`, its id kept).

His picture is our male in the Ascended set painted over in his own pixels (tools/refs/ascended_ref.py: one
of his pixels is one fine pixel of our sprites). This script lifts out of it, every pixel in his exact
colour:

  the kimono      the beige body with the navy crossed collar, from under the scarf to the hem below the
                  sash on the near side. It rides the torso about the neck. The V between the lapels is
                  his chest: it is left open, so our skin shows there. Under the scarf it is continued
                  from his cloth below; under the sash, from the rows of his cloth above it, repeated.
  the sleeves     the wide near sleeve to its slanting cuff below the elbow, and the far one (read cell by
                  cell, docs/SPRITE_STYLE_GUIDE.md, the far shoulder and arm: its left edge is the
                  kimono's brown line, which both keep). Each rides its upper arm about the shoulder.
                  Under the cloak on the shoulder each goes on up to the shoulder in his cloth below it.

Every piece is pinned with its pivot on our joint and stamped at its limb's angle at rest, so at rest every
pixel lands where he drew it. His beige follows Kimono and his navy Collar; his black line stays.

It writes src/sprite/items/kimonoArt.ts and, in <study>, the pieces at 10x (continued cells crossed). The
same picture always gives the same bytes:

  python3 -I tools/refs/ascended-kimono-from-ref.py src/sprite/items/kimonoArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ascended_ref as A  # noqa: E402

DOC = (
    "// The owner's kimono and wide sleeves on his Ascended paint-over, his pixels\n"
    '// (tools/refs/ascended-kimono-from-ref.py from docs/reference/ascended-owner-reference.jpg).\n'
    '// Generated: rerun the script to change it.\n'
)
NAMES = ['sleeve_f', 'kimono', 'sleeve_n']


def kind_of(_n, h):
    c = A.rgb(h)
    if A.luma(A.np.array(c, float)) <= 12:
        return 'line'
    return 'collar' if not A.warmth(A.np.array([[c]]))[0, 0] else 'cloth'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = A.native()
    masks, cols, filled, _K, _bg = A.pieces(a)
    J = A.JOINTS
    is_ = lambda want: lambda c: kind_of('', A.hexc(c)) == want
    bases = {
        'KIMONO_CLOTH': A.middle(a, masks, cols, ['kimono', 'sleeve_n', 'sleeve_f'], is_('cloth')),
        'KIMONO_COLLAR': A.middle(a, masks, cols, ['kimono'], is_('collar')),
    }
    specs = [
        ('KIMONO_BODY', 'kimono', 'The kimono from under the scarf to its hem, its crossed navy collar, the V left open: it rides the torso about the neck.', J['neck'], A.angle('pelvis', 'neck')),
        ('KIMONO_SLEEVE_N', 'sleeve_n', 'The wide near sleeve to its slanting cuff below the elbow: it rides the upper arm about the shoulder.', J['shoulderN'], A.angle('shoulderN', 'elbowN')),
        ('KIMONO_SLEEVE_F', 'sleeve_f', 'The far sleeve, its left edge the kimono\'s line: it rides the far upper arm about the shoulder.', J['shoulderF'], A.angle('shoulderF', 'elbowF')),
    ]
    text = A.emit(masks, cols, specs, bases, kind_of, 'KIMONO', "'line' | 'cloth' | 'collar'", DOC)
    if out_ts:
        A.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        A.sheet(masks, cols, filled, NAMES, os.path.join(study, 'kimono@10.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
