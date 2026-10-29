"""The creator's UI assets from the owner's pictures (2026-10-28, cards 9 and 10 of
tools/refs/template/TARJETA_DE_PROMPT.md):

  python3 -I tools/refs/creator-ui-assets.py

writes src/assets/ui_creator/:
- his creator sheet cut into its named pieces (ui-sheets-from-ref.py creator), his pixels;
- the tall panel taken apart for a frame of any size: four corners, the edge strips, the two
  gems and the inner fill (panel_c_*), so the corners and gems are never stretched;
- the group row without its centre gem (row_active_plain), for rows of any width;
- from his battle sheet, the gem buttons the creator uses (btn_*);
and src/assets/scenes/creator_shrine/backdrop.png, his empty shrine courtyard.
"""
import json, os, shutil, subprocess, sys, tempfile
from PIL import Image

OUT = 'src/assets/ui_creator'
SCENE = 'src/assets/scenes/creator_shrine'
CUT = 'tools/refs/ui-sheets-from-ref.py'
# the tall panel's corner box and its gems (his piece is 290x448)
CORNER = 40
GEM = 30  # half-width of the gem box around the centre


def run(sheet, out):
    subprocess.run([sys.executable, '-I', CUT, sheet, out], check=True)


def panel_parts(src, out):
    p = Image.open(src).convert('RGBA')
    w, h = p.size
    c = CORNER
    parts = {
        'tl': p.crop((0, 0, c, c)),
        'tr': p.crop((w - c, 0, w, c)),
        'bl': p.crop((0, h - c, c, h)),
        'br': p.crop((w - c, h - c, w, h)),
        # one column / one row of the plain edge, stretched by the frame
        'top': p.crop((c + 20, 0, c + 21, c)),
        'bottom': p.crop((c + 20, h - c, c + 21, h)),
        'left': p.crop((0, c + 60, c, c + 61)),
        'right': p.crop((w - c, c + 60, w, c + 61)),
        'gem_top': p.crop((w // 2 - GEM, 0, w // 2 + GEM, c)),
        'gem_bottom': p.crop((w // 2 - GEM, h - c, w // 2 + GEM, h)),
        'fill': p.crop((c, c, w - c, h - c)),
    }
    for k, im in parts.items():
        im.save(f'{out}/panel_c_{k}.png')


def plain_row(src, dst):
    """The active row without its centre gem: the gem's columns filled with the column just left of
    it, so the glow line runs on unbroken (a frame of any width stretches this middle)."""
    r = Image.open(src).convert('RGBA')
    w, h = r.size
    gw = 80
    x0 = w // 2 - gw // 2
    col = r.crop((x0 - 1, 0, x0, h)).resize((gw, h), Image.NEAREST)
    r.paste(col, (x0, 0))
    r.save(dst)


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(SCENE, exist_ok=True)
    run('creator', OUT)
    panel_parts(f'{OUT}/panel_tall.png', OUT)
    plain_row(f'{OUT}/row_active.png', f'{OUT}/row_active_plain.png')
    with tempfile.TemporaryDirectory() as tmp:
        run('battle', tmp)
        for name in ['gem_red', 'gem_red_hover', 'gem_red_pressed', 'gem_blue', 'gem_blue_hover', 'gem_gold', 'gem_off']:
            shutil.copy(f'{tmp}/{name}.png', f'{OUT}/btn_{name[4:]}.png')
    shutil.copy('docs/reference/creator-shrine-backdrop-owner-reference.png', f'{SCENE}/backdrop.png')
    print('ok', len(os.listdir(OUT)), 'files in', OUT)


if __name__ == '__main__':
    main()
