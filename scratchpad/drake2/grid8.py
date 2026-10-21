import sys
from PIL import Image
im = Image.open(sys.argv[1]); n = 8; W = im.width // n // 3; H = im.height // 3
small = im.resize((im.width // 3, H), Image.NEAREST)
k = int(sys.argv[3]) if len(sys.argv) > 3 else 2
out = Image.new('RGB', (W * 4 * k + 12, H * 2 * k + 4), 'black')
for i in range(8):
    t = small.crop((i * W, 0, (i + 1) * W, H)).resize((W * k, H * k), Image.NEAREST)
    out.paste(t, ((i % 4) * (W * k + 4), (i // 4) * (H * k + 4)))
out.save(sys.argv[2])
