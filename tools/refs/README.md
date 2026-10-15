# Converters from the owner's reference sheets

The owner wants his reference images copied as exactly as possible (see
`docs/reference/README.md`). These scripts turn his sheets into frame data that the sprite
generators in `tools/world-sprites/` decode, so a normal build needs no image files. Run them by
hand when a reference changes. Use `python3 -I`, and keep the references outside the repo's code
folders.

- `beasts-from-ref.py`: the phoenix and the raijū for `vfx_beasts`. It writes
  `tools/world-sprites/vfx-beasts-ref-fire.ts` and `vfx-beasts-ref-lightning.ts`.

      python3 -I tools/refs/beasts-from-ref.py phoenix docs/reference/phoenix-owner-reference.jpg docs/reference/raiju-owner-reference.jpg tools/world-sprites/vfx-beasts-ref-fire.ts
      python3 -I tools/refs/beasts-from-ref.py raiju docs/reference/raiju-owner-reference.jpg docs/reference/raiju-owner-reference.jpg tools/world-sprites/vfx-beasts-ref-lightning.ts

  Its `crane` mode copies the wind crane from his wind sheet (BEAST (WIND CRANE, NEWER), two frames
  that become frames 0 and 3; the in-betweens swing his raised wings back) into
  `tools/world-sprites/vfx-beasts-ref-wind.ts`:

      python3 -I tools/refs/beasts-from-ref.py crane <wind-sheet.jpg> <wind-sheet.jpg> tools/world-sprites/vfx-beasts-ref-wind.ts

- `vfx-fire-extract.py` (when present): pieces of the fire references for the fire generators.

- `water-from-ref.py`: the whole water set (`vfx_water_v3`) from his water sheet. It writes
  `tools/world-sprites/vfx-water-v3-refdata.ts`, which `vfx-water-v3.ts` animates. The third
  argument is our character at 1x (kit `characterRef()` saved as a PNG; it splits the aura into
  the layers behind and over the figure). With a fourth, a review folder, it also writes his crops
  at game scale and before/after previews.

      python3 -I tools/refs/water-from-ref.py docs/reference/water-set-owner-reference.jpg tools/world-sprites/vfx-water-v3-refdata.ts <character.png> [reviewDir]
