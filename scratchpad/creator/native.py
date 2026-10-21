import numpy as np, sys
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
H, W, _ = a.shape
px, py, phx, phy = 4.3699, 4.4197, 2.75, 0.69
nx = int((W - phx) / px); ny = int((H - phy) / py)
xs = [int(np.floor(phx + k*px)) for k in range(nx+1)]
ys = [int(np.floor(phy + k*py)) for k in range(ny+1)]
out = np.zeros((ny, nx, 3))
for j in range(ny):
    y0, y1 = ys[j], ys[j+1]
    for i in range(nx):
        x0, x1 = xs[i], xs[i+1]
        c = a[y0+1:y1-1, x0+1:x1-1].reshape(-1, 3)
        out[j, i] = np.median(c, axis=0)
img = Image.fromarray(np.clip(np.round(out), 0, 255).astype(np.uint8))
img.save(sys.argv[2]); print(img.size, 'origin', phx, phy)
img.resize((nx*4, ny*4), Image.NEAREST).save(sys.argv[2].replace('.png', '@4.png'))
