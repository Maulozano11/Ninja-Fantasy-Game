#!/bin/sh
# Reruns every converter of the owner's Akira picture (tools/refs/akira_ref.py), from the repo root.
# With a folder argument each also writes its study (his figure beside its pieces at 8x) there.
set -e
S=${1:+$1}
python3 -I tools/refs/akira-hair-from-ref.py src/sprite/items/lionHairArt.ts $S
python3 -I tools/refs/akira-armor-from-ref.py src/sprite/items/emberLeatherArt.ts $S
python3 -I tools/refs/akira-bracers-from-ref.py src/sprite/items/emberBracersArt.ts $S
python3 -I tools/refs/akira-tassets-from-ref.py src/sprite/items/emberTassetsArt.ts $S
python3 -I tools/refs/akira-legs-from-ref.py src/sprite/items/emberLegsArt.ts $S
python3 -I tools/refs/akira-feet-from-ref.py src/sprite/items/emberFeetArt.ts $S
python3 -I tools/refs/akira-katana-from-ref.py src/sprite/items/emberKatanaArt.ts $S
