"""Crops the owner's six painted skill icons out of his battle UI reference, for the icon template.

    UI_OUT=<stagingDir> python3 -I tools/ui/ui-icons-ref.py docs/reference/ui-battle-owner-reference.jpg

writes <stagingDir>/icons_template/ref/:
  owner_icon_<n>.png       his painted art inside slot n (n = 1..6, left to right), at his size
                           (31 x 31 of his pixels, the frame and its dark inner line left out)
  owner_icon_<n>@x3.png    the same art resampled to 132 x 132: the kit's 44 x 44 icon window
                           shown at 3x, so it sits in the template's frames like a painted icon
  owner_slot_<n>.png       his whole slot (frame and number tag) at his size, for comparison
  crops.json               every box, in his pixels

It refuses to run without UI_OUT. Every file is written under a temporary name and renamed into
place, and the same picture always gives the same bytes (no timestamps or text chunks).

Where the boxes come from: in his 1024 x 576 picture the six slots sit on one row with a pitch of
about 39.7 px. Each slot's frame has a bright outer line (x = L and x = R below) and a dark inner
line one pixel inside it; his art fills the 31 x 31 between the dark lines (y 511..541). The two
lines were read off column and row brightness profiles of the picture.
"""

import io
import json
import os
import sys

from PIL import Image

OUT = os.environ.get('UI_OUT')
if not OUT:
    sys.stderr.write('ui-icons-ref: set UI_OUT to the staging folder (nothing is written to src/ by this tool).\n')
    sys.exit(2)
if len(sys.argv) != 2:
    sys.stderr.write('usage: UI_OUT=<stagingDir> python3 -I tools/ui/ui-icons-ref.py <ui-battle-owner-reference.jpg>\n')
    sys.exit(2)

SRC = sys.argv[1]
REF = os.path.join(OUT, 'icons_template', 'ref')
os.makedirs(REF, exist_ok=True)

# Bright outer frame lines of each slot (his pixels). Slots 3 and 6 fall between two columns.
FRAMES = [(358.0, 392.0), (398.0, 432.0), (437.5, 472.0), (477.0, 511.0), (517.0, 551.0), (556.5, 590.0)]
ART_Y = (511.0, 542.0)  # rows 511..541: between the dark inner lines at 510 and 542
SLOT_Y = (497.0, 548.0)  # number tag top to the frame's bottom edge
# The numbers he painted on the tags (they don't run in order in his picture).
TAGS = ['1', '2', '3', '5', '4', '9']
SHOW = 132  # the kit's 44 px icon window at 3x


def save(img: Image.Image, path: str) -> None:
    buf = io.BytesIO()
    img.save(buf, format='PNG', optimize=False, compress_level=9)
    tmp = f'{path}.tmp-{os.getpid()}'
    with open(tmp, 'wb') as f:
        f.write(buf.getvalue())
    os.replace(tmp, path)


def extent(src: Image.Image, box, size) -> Image.Image:
    """The box (fractional edges allowed) resampled to `size` (bicubic)."""
    return src.transform(size, Image.Transform.EXTENT, data=box, resample=Image.Resampling.BICUBIC)


def main() -> None:
    src = Image.open(SRC).convert('RGB')
    if src.size != (1024, 576):
        raise SystemExit(f'ui-icons-ref: expected the 1024x576 reference, got {src.size}')
    crops = {}
    for i, (left, right) in enumerate(FRAMES, start=1):
        art = (left + 2.0, ART_Y[0], right - 1.0, ART_Y[1])
        slot = (left - 1.0, SLOT_Y[0], right + 2.0, SLOT_Y[1])
        aw, ah = round(art[2] - art[0]), round(art[3] - art[1])
        sw, sh = round(slot[2] - slot[0]), round(slot[3] - slot[1])
        save(extent(src, art, (aw, ah)).convert('RGBA'), os.path.join(REF, f'owner_icon_{i}.png'))
        save(extent(src, art, (SHOW, SHOW)).convert('RGBA'), os.path.join(REF, f'owner_icon_{i}@x3.png'))
        save(extent(src, slot, (sw, sh)).convert('RGBA'), os.path.join(REF, f'owner_slot_{i}.png'))
        crops[f'owner_icon_{i}'] = {'art': list(art), 'slot': list(slot), 'tag': TAGS[i - 1], 'size': [aw, ah], 'shown': [SHOW, SHOW]}
    doc = {'source': os.path.basename(SRC), 'what': 'his six painted skill icons, left to right', 'crops': crops}
    path = os.path.join(REF, 'crops.json')
    tmp = f'{path}.tmp-{os.getpid()}'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(json.dumps(doc, indent=1, ensure_ascii=False) + '\n')
    os.replace(tmp, path)
    print(f'ui-icons-ref: 6 icons -> {REF}')


main()
