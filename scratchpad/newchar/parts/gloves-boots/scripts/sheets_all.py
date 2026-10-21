"""Sheets of every rendered shot in <dir> (named look_pose_frame.png), grouped: python3 -I sheets_all.py <dir> <k> <box>"""
import sys, os, re, subprocess
d = sys.argv[1]
k = sys.argv[2]
box = sys.argv[3]
here = os.path.dirname(os.path.abspath(__file__))
files = sorted(f for f in os.listdir(d) if re.match(r'.+_.+_\d+\.png$', f) and not f.startswith('sheet'))
groups = {}
for f in files:
    look = f.split('_')[0] if not f.startswith('c_') else '_'.join(f.split('_')[:2])
    groups.setdefault(look, []).append(f)
order = lambda f: (f.rsplit('_', 2)[-2], int(f.rsplit('_', 1)[1][:-4]))
for look, fs in groups.items():
    fs.sort(key=order)
    for i in range(0, len(fs), 12):
        chunk = fs[i:i + 12]
        args = [os.path.join(d, f) + '=' + f[:-4] for f in chunk]
        out = os.path.join(d, f'sheet-{look}-{i // 12}.png')
        subprocess.run([sys.executable, '-I', os.path.join(here, 'sheet.py'), out, k, box, '6'] + args, check=True)
