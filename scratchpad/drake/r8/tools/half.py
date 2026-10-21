import sys
from PIL import Image
im = Image.open(sys.argv[1]); w = im.width // 8
cols = 4
out = Image.new('RGB', (w * cols // 2, im.height * 2 // 2))
for i in range(8):
    t = im.crop((i * w, 0, (i + 1) * w, im.height)).resize((w // 2, im.height // 2))
    out.paste(t, ((i % cols) * (w // 2), (i // cols) * (im.height // 2)))
out.save(sys.argv[2])
