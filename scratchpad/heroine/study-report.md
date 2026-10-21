**Study finished and committed on `heroine/study` (commit `d1bb0bd`), not pushed.** All four heroines (Lyra, Elise, Saya, Aurelia) are now brought down to our scale on our female idle, with the body below the head cleaned up by hand, and the proportions sheet is done. Type check passes, `npm test` passes (161/161), and running the script twice gives the same bytes.

- **Branch / commit:** `heroine/study` @ `d1bb0bd`, continuing from the earlier WIP. Its grid code is kept and gives the same native pixels for Lyra and Elise.
- **Worktree:** `/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_ee0fad47-6e0-1`

**Pixel grid per picture (picture pixels per one of hers)**

| | pitch (x × y) | phase (x, y) | native (W × H) | figure height |
|---|---|---|---|---|
| Lyra | 7.806 × 7.812 | 5.57, 0.14 | 190 × 256 | 256 (rows 0–255) |
| Elise | 7.806 × 7.812 | 5.61, 0.02 | 190 × 256 | 256 |
| Saya | 10.0 | 0, 0 | 200 × 200 | 198 (rows 2–199) |
| Aurelia | 9.66 | 0, 0 | 200 × 200 | 198 |

Ours is 91 px tall (rows 128–218).

- **Lyra and Elise:** overlaying them confirms they are one body in one pose, so they share one set of joints and one set of part cuts.
- **Saya and Aurelia:** a similar pose but a different body each (Saya has thicker limbs), so each has its own joints.
- **Joints:** our female idle joints are in `OUR_JOINTS`; our eyes are at near (126, 141.5) and far (132.5, 141.5).

**Scale per segment (our px per one of hers: down × across)**

| | head | neck–pelvis | upper arm | forearm | thigh | shin | hand | foot | weapon |
|---|---|---|---|---|---|---|---|---|---|
| Lyra / Elise | 0.51 × 0.56 | 0.37 × ~0.42 | 0.32 × 0.42 | 0.42 × 0.42 | 0.26 × 0.42 | 0.31 × 0.42 | 0.46 | 0.50 | 0.36 |
| Saya | 0.62 × 0.65 | 0.49 × ~0.51 | 0.44 × 0.48 | 0.55 × 0.48 | 0.31 × 0.48 | 0.48 × 0.48 | 0.55 | 0.55 | 0.46 |
| Aurelia | 0.60 × 0.55 | 0.52 × ~0.49 | 0.42 × 0.48 | 0.47 × 0.48 | 0.32 × 0.48 | 0.39 × 0.48 | 0.55 | 0.55 | 0.46 |

- The head is scaled about the eyes so hers land on ours.
- The weapon keeps her own angle (about 52°), which is already the default idle angle in `grip.ts`.
- Pose differences:
  - Her near leg steps out and her far leg is straight; ours is the other way round. The reduced legs are bent onto our leg lines, with her soles on ours (rows 218 and 210).
  - The sword in her near hand hangs blade-down across the legs, as ours does at rest.

**Palettes (hex, darkest first, 93 / 80 / 64 / 57 colours)**

- **Lyra:** 04010d 04101c 160a17 300918 091c28 3b0d21 2a1c24 590f26 352628 2a2a37 133c3b 691f24 473435 61301c 792824 8c1c35 404049 503b3c 464654 2e525e 6c4636 634947 246a48 963b2b 824a24 844440 565862 a6442d 4c6978 935623 795d58 477483 b24f33 9c5d27 686a74 966234 3e808d a85a53 488895 8b7061 727882 ab6f31 489b62 688493 b47831 c06960 9a7e6a 788c9a d07344 c8756a be8442 4eb570 3eb6b5 8799a3 ac937a a29881 ce9242 d88674 98a4aa 40cccb d39c58 bb9f88 7ebe90 df9180 daa14c 4ecfd6 3ee2e2 9ebcc3 b0b6bc cbb194 eea692 cfb599 e8b45e 46ece8 3af4f0 55f2f1 a6ced6 f4c66e c7d0d4 badac6 aadde3 e4d0af fdd36c a6efe8 fdceb0 fed982 d4e4ea ffe29c ffe7b8 f6e8cd cef5f3 dcf6f7 fbfdfd
- **Elise:** 080613 1a101a 181b37 052c67 342325 26263e 1b2858 4c2924 26396d 0e447e 573027 263d7d 4e3739 354566 683c30 464754 115893 2d5090 614a48 764534 525368 804936 385c9e 345ea9 3662af 1276b0 865339 7d564c 4068ac 686771 905f3c 9b5754 6a6b80 9e6637 787782 5e7faa a47043 b76660 a0765a 8b8076 b27b44 c67169 88889b b88652 8d8ea0 a99271 c48d52 2bc3d8 d68271 d78876 cb9658 9f9fac cf9b48 a6a09b 79aed9 b7a684 a8a8b9 d4a362 e59580 ddac5a beaf9e dcb06e b6b6bd e6b75e d2bb94 f3ae92 c4c4ce ecc476 e0c79d ced0dc f4d389 facdac e3d9cc f8dc92 fce89e eaeaf3 feeeb8 efeff9 fefae0 fefef9
- **Saya:** 02010d 050416 14101f 1d1d32 1f2241 4b0f30 302525 641a36 343545 6e1c38 453631 7c1d36 2e3e5d 314161 534239 842b3c 704336 3f5177 604f46 7d4c37 ad333f bb2e3e 575b67 0a79c0 85543e a04641 a95443 088cce 6c6e78 647299 9d6e44 c16244 8d7768 7e7f8e be7064 b6834e 9094a4 989492 c48e42 a8927c d8826e c69151 dc8c76 a0a4b2 d4a35d d8a84c c9a880 c1b3a1 eba789 e2b668 e8ba58 b7becc e6c486 f7c962 cacdd5 f4c8a5 f6d886 d6dae6 fbe499 eae3cb feeeb5 f2f1f1 fef6d8 fefefc
- **Aurelia:** 030101 070504 130f17 06285b 36221f 4a312c 583622 563832 7e2c34 6c4427 5a4a42 a02f36 794f38 226ba3 6e5a52 86583d 8e6447 966536 796e67 a55e55 8b7675 a17354 329cbd a9793c 8e7b79 5897c6 b88744 c7796d b38761 a08c84 c4934c a9968b d68a7a b39f8f c79e76 d4a251 73bcda acb1b6 e89e88 c2b0a2 deb05c d8b286 bebdbd ecc268 f2b69a d2c2b2 e6c593 d6c7b7 a9d8e7 f9ccaa fcd77a eadeca c6e9f5 f9dfac feefc6 f9f2e1 ffffff

