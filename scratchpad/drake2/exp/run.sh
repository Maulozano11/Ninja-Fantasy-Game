#!/bin/sh
# exp/run.sh NAME "t1 t2 t3 t4 t6 t7" "b1 b2 b3 b4 b6 b7"
D=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/drake2
N=$1; set -- $2 $3
python3 - "$N" "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$8" "$9" "${10}" "${11}" "${12}" <<'PY'
import sys
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/drake2'
n=sys.argv[1]; t=[float(v) for v in sys.argv[2:8]]; b=[float(v) for v in sys.argv[8:14]]
s=open(D+'/conv.py').read()
i=s.index('    FRAMES = ['); j=s.index('    ]\n', i)+6
new=f'''    FRAMES = [
        (0, 0.0, {{}}),
        (0, {t[0]}, dict(bob={b[0]})),
        (0, {t[1]}, dict(bob={b[1]})),
        (5, {t[2]}, dict(bob={b[2]}, dust=(0.5, 2.0, 0.55))),
        (5, {t[3]}, dict(bob={b[3]}, dust=(0.8, 1.0, 1.0))),
        (5, 1.0, dict(dust=(1.0, 0.0, 1.0))),
        (5, {t[4]}, dict(bob={b[4]}, dust=(1.0, -5.0, 0.6))),
        (0, {t[5]}, dict(bob={b[5]}, dust=(1.0, -11.0, 0.3))),
    ]
'''
open(D+f'/exp/conv-{n}.py','w').write(s[:i]+new+s[j:])
PY
mkdir -p $D/exp/$N
python3 -I $D/exp/conv-$N.py drake $D/../art2/REF-earth-set-owner.jpg $D/../art2/REF-earth-set-owner.jpg $D/exp/$N/out.ts $D/exp/$N 2>&1 | grep "frame [0-7]:" > $D/exp/$N/metrics.txt
