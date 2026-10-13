# Proposals awaiting approval

Changes prepared while the owner was away. None of them is in the game yet:
each one is a patch against the branch plus a preview image. Once a proposal
is approved it is applied (`git apply proposals/<name>.patch`), committed, and
its files here are removed.

| Proposal | Preview | What it changes |
| --- | --- | --- |
| `grimoire-pose` | `grimoire-pose.png` | The Grimoire cast copied from the example: the open book carried at the side (seen from outside, its emblem by chakra nature), the other arm pointing with energy whirling at the fingertip. |
| `eye-cast` | `eye-cast.png` | New cast style **Ocular Surge**: the eyes blaze in the chakra color, a flame streams back from the near eye and energy surges up around the head. A one-handed seal before the chest; weapons stowed. |
| `arcane-script` | `arcane-script.png` | New cast style **Arcane Script**: gigantic glowing letters of an Arabic-style script (isolated nun, ba, ayn, mim, qaf, hha, waw) whirl around the caster as the incantation, in the chakra color; near palm open, far hand raised. |
| `women-armors` | `women-armors.png` | Two fitted armors only for the female and slender bodies: **Crimson Oath Raiment** (white dress with red trim, silver breastplate, pleated skirt) and **Lionheart Battle Dress** (blue dress, silver cuirass with gold, faulds, gauntlets, greaves). Adds `bodies` to items so the creator and the randomizer only offer them to those bodies. |
| `hairstyles-saber-lelouch-kallen` | `hairstyles-saber-lelouch-kallen.png` | Three hairstyles for approval: **Crowned Braid** (golden braided bun with a recolorable ribbon, bangs, face-framing locks and one strand standing up; Saber-style), **Regal Fringe** (straight black hair over the ears with sharp bangs; Lelouch-style) and **Scarlet Flick** (short layered red spikes flicking outward; Kallen-style). |

The three cast-style patches each apply on their own; applied together, the second and third need their one-line additions to `CastStyle`, `CAST_STYLES`, `RigPose`, `CAST_POSES` and `BUSY` merged by hand.
