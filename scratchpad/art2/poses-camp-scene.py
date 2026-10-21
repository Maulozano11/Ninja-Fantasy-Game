"""Night camp preview with the party in the camp poses (not part of the repo).

    python3 -I poses-camp-scene.py <out.png> [frame]
    python3 -I poses-camp-scene.py <out.gif> anim [ticks]   (8 ticks a second; each pose at its own fps)

Builds a scene folder from the game's camp (src/assets/scenes/camp_night): its four spots with their
poses, and each pose's support (seat stump, flat rock, leaning rock) placed the way CampScene.tsx
does it, from CAMP_PROPS in src/sprite/rig.ts (seat centre 18 px and leaning face 32 px behind the
feet). Renders the party with tools/scenes/party_sprites.ts and composes with tools/scenes/camp_preview.py.
"""
import json
import os
import shutil
import subprocess
import sys

REPO = '/home/user/Ninja-Fantasy-Game'
HERE = os.path.dirname(os.path.abspath(__file__))
SEAT_DX, LEAN_DX = 18, 32
MEMBERS = {'sit': 'Solen', 'read': 'Hana', 'lean': 'Kenji', 'train': 'Aiden'}


FPS = {'lean': 2, 'sit': 2, 'read': 3, 'train': 8}
FRAMES = {'lean': 4, 'sit': 4, 'read': 12, 'train': 8}


def main():
    out = sys.argv[1]
    if len(sys.argv) > 2 and sys.argv[2] == 'anim':
        from PIL import Image
        ticks = int(sys.argv[3]) if len(sys.argv) > 3 else 24
        frames = []
        for t in range(ticks):
            png = os.path.join(HERE, 'work', 'camp-scene', f'tick{t}.png')
            render(png, lambda pose: (t * FPS[pose] // 8) % FRAMES[pose], fire=t % 6)
            frames.append(Image.open(png).convert('RGB').quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))
        frames[0].save(out, save_all=True, append_images=frames[1:], duration=125, loop=0, disposal=1)
        print('wrote', out)
        return
    frame = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    render(out, lambda pose: frame % FRAMES[pose])


def render(out, frame_of, fire=3):
    work = os.path.join(HERE, 'work', 'camp-scene')
    scene_dir = os.path.join(work, 'scene')
    party_dir = os.path.join(work, 'party')
    os.makedirs(scene_dir, exist_ok=True)
    src = os.path.join(REPO, 'src', 'assets', 'scenes', 'camp_night')
    for f in os.listdir(src):
        if f.endswith('.png'):
            shutil.copy(os.path.join(src, f), scene_dir)
    sj = json.load(open(os.path.join(src, 'scene.json')))
    spots = sj['spots']
    props = list(sj['props'])
    for s in spots:
        dx = LEAN_DX if s['pose'] == 'lean' else SEAT_DX if s['pose'] in ('sit', 'read') else None
        if dx is None or not s.get('support'):
            continue
        back = 1 if s['facing'] == 'left' else -1
        props.append({'group': 'campsite', 'name': s['support'], 'x': round(s['x'] + back * dx), 'y': s['y'], 'flip': s['facing'] == 'left', 'z': -0.25})
    sj['props'] = props
    sj['partySpots'] = spots
    json.dump(sj, open(os.path.join(scene_dir, 'scene.json'), 'w'), indent=1)
    who = [f"{MEMBERS[s['pose']]}:{s['pose']}:{frame_of(s['pose'])}" for s in spots]
    subprocess.run(['npx', 'tsx', 'tools/scenes/party_sprites.ts', party_dir, *who], cwd=REPO, check=True, stdout=subprocess.DEVNULL)
    subprocess.run(['python3', 'tools/scenes/camp_preview.py', '--scene', scene_dir, '--sprites', os.path.join(REPO, 'src', 'assets', 'world'),
                    '--party', party_dir, '--out', out, '--fire-frame', str(fire)], cwd=REPO, check=True, stdout=subprocess.DEVNULL)


main()
