# Proposals awaiting approval

Changes prepared while the owner was away. None of them is in the game yet:
each one is a patch against the branch plus a preview image. Once a proposal
is approved it is applied (`git apply proposals/<name>.patch`), committed, and
its files here are removed.

| Proposal | Preview | What it changes |
| --- | --- | --- |
| katana-parts | katana-parts.png | Katanas in the style of Demon Slayer's nichirin blades, built from parts with three versions each: steel (silver tamahagane, black kurogane, nichirin in the nature's colour), blade (shinogi-zukuri straight temper, Kogarasu-maru, Masamune style with Kurikara), guard (mokko, kaen flames, mitsudomoe) and hilt (hineri-maki, Heian tachi with tassel, shimenawa with shide). katana-parts.ts is the generator (pixel parts, palettes); it goes into src/sprite/items once approved, with the part pickers in the creator. |
