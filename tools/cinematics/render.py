"""Render one cinematic from its spec.

  python3 -I tools/cinematics/render.py tools/cinematics/fire-avatar/shield.json --out <staging dir> [--preview-unit <png>]

Run from the repo root (paths in specs are repo-relative). Writes, under <staging dir>:
  <name>/0000.png ...   the frames, WITHOUT the party (the game's player draws the real units)
  <name>/manifest.json  fps, size, frame count, where each unit stands, the camera of every frame
  <name>.mp4, <name>.gif  a preview (with --preview-unit, the given sprite is drawn as the caster,
                          under the same camera, the way the player will draw it)
A spec names its plug-in (the subject's own timeline, e.g. fire-avatar/forge.py); the shared pieces
are in tools/cinematics/cine/. Same spec and pictures, same bytes.
"""
import argparse
import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from PIL import Image  # noqa: E402

from cine import core  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('spec')
    ap.add_argument('--out', required=True)
    ap.add_argument('--preview-unit', help='a sprite PNG drawn as the caster in the preview video only')
    a = ap.parse_args()
    spec = json.load(open(a.spec))
    p = importlib.util.spec_from_file_location('plugin', os.path.join(HERE, spec['plugin']))
    plugin = importlib.util.module_from_spec(p)
    p.loader.exec_module(plugin)
    frames, cams, units = plugin.render(spec, '.')
    preview = None
    if a.preview_unit:
        im = Image.open(a.preview_unit).convert('RGBA')
        preview = {'caster': im.crop(im.getbbox())}
    man = core.write(a.out, spec['name'], frames, cams, spec['fps'], units, preview)
    print(f"{spec['name']}: {man['frames']} frames at {man['fps']} fps -> {a.out}")


if __name__ == '__main__':
    main()
