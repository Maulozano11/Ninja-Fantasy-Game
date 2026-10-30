"""Builds the folder layout the hydra summon scripts read (<work>/hydra/col14/empty.png,
<work>/hydra/col16/step*.png, ...) from the owner's pictures in docs/reference/ and the derived
inputs here, so the cinematic can be rerun from the repo:

    python3 -I tools/cinematics/hydra-summon/layout.py <work>
    python3 <work>/hydra/cinematic7.py <work> <work>/out/summon7     # frames, MP4, GIF

The scripts are the scratch versions as they ran (Steve 1, 2026-10-29); this is a record of the
approved summon (v6) and the v7 with Barrabás, to be ported to the shared tool."""
import os, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
REF = os.path.join(REPO, 'docs', 'reference')
W = sys.argv[1]
def put(src, dst):
    dst = os.path.join(W, dst)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(src, dst)
put(f'{REF}/colossal-hydra-courtyard-empty-owner-reference.png', 'hydra/col14/empty.png')
for s in ['1', '2', '3', '3b', '4', '4b', '5']:
    put(f'{REF}/summon-courtyard-step{s}-owner-reference.png', f'hydra/col16/step{s}.png')
put(f'{REF}/colossal-hydra-heads-grid-owner-reference.png', 'hydra/col5/grid.png')
put(f'{HERE}/derived/step4c_fixed.png', 'hydra/col16/step4c_fixed.png')
for f in ['bg.png', 'body_mask.npy', 'base24.png.json']:
    put(f'{HERE}/derived/{f}', f'hydra/col3/{f}')
for f in ['cinematic7.py', 'cinematic6.py', 'mount9.py', 'rocks.py']:
    put(f'{HERE}/{f}', f'hydra/{f}')
for f in os.listdir(f'{HERE}/sprites'):
    put(f'{HERE}/sprites/{f}', ('barrabas/' if not f.startswith('leg_') else 'cc/') + f)
print('ok', W)
