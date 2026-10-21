# Kirin (`kirin_thunder`): S-rank lightning signature, v2

Both versions are built from the owner's reference `art2/REF-kirin-owner.jpg`, copying it as closely as possible. His two panels are our key frames: each is `impact` frame 1.

## How it is built

1. **`art2/vfx-kirin-src/vfx-kirin-extract.py`** (Python 3, PIL, numpy). Run it only when the reference changes: `python3 -I vfx-kirin-extract.py <art2>`.
   - It cuts each of his panels into layers, removing his character and the navy background:
     - cloud and vortex;
     - kanji;
     - the bolt (normal) or the dragon (enhanced);
     - the ground (rings, scorch or crater, burst);
     - loose sparks and 20 flying rock chunks (enhanced).
   - Where the bolt or the dragon covered the cloud's eye or the ground rings, those are filled from the same swirl band or ring further round. So nothing opens up when the bolt or dragon dims.
   - Each panel gets one uniform scale, chosen so his outer ground ring spans our circle: 0.60 for 3 m and 0.72 for 4.5 m.
   - Each layer is area-downsampled and quantized to a 64-colour palette sampled from his effect pixels.
   - It cleans the layers: white kanji and bolt cores (no JPEG specks), pinholes filled, enclosed pockets filled, crumbs dropped.
   - Where his enhanced panel was cut at the edge, the cloud is re-edged with rounded billows.
   - It writes `<version>-<layer>.png`, a kanji stroke map and `<version>.json` (eye, mouth, ring, debris).
2. **`tools/world-sprites/vfx-sig-kirin.ts`** animates those layers and writes the staging group:

   ```bash
   WORLD_OUT=<art2>/staging npx tsx tools/world-sprites/vfx-sig-kirin.ts <art2>
   ```

The output is deterministic: a second extraction and build gives byte-identical files (all 42 checked).

## Sprites (group `vfx_lightning_sig`, tag `vfx`)

| sprite | circle | frame | anchor (ring centre on the ground) | widest row |
|---|---|---|---|---|
| `kirin` | 3 m | 596 x 651 | 339, 541 | 7152 px (sustain) |
| `kirin_enh` | 4.5 m | 678 x 820 | 435, 705 | 8136 px (sustain) |

| anim | frames | fps | loop | what happens |
|---|---|---|---|---|
| `gather` | 10 | 12 | no | His vortex grows from the eye and spins up. The kanji lights up stroke by stroke in writing order: each stroke glows in from electric blue to his white core with a white flash, with no wipe edge. The sparks and rays come last. |
| `strike` | 8 | 16 | no | **Normal:** the leader reaches down, then his bolt connects, flickers and re-strikes. **Enhanced:** his dragon dives out of the eye along the path to the ground. |
| `impact` | 8 | 14 | no | Frame 1 is his panel exactly. Then it settles into the held state: the burst calms, the rings pulse, his rocks are flung out and land, and sparks spit off the ring. |
| `sustain` | 12 | 12 | yes | The strike held on the target for 1 s: <ul><li>the bolt stays connected and flickers, its branches re-striking;</li><li>the rings pulse and spit sparks and chips;</li><li>the kanji breathes;</li><li>the vortex churns slowly;</li><li>enhanced: the dragon writhes and roars, its jaws flaring.</li></ul> |
| `fade` | 8 | 12 | no | Frame 1 continues the sustain's phase. The bolt and dragon dim to electric blue. The kanji loses its white and burns away from its stroke edges inward, with embers floating off. The cloud drifts up and thins into wisps along its swirl, and the rings fade with a little smoke. The last frame is almost empty. |

Play order: gather → strike → impact → sustain (1 s) → fade. In total that is 46 frames, about 3.4 s.

## Checks

- **Frame border:** no frame touches its border (every frame of both sheets).
- **Holes and noise:** an automatic check covers every frame for clear pinholes inside the art and stray single pixels. It finds 0 stray pixels in every frame. All but a few frames have 0 pinholes; the rest have at most 2 single pixels. Each frame also gets a final clean-up pass.
- **Seams:** mean pixel change across each seam, compared with a typical sustain step:

  | seam | normal | enhanced |
  |---|---|---|
  | impact 8 → sustain 1 | 4.3 | 5.9 |
  | sustain 12 → sustain 1 (loop) | 3.9 | 5.5 |
  | sustain 12 → fade 1 | 3.9 | 5.5 |
  | typical sustain step | 3.2 | 4.3 |

  The enhanced sustain steps vary from 2.5 to 6.4.

## Deliverables

- `vfx-kirin-v2-compare.png`: his two panels, scaled to our sprites, next to our `impact` frame 1 for each, at the same scale.
- `vfx-kirin.png`: both versions side by side at 2x, at the key moments of each phase, sustain included, with the character for scale.
- `vfx-kirin.gif` and `vfx-kirin-enh.gif`: the full playback of all five phases at 1x with the character. The empty last frame is held for 0.6 s before the loop.

## Known differences from his panels

- The enhanced panel was trimmed by a few pixels at the left (ray tips) and on the right (cloud and crater edge) to keep the 12-frame sustain row under 8192 px. His cloud's right edge was re-cut as billows.
- Our character is about 98 px tall. His characters come out at 86 px (normal) and 104 px (enhanced) at the circle-matched scales.
