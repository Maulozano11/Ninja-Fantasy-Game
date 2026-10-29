"""The owner's tactical figure's own head (docs/reference/three-outfits-owner-reference.jpg, the right-hand
figure, mirrored with its body), at our Roman head's size and cleaned as the shared head is: the owner, on
the tactical outfit, "usa la cabeza y cara y pelo que tiene mi referencia no te vayas a equivocar". Built
by the same steps as outfits-head-from-ref.py, on his tactical head (outfits_ref.HEADS['tactical']).

  python3 -I tools/refs/vanguard-head-from-ref.py src/sprite/vanguardHeadArt.ts
"""

import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import outfits_ref as O  # noqa: E402

spec = importlib.util.spec_from_file_location('outfits_head', os.path.join(HERE, 'outfits-head-from-ref.py'))
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)

if __name__ == '__main__':
    O.use_head('tactical')
    O.run(sys.argv, lambda: shared.build(prefix='VANGUARD', script='vanguard-head-from-ref.py', shape='vanguard', what="The owner's tactical figure's face"))