Every pixel of every reduced reference is one of its picture's colours (checked).

**How the reduced references are made.** Each part is reduced automatically in her own colours, then everything below the head is redrawn by hand at our scale, along with her eyes, brows and mouth. Elise's long hair is redrawn too. The hand-drawn pixels live in `tools/refs/heroine_paint.py`, and `reduced(which)`, `reduced_parts(which)` and `reduced_layers(which)` in `heroine_ref.py` load the result.

**What is hidden in her picture and was filled (part branches should check these)**

- **Back hair:** the stretch behind the torso is hidden; only the part to the left of the arm and between the arm and the body is hers.
- **Far arm:** mostly behind her torso; it was drawn after the near arm's design. The far hand is its own part.
- **Grips:** hidden in her fists in all four. Aurelia's staff shaft is hidden in her far hand.
- **Coat lining (Lyra, Elise):** the lining between and behind the legs is hidden by her boots, and the inner sides of the tails are covered. Both were continued from what shows.
- **Aurelia's skirt:** the side and back panels behind her legs were continued; her thighs show only in the slits.
- **Thighs:** under the skirts. The blade covers part of the near boot and knee guard and the far foot (Lyra, Elise, Saya).
- **Saya's scabbard:** mostly behind her near leg; only the top and the gold tip show.
- **Saya's second blade:** her picture draws two blades from one guard (one down-left, one down-right). Both are kept: the down-right one is `blade`, the other is `blade2`. Our idle holds one weapon, so the owner should decide on the extra blade.
- **Saya's scarf:** the part behind her neck and hair is hidden.

**Proportions (`proporciones.png`)**

| % of height | Lyra / Elise | Saya | Aurelia | Ours |
|---|---|---|---|---|
| heads tall | 5.4 | 5.1 | 5.2 | 4.1 |
| head | 18 | 20 | 19 | 24 |
| chin to crotch | 39 | 39 | 37 | 35 |
| legs | 42 | 41 | 44 | 41 |
| feet | 8.6 | 9.6 | 8.1 | 12.5 |
| shoulder width | 23 | 22 | 22 | 27 |
| waist width | 15 | 18 | 17 | 18 |

- **What matters most for "lo más igual":**
  1. The head: ours is about 30% bigger relative to the body, which is the main source of the chibi look.
  2. The feet (and hands): ours are much bigger.
  3. Our neck and torso are shorter, and our shoulders are wider.
- Leg length is already the same (crotch at about 58% of the height in all of them).
- A refined female body at the same height and scale (head about 19–20% instead of 24%, longer neck and torso, narrower shoulders, smaller feet and hands) would get much closer.
- The body was not changed. That is the owner's call, because the existing female heads, hairstyles and armours were fitted to the current body.

**Files**

- Repository:
  - `tools/refs/heroine_ref.py`
  - `tools/refs/heroine-study.py`
  - `tools/refs/heroine_paint.py`
  - `tools/refs/heroine-proportions.py`
  - `tools/refs/heroine-idle.mts`
  - `tools/refs/data/heroine-{lyra,elise,saya,aurelia}-{reduced,parts,layers}.npy`
  - `docs/reference/saya-owner-reference.jpg`
  - `docs/reference/aurelia-owner-reference.jpg`
  - rows for all four in `docs/reference/README.md`, and a section in `tools/refs/README.md`
- Images to show the owner:
  - `/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/heroine/study/proporciones.png`
  - `/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/heroine/study/overlay@8.png`
  - `/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/heroine/study/lyra-compare@4.png` (her picture beside ours; also `elise-`, `saya-` and `aurelia-compare@4.png` in the same folder)
- Per heroine, in that same `.../scratchpad/heroine/study/` folder: `<name>-reduced@1.png`, `<name>-reduced@8.png`, `<name>-native@4.png`, `<name>-palette.png` and `<name>-parts@4.png`, for lyra, elise, saya and aurelia.

**Rebuild:**
```
npx tsx tools/refs/heroine-idle.mts <out>
python3 -I tools/refs/heroine-study.py <out> <out>/female-idle.png --write
python3 -I tools/refs/heroine-proportions.py <out> <out>/female-idle.png
```

**For the owner (in Spanish):** Listo el estudio de las cuatro (Lyra, Elise, Saya, Aurelia): cada una reducida a nuestra escala sobre nuestro cuerpo femenino, en sus propios colores, limpiada a mano. En proporciones.png se ve que lo que más cambia es la cabeza (ellas miden 5 a 5,4 cabezas y el nuestro 4,1), y también nuestros pies grandes y el torso corto y ancho. Un cuerpo femenino afinado a la misma escala se acercaría mucho más; la decisión es suya.