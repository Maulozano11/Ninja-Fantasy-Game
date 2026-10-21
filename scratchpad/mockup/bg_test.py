import numpy as np
from PIL import Image
import scene
img, props, info = scene.paint()
base = Image.fromarray(img.clip(0, 255).astype(np.uint8)).convert('RGBA')
for (fn, args) in [(scene.tree, (150, 300, 1.0, 1)), (scene.tree, (40, 250, 0.85, 2, True)), (scene.tree, (840, 262, 0.9, 3)), (scene.bush, (120, 478, 90, 38, 4)),
                   (scene.bush, (230, 492, 70, 32, 5)), (scene.rock, (612, 468, 50, 30, 6)), (scene.rock, (700, 300, 40, 24, 7)), (scene.tall_grass, (330, 505, 60, 8)),
                   (scene.reeds, (395, 470, 6, 9)), (scene.reeds, (560, 300, 5, 10))]:
    im, (ox, oy) = fn(*args)
    base.alpha_composite(Image.fromarray(im), (int(ox), int(oy)))
base.save('bg1.png')
base.resize((1920, 1080), Image.NEAREST).save('bg1_2x.png')
