"""Build a rows json from a manifest: one row per (key, pose), or per key with 'key'.
usage: python3 -I auto_rows.py <rawdir> <out.json> [key]"""
import json, sys
raw, out = sys.argv[1], sys.argv[2]
by_key = len(sys.argv) > 3 and sys.argv[3] == 'key'
man = json.load(open(f'{raw}/manifest.json'))
rows = {}
for m in man:
    k = (m['key'],) if by_key else (m['key'], m['pose'])
    cap = f"{m['pose']} f{m['frame']}" if by_key else f"f{m['frame']}"
    rows.setdefault(k, []).append([m['file'], cap])
json.dump([{'label': '\n'.join(k), 'cells': c} for k, c in rows.items()], open(out, 'w'))
