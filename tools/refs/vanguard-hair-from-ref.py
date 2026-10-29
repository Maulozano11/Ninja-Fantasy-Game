"""The owner's tactical figure's own hair (docs/reference/three-outfits-owner-reference.jpg, the right-hand
figure, mirrored with its body), at our Roman head's size and cleaned as the shared head is: the owner, on
the tactical outfit, "usa la cabeza y cara y pelo que tiene mi referencia no te vayas a equivocar". Built
by the same steps as outfits-hair-from-ref.py, on his tactical head (outfits_ref.HEADS['tactical']).

  python3 -I tools/refs/vanguard-hair-from-ref.py src/sprite/items/vanguardHairArt.ts
"""

import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import outfits_ref as O  # noqa: E402

spec = importlib.util.spec_from_file_location('outfits_hair', os.path.join(HERE, 'outfits-hair-from-ref.py'))
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)

if __name__ == '__main__':
    O.use_head('tactical')
    O.run(sys.argv, lambda: shared.build(prefix='VANGUARD', script='vanguard-hair-from-ref.py', what="The owner's tactical figure's hair", doc='His tactical figure\'s hair: blue-black spikes standing up and back, his own bangs over the brow.'))
