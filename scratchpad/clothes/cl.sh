#!/bin/bash
# usage: cl.sh out.png slot ids(csv) [base json] [body] [pose] [frame] [scale] [cols]
S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/clothes
out=$1; slot=$2; ids=$3; base=${4:-'{}'}; body=${5:-male}; pose=${6:-idle}; frame=${7:-0}; sc=${8:-5}; cols=${9:-4}
cells=$(python3 -c "
import json,sys
base=json.loads('''$base''')
cells=[]
for i in '$ids'.split(','):
  s=dict(base); s['$slot']=i
  cells.append({'body':'$body','pose':'$pose','frame':$frame,'slots':s})
print(json.dumps(cells))")
cd /home/user/Ninja-Fantasy-Game && npx tsx $S/crop.ts $S/$out "$cells" $sc $cols
