# New art standard (owner's reference, Oct 13)

The owner sent a reference image of OUR camp screen, re-imagined. He said: "change your camp for this
one, this is waaay better, and the sprites of the objects of the world should have that quality".
Nobody else can see the image, so here it is in words. Treat it as the target look.

## The camp scene (the picture at the top of the camp screen, about 2.2:1)
- **Time and light.** Night, lit by moonlight with one strong warm pool of firelight in the centre.
  - Sky: deep blue to indigo with soft layered clouds lit from behind. A bright full moon sits upper
    centre-right, with a soft halo and a few stars.
  - Moonlight is cool blue-teal on every surface. The campfire throws warm orange light about 3–4 m
    around (ground, tents, faces), with a rim light on everything facing it.
- **Depth layers, back to front:**
  1. Sky and moon.
  2. A distant forest of tall straight trunks, desaturated blue-teal silhouettes with misty gaps.
  3. Mid trees: darker trunks with some bark detail, foliage clumps catching moonlight on top edges.
  4. FRAME TREES. Huge ancient gnarled trees at the left and right edges, cut by the frame.
     - Thick twisting trunks, deep bark furrows, knots, moss patches.
     - Exposed roots spreading over the ground, ferns at their feet.
     - Their canopies form an arch across the top corners, with hanging leaves and a few vines.
     - This framing (a natural vignette) is a big part of why it looks better.
  5. The clearing: grass with darker tufts, worn dirt patches, small stones, a few tiny flowers.
     Fallen logs and stumps serve as seats.
- **Props (all with the new quality bar):**
  - **Left:** a big canvas A-frame tent.
    - Two wooden poles cross at the top ridge and stick out.
    - Taut guy ropes and stakes; the canvas has seams, sag between poles and a dark open entrance.
    - Beside it: travel backpacks with rolled bedrolls strapped on, a sword stuck upright in the
      ground, a tree stump with an axe.
  - **Centre:** the campfire.
    - A ring of grey stones and crossed burning logs.
    - A bright layered flame (white-yellow core, orange, red tips), sparks, and a tall soft smoke
      column that curls upward and catches the moonlight.
    - One character holds a frying pan over it, so cooking gear is welcome: a pot on a tripod or a
      pan, a kettle.
  - **Right:**
    - A second, smaller A-frame tent, with two katanas stuck upright in the ground beside it.
    - A red-lacquered TORII gate (shrine gate) with black top beams. A small wooden plaque hangs
      in the middle, and a shimenawa rope with zigzag white paper shide hangs under the top beam.
    - A lit stone lantern (tōrō) with moss beside the gate. Ferns and bushes at the bases.
  - Characters stand around the fire (the game draws them; leave room).

## Rendering qualities to match (the "quality bar")
- Painterly pixel art: rich materials with 5–7 tone ramps per material, hue-shifted shadows (cool
  blue-violet) and lights (warm, or moon-cyan on top edges).
- Real texture: bark furrows and knots, moss clumps, canvas weave and seams, wood grain on poles,
  rope twists, stone chips and cracks, leaf clumps built from many small leaf shapes (no blobs).
- 1 px dark outlines on silhouettes (not pure black: a very dark hue of the material), selective
  inner lines, highlights on the edges facing the light.
- Two light sources: cool moonlight from above-right and warm firelight from the fire's position.
  World sprites for the battle maps are daytime, so there they keep the existing upper-left light;
  the camp scene is lit by moon and fire.
- Generous detail at small scale, but readable silhouettes. Nothing looks like a flat vector
  shape or a smooth gradient blob.
- Scale: 1 m = 57 px, the same as the existing world sprites and characters (a ninja is about 110 px
  tall at 1x). The camp scene panel shows about 12.6 m × 5.3 m of world (720×300 px at 1x); it
  may be drawn bigger (say 960×400) if the composition needs it.

## The camp UI around the scene (for the UI agent)
- Dark navy panels with thin gold/bronze borders and small ornate corner pieces (like lacquered
  boxes with brass corners).
- The "what happened" log (Lo que pasó) is on a parchment panel: warm cream paper with darker edges
  and dark ink text.
- The night-danger number is a circular ornate gauge: a bronze ring, a blue arc for the
  percentage, and a big number in the middle, with a small scroll/banner label "PELIGRO NOCTURNO".
- The "Go to dinner" (Ir a cenar) button sits on a parchment strip with a flame icon.
- Activity cards: dark panels with gold hairline borders and slightly brighter titles.
- The party cards on the right: gold border on the selected one, small portrait, bars as now.
