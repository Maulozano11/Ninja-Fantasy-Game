import json, glob, collections, os
files = sorted(glob.glob('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/wire/prof/*.cpuprofile'), key=os.path.getmtime)
d = json.load(open(files[-1]))
nodes = {n['id']: n for n in d['nodes']}
self = collections.Counter()
for s, t in zip(d['samples'], d['timeDeltas']):
    cf = nodes[s]['callFrame']
    self[(cf['functionName'] or '(anon)', cf['url'].split('/')[-1], cf['lineNumber'] + 1)] += t
tot = sum(self.values())
for k, v in self.most_common(20):
    print(f"{v/1000:8.1f} ms {100*v/tot:5.1f}%", k)
