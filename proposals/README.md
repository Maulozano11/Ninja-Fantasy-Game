# Proposals awaiting approval

Changes prepared while the owner was away. None of them is in the game yet:
each one is a patch against the branch plus a preview image. Once a proposal
is approved it is applied (`git apply proposals/<name>.patch`), committed, and
its files here are removed.

| Proposal | Preview | What it changes |
| --- | --- | --- |
| title-screen | title-screen.png | The game opens on a title screen over the owner's burning forest (animated: his flames lick, embers rise, smoke drifts behind the trunks; tools/scenes/creator_forest.py): Start game, New game, Load game (saved game, saved ninjas, import JSON) and Practice (practice battles, arena, campaign arcs). The web navigation and footer are gone; every screen has a Main menu button, the battle menu too. The ninja you finish is saved on the device. |
