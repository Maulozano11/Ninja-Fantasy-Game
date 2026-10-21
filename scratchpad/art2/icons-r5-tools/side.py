# side.py work_dir icon_id N Z x0 y0 x1 y1 out : his (box at N) | ours, crop, at xZ
import sys
from PIL import Image
w, iid, N, Z = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
x0, y0, x1, y1 = [int(v) for v in sys.argv[5:9]]
out = sys.argv[9]
h = Image.open(f'{w}/out/ref/{iid}.png').convert('RGB'); h = h.crop((1, 1, h.size[0]-1, h.size[1]-1))
hl = h.resize((N, N), Image.LANCZOS)
a = Image.open(f'{w}/out/{iid}.png' if N == 44 else f'{w}/out/{iid}@2x.png').convert('RGB')
def c(im): return im.crop((x0, y0, x1, y1)).resize(((x1-x0)*Z, (y1-y0)*Z), Image.NEAREST)
A, B = c(hl), c(a)
s = Image.new('RGB', (A.size[0]*2 + 16, A.size[1]), (17, 18, 24)); s.paste(A, (0, 0)); s.paste(B, (A.size[0] + 16, 0)); s.save(out)
