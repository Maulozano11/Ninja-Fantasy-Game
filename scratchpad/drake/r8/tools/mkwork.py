"""Copies the repo converter to <out> with a hook before the frame loop: when DRAKE_TUNE is set, that script is
exec'd with drake()'s locals and drake() returns."""
import sys
src = open(sys.argv[1]).read()
hook = "    if os.environ.get('DRAKE_TUNE'):\n        g = dict(globals()); g.update(locals()); exec(open(os.environ['DRAKE_TUNE']).read(), g); return\n"
marker = "    GAPS.clear()\n    frames = {'fly': []}\n"
assert src.count(marker) == 1
open(sys.argv[2], 'w').write(src.replace(marker, hook + marker))
