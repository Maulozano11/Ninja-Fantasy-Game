#!/bin/sh
# Reruns every converter of the owner's Joven salvaje picture (tools/refs/youth_ref.py), from the repo root.
# With a folder argument each also writes its study (his figure beside its pieces at 8x or 16x) there.
set -e
S=${1:+$1}
python3 -I tools/refs/youth-hair-from-ref.py src/sprite/items/youthHairArt.ts $S
python3 -I tools/refs/youth-eyes-from-ref.py src/sprite/wildEyeArt.ts $S
python3 -I tools/refs/youth-jacket-from-ref.py src/sprite/items/wildJacketArt.ts $S
python3 -I tools/refs/youth-trousers-from-ref.py src/sprite/items/shinobiPantsArt.ts $S
python3 -I tools/refs/youth-pouches-from-ref.py src/sprite/items/pouchBeltArt.ts $S
python3 -I tools/refs/youth-sandals-from-ref.py src/sprite/items/strawSandalsArt.ts $S
