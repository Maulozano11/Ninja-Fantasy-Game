# The owner's art references

Rule from the owner: every reference image he sends is the quality bar, and must be copied as
exactly as possible. It is not reinterpreted. The usual way to do that:

1. Scale his panel so his character matches ours (about 96–100 px tall at 1x).
2. Build the key frame from his pixels:
   - crop the effect;
   - downsample it with an area or box filter;
   - quantize it to a palette sampled from his image;
   - remove the background and his character;
   - clean the edges to a 1 px tinted outline.
3. Derive the other frames of the animation from that key frame. The peak frame is his picture.

Every deliverable puts his crop and our frame side by side at the same scale.

| File | What it is the reference for |
|---|---|
| `s-tier-jutsu-standard.jpg` | The enhanced Great Fire Annihilation, and the bar for every rank S jutsu. |
| `fire-set-owner-reference.jpg` | Every fire effect: bolt, phoenix, stream, breath, sphere, slash, multi, hit, mushroom blast, walls (3 orientations), engulfing aura, fireball, great fireball. |
| `lightning-set-owner-reference.jpg` | Every lightning effect: bolt, stream, breath, sphere, slash, multi, hit, the sky-strike blast, walls (3 orientations), aura. |
| `phoenix-owner-reference.jpg` | The fire phoenix: 8-frame flight loop, dive, attack, variant forms. |
| `raiju-owner-reference.jpg` | The lightning beast (raijū): 8-frame pounce loop, plus the phoenix at scale. |
| `kirin-owner-reference.jpg` | Kirin: the normal lightning bolt and the enhanced lightning dragon. |
| `poses/back-view-fighting-stance.png` | A ninja seen from behind, for a special scene or animation later. |
