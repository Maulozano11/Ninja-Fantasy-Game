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

The three cast-style patches each apply on their own; applied together, the second and third need their one-line additions to `CastStyle`, `CAST_STYLES`, `RigPose`, `CAST_POSES` and `BUSY` merged by hand.
