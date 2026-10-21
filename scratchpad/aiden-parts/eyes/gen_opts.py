import json
D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/aiden-parts/eyes/'
shapes = ['standard', 'sharp', 'round', 'calm', 'fierce', 'bright', 'piercing', 'valiant']
jobs, layout = [], []
for face, hair, col in (('valiant', {'id': 'hair_valiant', 'colors': ['#76391b']}, '#d81b2a'), ('tapered', None, '#3b82f6'), ('square', {'id': 'hair_raven', 'colors': ['#1a1a1a']}, '#22c55e')):
    row = []
    for s in shapes:
        n = f'o-{face}-{s}'
        look = {'skin': '#f6bb96', 'faceShape': face, 'eyeShape': s, 'eyeColor': col}
        if hair:
            look['slots'] = {'hair': hair}
        jobs.append({'name': n, 'look': look})
        row.append(n)
    layout.append(row)
json.dump(jobs, open(D + 'jobs-opts.json', 'w'))
json.dump(layout, open(D + 'layout-opts.json', 'w'))
