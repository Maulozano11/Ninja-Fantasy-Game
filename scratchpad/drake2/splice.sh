#!/bin/sh
# Builds the working copy of the converter: original up to drake(), the new drake(), then the dispatch line.
D=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/drake2
head -n 777 $D/beasts-from-ref.orig.py > $D/conv.py.part
cat $D/drake_new.py >> $D/conv.py.part
tail -n 1 $D/beasts-from-ref.orig.py >> $D/conv.py.part
mv $D/conv.py.part $D/conv.py
