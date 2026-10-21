"""Writes jobs.json and layout JSONs for the verification sheets."""
import json

D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/aiden-parts/eyes/'
SKIN = '#f6bb96'
jobs = []
layouts = {}


def job(name, pose='idle', frame=0, special='none', **look):
    look.setdefault('skin', SKIN)
    look.setdefault('eyeColor', '#d81b2a')
    jobs.append({'name': name, 'look': look, 'pose': pose, 'frame': frame, 'special': special})
    return name


bodies = ['male', 'female', 'bulky', 'slender']
faces = ['tapered', 'soft', 'square', 'valiant']
# 1. faces x eyes x bodies, bald and with Aiden's hair
for hair in ('bald', 'hair'):
    rows = []
    for body in bodies:
        row = []
        for face in faces:
            for eye in ('standard', 'valiant'):
                kw = dict(body=body, faceShape=face, eyeShape=eye)
                if hair == 'bald':
                    kw['slots'] = {'hair': None}
                row.append(job(f'f-{hair}-{body}-{face}-{eye[:3]}', **kw))
        rows.append(row)
    layouts[f'faces-{hair}'] = rows

# 2. specials
specials = ['none', 'tomoe1', 'tomoe3', 'pinwheel', 'pale', 'paleVeins', 'sage']
rows = []
for face in ('valiant', 'tapered'):
    for eye in ('valiant', 'standard'):
        rows.append([job(f's-{face}-{eye[:3]}-{sp}', special=sp, faceShape=face, eyeShape=eye, slots={'hair': None}) for sp in specials])
for body in ('female', 'bulky'):
    rows.append([job(f's-{body}-val-{sp}', special=sp, body=body, faceShape='valiant', eyeShape='valiant', slots={'hair': None}) for sp in specials])
layouts['specials'] = rows

# 3. eye colours and hair colours (brow)
cols = ['#3b82f6', '#38bdf8', '#22c55e', '#a16207', '#5b3a29', '#6b7280', '#d81b2a', '#7c3aed', '#f59e0b', '#e5e7eb']
hairs = ['#76391b', '#1a1a1a', '#e8c170', '#c0392b', '#f1f5f9', '#2563eb']
layouts['colours'] = [
    [job(f'c-eye-{c[1:]}', faceShape='valiant', eyeShape='valiant', eyeColor=c, slots={'hair': None}) for c in cols],
    [job(f'c-hair-{h[1:]}', faceShape='valiant', eyeShape='valiant', slots={'hair': {'id': 'hair_valiant', 'colors': [h]}}) for h in hairs]
    + [job(f'c-hairsch-{h[1:]}', faceShape='tapered', eyeShape='valiant', slots={'hair': {'id': 'hair_scholar', 'colors': [h]}}) for h in hairs[:4]],
    [job(f'c-skin-{f[:3]}-{s[1:]}', faceShape=f, eyeShape='valiant', skin=s, slots={'hair': {'id': 'hair_valiant', 'colors': ['#76391b']}}) for s in ('#f6bb96', '#8d5524', '#3b2219', '#ffe0bd') for f in ('valiant', 'tapered')],
]

# 4. poses
poses = [('idle', 0), ('idle', 1), ('attack', 0), ('attack', 1), ('attack', 2), ('cast', 0), ('cast', 1), ('hurt', 0), ('victory', 0), ('charge', 0),
         ('walk', 0), ('walk', 1), ('run', 0), ('run', 1), ('crouch', 0), ('sneak', 0), ('downed', 0), ('sit', 0), ('read', 0), ('train', 0), ('handsigns', 0), ('lean', 0)]
for body in bodies:
    layouts[f'poses-{body}'] = [[job(f'p-{body}-{p}{fr}', pose=p, frame=fr, body=body, faceShape='valiant', eyeShape='valiant',
                                     slots={'hair': {'id': 'hair_valiant', 'colors': ['#76391b']}}) for p, fr in poses[i:i + 11]] for i in (0, 11)]
    layouts[f'poses-{body}-tap'] = [[job(f'q-{body}-{p}{fr}', pose=p, frame=fr, body=body, faceShape='tapered', eyeShape='valiant') for p, fr in poses[i:i + 11]] for i in (0, 11)]

json.dump(jobs, open(D + 'jobs.json', 'w'))
for k, v in layouts.items():
    json.dump(v, open(D + f'layout-{k}.json', 'w'))
print(len(jobs), 'jobs;', ' '.join(layouts))
