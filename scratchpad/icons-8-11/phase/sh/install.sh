#!/bin/bash
# install.sh <stageRoot>: copies the staged sheets 8-11 (icons and manifests) into src/assets/ui_icons. Run from the worktree root.
set -e
for n in 8 9 10 11; do
  cp $1/ui_icons_$n/*.png src/assets/ui_icons/
  cp $1/ui_icons_$n/manifest.json src/assets/ui_icons/manifest_$n.json
done
echo installed
