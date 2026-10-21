#!/bin/bash
# same.sh <runA> <runB>: every icon and manifest of sheets 8-11 in runA has the same bytes in runB.
bad=0; n_ok=0
for n in 8 9 10 11; do
  for f in $1/ui_icons_$n/*.png $1/ui_icons_$n/manifest.json; do
    if cmp -s $f $2/ui_icons_$n/$(basename $f); then n_ok=$((n_ok+1)); else echo "NOT REPRODUCIBLE $f"; bad=$((bad+1)); fi
  done
done
echo "same bytes: $n_ok, different: $bad"
