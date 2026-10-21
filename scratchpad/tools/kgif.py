# kgif.py <strip.png> <strip.json> <out.gif>  -- the staged play strip as a looping GIF
import sys, json
from PIL import Image
strip, meta, out = sys.argv[1:4]
m = json.load(open(meta))
im = Image.open(strip).convert('RGB')
w, h, ms = m['w'], m['h'], list(m['ms'])
frames = [im.crop((i * w, 0, (i + 1) * w, h)).quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for i in range(len(ms))]
ms[-1] += 600
frames[0].save(out, save_all=True, append_images=frames[1:], duration=ms, loop=0, disposal=1, optimize=False)
print(out, len(frames), 'frames', sum(ms), 'ms')
