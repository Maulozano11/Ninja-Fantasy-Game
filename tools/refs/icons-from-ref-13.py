"""Crops the owner's hotbar icon sheets 13 to 22 for the icon generator (tools/ui/ui-icons-23.ts).

His pictures (docs/reference/icons-owner-reference-13.jpg to -22.jpg, 2026-10-22, 1024x572 each)
were painted from our "missing icons" sheets: each shows three to five skill slots in a row, in his
steel frame with gold corners and a label under it. Some he did not like and asked us to leave out
(SKIP below, with his words): the first golem (sheet 13), the first Espejismo (sheet 15), the
first Whirlwind Tower (sheet 18) and the first Rasenshuriken (sheet 21); each was replaced by a
later one of his. Of sheet 22 only the Rasenshuriken is used (the rest repeat sheet 21).

  sheet 13: GUIJARROS (earth_pebble_shot), CORONA (earth_spike_crown), POLVAREDA
            (earth_rubble_gust); GOLEM left out
  sheet 14: BRASAS (fire_three_embers), GOLEM (wood_golem_titan), ABANICO (lightning_spark_fan),
            TRUENO (lightning_thunder_beam)
  sheet 15: LLAMA PERSECU (katon_pursuing_flame), CALAMBRE (lightning_jolt), TAJO SANGRAN
            (kenjutsu_bleeding_cut); ESPEJISMO left out
  sheet 16: ROCIO SANADOR (water_healing_dew), PALMA MISTICA (mystical_palm), GEISER
            (water_geyser), TSUNAMI (water_devouring_tide)
  sheet 17: MANTO BRISA (wind_breeze_mantle), REMOLINO (wind_whirl), GRAN RAFAGA
            (wind_blade_daitoppa), VENDAVAL (wind_gale_curtain)
  sheet 18: PILDORA SOLD (pill), VENDA (bandage), ANTIDOTO (antidote), SELLO EXPLOS (tag);
            TORRE TORBEL left out (five smaller slots)
  sheet 19: ESCONDER SELLO (tagTrap), LANZAR PIEDRA (stone), ARRASTRAR CUER (drag) (three bigger
            slots)
  sheet 20: DESVANECER (body_flicker), SUSTITUCION (substitution_kawarimi), PATADA HURACAN
            (leaf_hurricane_senpuu), EMBESTIDA (taijutsu_rush)
  sheet 21: DRAGON TSUNAMI (water_tide_s), MIND TWIST (genjutsu_mirage), TORRE TORBEL
            (wind_whirlwind_tower); RASENSHURIKEN left out
  sheet 22: RASENSHURIKEN (rasenshuriken_wind) only

Like his earlier sheets they are pixel art scaled up with nearest neighbour and saved as JPEG, but
not all at the same size: sheets 13, 14, 18, 20, 21 and 22 are 480x268 pictures (his pixels 2.133
sheet pixels, as sheets 5 and 6), sheets 15, 16, 17 and 19 are 240x134 pictures (his pixels 4.267
sheet pixels: the edges between blocks repeat every 4.27, twice as strongly as every 2.13). His
pixels are taken back exactly as for sheets 2 to 12 (the block medians of
tools/refs/icons-from-ref-23.py, loaded from that file); only the grid is measured on the band of
his slots (BAND), because on sheet 18 his big flat dark background and his labels hide the grid's
period in the sheet as a whole.

His art windows are measured on his pixels: everything inside his black inner line (where it is two
of his pixels, a black one and a near-black one inside it, both are left out). On the 240x134
sheets a window is 47 to 63 of his pixels, fewer than the 88 of the @2x file (see
tools/ui/ui-icons-23.ts for how those are made). A window is not always square (sheet 19: 60x63);
one within 10% of square is used whole. The tip of his line where it rounds a window's corner
(his near-black, within 3 of his pixels of the corner on the 480x268 sheets, 1 on the others) takes
his art next to it (crops.json 'cornerTips').

Writes, in <out>/ref/, the same files as tools/refs/icons-from-ref-23.py (his window in his pixels
<id>.png, <id>@sheet.png, <id>@88.png, <id>@44.png, slot_<id>.png, row-<s>.png, row-<s>@1x.png,
row-<s>@4x.png, native-<s>.png, study/<id>-x6.png or -x12.png, crops.json, palette.json);
crops.json also says for each sheet the size of his picture and the icons left out. One staging
folder per sheet gives one manifest per sheet. Every file is written under a temporary name and
then renamed; the same picture always gives the same bytes. Run with python3 -I, one sheet per
staging folder:

  python3 -I tools/refs/icons-from-ref-13.py 13=docs/reference/icons-owner-reference-13.jpg <stagingDir>
  UI_OUT=<stagingDir> UI_FRAME=src/assets/ui_icons npx tsx tools/ui/ui-icons-23.ts

then copy <id>.png and <id>@2x.png into src/assets/ui_icons and <stagingDir>/manifest.json as
src/assets/ui_icons/manifest_13.json.
"""

