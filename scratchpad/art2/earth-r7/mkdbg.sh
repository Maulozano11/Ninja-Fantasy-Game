#!/bin/sh
# usage: mkdbg.sh snippet.ts out.ts  -- the generator with absolute imports, main() replaced by the snippet
R=/home/user/Ninja-Fantasy-Game/tools/world-sprites
sed -e "s#from './kit'#from '$R/kit'#" -e "s#from './vfx-a-lib'#from '$R/vfx-a-lib'#" -e "s#from './vfx-earth-v3-refdata'#from '$R/vfx-earth-v3-refdata'#" -e 's#^main();$##' $R/vfx-earth-v3.ts > "$2"
cat "$1" >> "$2"
