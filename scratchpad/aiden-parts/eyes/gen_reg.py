import json
D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/aiden-parts/eyes/'
jobs = []
for body in ('male', 'female', 'bulky', 'slender'):
    for face in ('tapered', 'soft', 'square', 'valiant'):
        for eye in ('standard', 'sharp', 'round', 'calm', 'fierce', 'bright', 'piercing'):
            for sp in ('none', 'tomoe3', 'pinwheel', 'paleVeins', 'sage'):
                for pose in ('idle', 'downed', 'read'):
                    jobs.append({'name': f'{body}-{face}-{eye}-{sp}-{pose}', 'pose': pose, 'special': sp,
                                 'look': {'body': body, 'faceShape': face, 'eyeShape': eye, 'eyeColor': '#22c55e'}})
json.dump(jobs, open(D + 'jobs-reg.json', 'w'))
print(len(jobs))