import importlib.util
import json
import os
import sys

import numpy as np
from PIL import Image

_spec = importlib.util.spec_from_file_location('icons_from_ref_23', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons-from-ref-23.py'))
R23 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(R23)

# His picture's size in his pixels, per sheet.
SIZE = {'13': (480, 268), '14': (480, 268), '15': (240, 134), '16': (240, 134), '17': (240, 134), '18': (480, 268), '19': (240, 134), '20': (480, 268), '21': (480, 268), '22': (480, 268)}

# The rows of the sheet (sheet pixels) the grid is measured on: his slots, without his labels.
# On sheet 18 the rows are measured on his slots alone (rows 160 to 370): with his labels and the
# frames' straight edges in, the strongest period of the rows is 3.9.
BAND = {'18': {'y': (160, 370)}}
BAND_DEFAULT = (150, 400)

# Icon id (jutsu id, or the button's id for items and actions), his art window in his pixels (x0,
# y0, x1, y1; x1/y1 exclusive: everything inside his black inner line, measured on his pixels), his
# label, what it shows. His whole slot (frame included) is the window grown by FRAME on each side.
SHEETS = {
    '13': [
        ('earth_pebble_shot', (14, 83, 112, 179), 'GUIJARROS', 'Pebble Shot: grey pebbles flying right with pale dust trails, on sandy brown'),
        ('earth_spike_crown', (132, 83, 230, 179), 'CORONA', 'Spike Crown: a ring of dark stone spikes bursting up out of the ground, sparks round it'),
        ('earth_rubble_gust', (250, 83, 348, 179), 'POLVAREDA', 'Rubble Gust: a cloud of grey dust carrying rocks, on yellow'),
    ],
    '14': [
        ('fire_three_embers', (12, 84, 111, 184), 'BRASAS', 'Three Embers: three glowing embers flying up-right with smoke trails, on red and gold'),
        ('wood_golem_titan', (131, 84, 230, 184), 'GOLEM', 'Wood Golem: a golem of twisted wood and vines with green eyes and a glowing green core, on green'),
        ('lightning_spark_fan', (250, 84, 349, 184), 'ABANICO', 'Spark Fan: a fan of golden sparks and white bolts from the lower left, on night blue'),
        ('lightning_thunder_beam', (369, 84, 468, 184), 'TRUENO', 'Thunder Beam: a white-blue beam of lightning across the slot, on deep blue'),
    ],
    '15': [
        ('katon_pursuing_flame', (8, 39, 55, 87), 'LLAMA PERSECU', 'Pursuing Flame: a fireball curving round on its own trail of fire, on dark red'),
        ('lightning_jolt', (126, 38, 173, 87), 'CALAMBRE', 'Jolt: a masked ninja striking with an open hand, yellow lightning bursting from it, on blue'),
        ('kenjutsu_bleeding_cut', (185, 39, 232, 87), 'TAJO SANGRAN', 'Bleeding Cut: a blade slashing down-left through a spray of blood, on crimson'),
    ],
    '16': [
        ('water_healing_dew', (6, 39, 55, 89), 'ROCIO SANADOR', 'Healing Dew: shining drops falling in slanting rain over mist, on sky blue'),
        ('mystical_palm', (66, 39, 115, 89), 'PALMA MISTICA', 'Mystical Palm: an open gloved hand glowing with green chakra, sparkles round it'),
        ('water_geyser', (125, 39, 174, 89), 'GEISER', 'Geyser: a jet of water bursting up out of the ground in spray'),
        ('water_devouring_tide', (185, 39, 234, 89), 'TSUNAMI', 'Devouring Tide: a great curling wave with white foam'),
    ],
    '17': [
        ('wind_breeze_mantle', (6, 39, 55, 89), 'MANTO BRISA', 'Breeze Mantle: a ninja wrapped in green wind ribbons and leaves'),
        ('wind_whirl', (66, 39, 115, 89), 'REMOLINO', 'Whirl: a grey whirlwind with leaves and stones, dust at its foot'),
        ('wind_blade_daitoppa', (125, 39, 174, 89), 'GRAN RAFAGA', 'Great Gale Blade: a huge white crescent of wind, on bright blue'),
        ('wind_gale_curtain', (185, 39, 234, 89), 'VENDAVAL', 'Gale Curtain: a curtain of white wind streaks with green leaves, on slate'),
    ],
    # Five smaller slots; the first (his Whirlwind Tower) left out.
    '18': [
        ('pill', (107, 85, 185, 167), 'PILDORA SOLD', 'Soldier Pill: a leather pouch with a blue pill spilling out, cyan sparks, on teal'),
        ('bandage', (201, 85, 280, 167), 'VENDA', 'Bandage: a rolled white bandage unrolling, golden light'),
        ('antidote', (295, 85, 373, 167), 'ANTIDOTO', 'Antidote: a corked bottle of green liquid with bubbles, on green'),
        ('tag', (390, 85, 468, 167), 'SELLO EXPLOS', 'Explosive Tag: a paper tag with red writing, burning at its edges, on red'),
    ],
    # Three bigger slots.
    '19': [
        ('tagTrap', (11, 32, 71, 95), 'ESCONDER SELLO', 'Hide Tag: two hands pressing a red-sealed tag into the earth among grass'),
        ('stone', (90, 32, 150, 95), 'LANZAR PIEDRA', 'Throw Stone: a ninja flicking a pebble that sails off in ripples of sound, on night blue'),
        ('drag', (169, 32, 229, 95), 'ARRASTRAR CUER', 'Drag Body: a ninja dragging a fallen ninja by the arm, on violet'),
    ],
    '20': [
        ('body_flicker', (11, 75, 111, 178), 'DESVANECER', 'Body Flicker: a ninja dissolving into streaks of grey mist'),
        ('substitution_kawarimi', (130, 75, 231, 178), 'SUSTITUCION', 'Substitution: a wooden log dummy in a burst of smoke, shuriken stuck in it'),
        ('leaf_hurricane_senpuu', (249, 75, 350, 178), 'PATADA HURACAN', 'Leaf Hurricane: a ninja in a flying kick inside a green whirl of wind and leaves'),
        ('taijutsu_rush', (369, 75, 469, 178), 'EMBESTIDA', 'Rush: a ninja charging right in a blur of blue speed lines, dust behind'),
    ],
    # The fourth (his Rasenshuriken) left out; his new one is on sheet 22.
    '21': [
        ('water_tide_s', (12, 77, 112, 180), 'DRAGON TSUNAMI', 'Dragon Tsunami: a dragon of water rising out of a great curling wave'),
        ('genjutsu_mirage', (130, 77, 231, 180), 'MIND TWIST', 'Mind Twist (our Mirage): a hooded ninja with a violet spiral for a face, in violet shards'),
        ('wind_whirlwind_tower', (249, 77, 350, 180), 'TORRE TORBEL', 'Whirlwind Tower: a great tornado tearing a stone tower apart, blocks flying'),
    ],
    # Only the fourth: the other three repeat icons of sheets 21 (the owner: take only Rasenshuriken).
    '22': [
        ('rasenshuriken_wind', (368, 79, 468, 182), 'RASENSHURIKEN', 'Rasenshuriken: a green wind spiral with flying rocks'),
    ],
}

# His line is two of his pixels on some sides (a black one and a near-black one inside it): both are
# left out. Sides where his art runs over the inner one of the two in places, and the share of it
# that must be dark there: Dragon Tsunami's white foam crosses it at the bottom.
LOOSE = {'water_tide_s': {'bottom': 0.75}}

# The frame round his window, in his pixels (for slot_<id>.png): on his 480x268 sheets the steel is
# two pixels, a darker band two more and his line one; on the 240x134 sheets half that.
FRAME = {'480': 7, '240': 4}

# The icons on his sheets he asked us to leave out, with his words.
SKIP = {
    '13': [('GOLEM', 'wood_golem_titan', 'este golem no lo uses no me gusto (his new golem is on sheet 14)')],
    '15': [('ESPEJISMO', 'genjutsu_mirage', 'espejismo ignoralo no me gusto (his Mind Twist on sheet 21 is its icon)')],
    '18': [('TORRE TORBEL', 'wind_whirlwind_tower', 'no me gusto torre torbellino no la pongas lo demas si (his new tower is on sheet 21)')],
    '21': [('RASENSHURIKEN', 'rasenshuriken_wind', 'ignora rasenshuriken (his new one is on sheet 22)')],
    '22': [('DRAGON TSUNAMI', 'water_tide_s', 'repeats sheet 21'), ('MIND TWIST', 'genjutsu_mirage', 'repeats sheet 21'), ('TORRE TORBEL', 'wind_whirlwind_tower', 'repeats sheet 21')],
}


def grid(a, size, sheet):
    """His pixel grid as R23.grid, measured on the band of his slots (BAND)."""
    bx = BAND.get(sheet, {}).get('x', BAND_DEFAULT)
    by = BAND.get(sheet, {}).get('y', BAND_DEFAULT)
    L = a.mean(2)
    H, W = L.shape
    px, py = W / size[0], H / size[1]
    gx = np.abs(np.diff(L[bx[0]:bx[1]], axis=1)).mean(0)
    gy = np.abs(np.diff(L, axis=0)).mean(1)
    gyb = gy[by[0]:by[1] - 1]
    sx, sy = R23.spectrum_pitch(gx), R23.spectrum_pitch(gyb)
    # 2%: the band is 250 rows, so its spectrum is coarser than the whole sheet's.
    if abs(sx / px - 1) > 0.02 or abs(sy / py - 1) > 0.02:
        sys.exit('his pixel grid is not %dx%d: the edges repeat every %.3f x %.3f sheet pixels' % (tuple(size) + (sx, sy)))

    def phase(g, p, n, lo, hi):
        best = None
        for t in range(int(p * 20)):
            ph = t / 20
            idx = [int(np.floor(ph + k * p)) - 1 for k in range(1, n)]
            idx = [i for i in idx if lo <= i < hi]
            e = float(g[idx].mean())
            if best is None or e > best[0] + 1e-9:
                best = (e, ph)
        return best

    ex, phx = phase(gx, px, size[0], 0, len(gx))
    ey, phy = phase(gy, py, size[1], by[0], by[1] - 1)
    return {
        'size': list(size),
        'pitch': [px, py],
        'spectrumPitch': [round(sx, 4), round(sy, 4)],
        'phase': [phx, phy],
        'edgeRatio': [round(ex / float(gx.mean()), 3), round(ey / float(gyb.mean()), 3)],
        'band': {'x': list(bx), 'y': list(by)},
    }


def line_black(c):
    """His black inner line: near-black and neutral (his art's darkest shades carry their hue)."""
    return max(c) < 30 and max(c) - min(c) < 14


def clean_corners(win, reach):
    """His inner line is rounded at the window's corners: its tip reaches into the window there.
    Those pixels (within `reach` of the corner, x + y, and his black) take the mean of their
    neighbours inward that are not, filled from the inside out. Returns how many per corner."""
    h, w, _ = win.shape
    out = win.copy()
    done = {}
    for name, sx, sy in (('topLeft', 1, 1), ('topRight', -1, 1), ('bottomLeft', 1, -1), ('bottomRight', -1, -1)):
        n = 0
        for d in range(reach, -1, -1):
            for dx in range(d + 1):
                dy = d - dx
                x = dx if sx > 0 else w - 1 - dx
                y = dy if sy > 0 else h - 1 - dy
                if not line_black(out[y, x]):
                    continue
                nb = [out[y + sy * j, x + sx * i] for i, j in ((1, 0), (0, 1), (1, 1))]
                nb = [c for c in nb if not line_black(c)]
                if not nb:
                    continue
                out[y, x] = np.mean(nb, axis=0)
                n += 1
        done[name] = n
    return out, done


def main():
    args = sys.argv[1:]
    if len(args) < 2 or not all('=' in a for a in args[:-1]):
        sys.exit('usage: python3 -I tools/refs/icons-from-ref-13.py 13=<icons-owner-reference-13.jpg> [...] <stagingDir>')
    srcs = dict(a.split('=', 1) for a in args[:-1])
    if any(k not in SHEETS for k in srcs):
        sys.exit('unknown sheet in %s (known: %s)' % (', '.join(srcs), ', '.join(SHEETS)))
    out = args[-1]
    ref = os.path.join(out, 'ref')
    study = os.path.join(ref, 'study')
    os.makedirs(study, exist_ok=True)
    crops = {'grid': {}, 'icons': {}, 'leftOut': {}}
    pal = {}
    for sheet, path in srcs.items():
        size = SIZE[sheet]
        im = Image.open(path).convert('RGB')
        if abs(im.size[0] / size[0] - im.size[1] / size[1]) > 0.02:
            sys.exit('expected his %dx%d picture scaled up evenly, got %dx%d (%s)' % (tuple(size) + im.size + (path,)))
        a = np.asarray(im).astype(float)
        g = grid(a, size, sheet)
        nat, xs, ys, spread = R23.native(a, g, size)
        g['blockSpread'] = round(spread, 3)
        g['source'] = os.path.basename(path)
        crops['grid'][sheet] = g
        if sheet in SKIP:
            crops['leftOut'][sheet] = [{'label': l, 'id': i, 'why': w} for l, i, w in SKIP[sheet]]
        R23.save_atomic(R23.to_img(nat), os.path.join(ref, 'native-%s.png' % sheet))
        L = nat.mean(2)
        frame = FRAME[str(size[0])]
        reach = 3 if size[0] == 480 else 1
        for jid, box, label, what in SHEETS[sheet]:
            x0, y0, x1, y1 = box
            # The window must sit inside his black inner line: the line of his pixels just outside
            # each side is dark.
            sides = {'left': L[y0:y1, x0 - 1], 'right': L[y0:y1, x1], 'top': L[y0 - 1, x0:x1], 'bottom': L[y1, x0:x1]}
            for side, s in sides.items():
                if np.mean(s < 45) < LOOSE.get(jid, {}).get(side, 0.85):
                    sys.exit('%s: the window %s is not inside his black inner line (%s)' % (jid, box, side))
            if abs((x1 - x0) / (y1 - y0) - 1) > 0.1:
                sys.exit('%s: the window %s is not (within 10%%) square' % (jid, box))
            win, tips = clean_corners(nat[y0:y1, x0:x1], reach)
            R23.save_atomic(R23.to_img(win), os.path.join(ref, jid + '.png'))
            sb = (xs[x0], ys[y0], xs[x1], ys[y1])
            sc = im.crop(sb)
            R23.save_atomic(sc, os.path.join(ref, jid + '@sheet.png'))
            R23.save_atomic(sc.resize((88, 88), Image.LANCZOS), os.path.join(ref, jid + '@88.png'))
            R23.save_atomic(sc.resize((44, 44), Image.LANCZOS), os.path.join(ref, jid + '@44.png'))
            slot = (x0 - frame, y0 - frame, x1 + frame, y1 + frame)
            ss = (xs[slot[0]], ys[slot[1]], xs[slot[2]], ys[slot[3]])
            R23.save_atomic(im.crop(ss), os.path.join(ref, 'slot_' + jid + '.png'))
            w, h = x1 - x0, y1 - y0
            k = 6 if size[0] == 480 else 12
            R23.save_atomic(R23.to_img(win).resize((w * k, h * k), Image.NEAREST), os.path.join(study, '%s-x%d.png' % (jid, k)))
            crops['icons'][jid] = {'sheet': sheet, 'label': label, 'box': list(box), 'size': [w, h], 'slot': list(slot), 'sheetBox': list(sb), 'sheetSlot': list(ss), 'cornerTips': tips, 'what': what}
            pal[jid] = R23.kmeans(win, 16)
        s0, s1 = SHEETS[sheet][0][1], SHEETS[sheet][-1][1]
        rb = (xs[s0[0] - frame - 2], ys[s0[1] - frame - 2], xs[s1[2] + frame + 2], ys[s1[3] + frame + 2])
        row = im.crop(rb)
        R23.save_atomic(row, os.path.join(ref, 'row-%s.png' % sheet))
        crops['grid'][sheet]['row'] = list(rb)
        # His row scaled so his art window is as big as ours (44 at 1x, 176 at 4x), for the sheet.
        ww = xs[s0[2]] - xs[s0[0]]
        for name, target in (('1x', 44), ('4x', 176)):
            k = target / ww
            R23.save_atomic(row.resize((round(row.size[0] * k), round(row.size[1] * k)), Image.LANCZOS), os.path.join(ref, 'row-%s@%s.png' % (sheet, name)))
        crops['grid'][sheet]['rowScale'] = {'1x': 44 / ww, '4x': 176 / ww}
    R23.write_atomic(json.dumps(crops, indent=1) + '\n', os.path.join(ref, 'crops.json'))
    R23.write_atomic(json.dumps(pal, indent=1) + '\n', os.path.join(ref, 'palette.json'))
    print('wrote %d icons and their slots to %s' % (sum(len(SHEETS[k]) for k in srcs), ref))
    for s, g in crops['grid'].items():
        print('sheet %s (%dx%d): pitch %.4f x %.4f (spectrum %.4f x %.4f), phase %.2f %.2f, edge ratio %.2f %.2f, block spread %.2f' % (
            s, g['size'][0], g['size'][1], g['pitch'][0], g['pitch'][1], g['spectrumPitch'][0], g['spectrumPitch'][1], g['phase'][0], g['phase'][1], g['edgeRatio'][0], g['edgeRatio'][1], g['blockSpread']))
    for jid, c in crops['icons'].items():
        print('  %s %s %dx%d corner tips %s' % (c['sheet'], jid, c['size'][0], c['size'][1], c['cornerTips']))


if __name__ == '__main__':
    main()
