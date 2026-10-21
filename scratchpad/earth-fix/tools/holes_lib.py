"""holes.py <groupdir> [sprite]: per frame, pinholes and enclosed clear px, split by what surrounds them (opaque rock vs dust)."""
import json, sys, os
import numpy as np
from PIL import Image
from collections import deque
def enclosed(a):
    H, W = a.shape
    clear = a == 0
    seen = np.zeros_like(clear)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if clear[y, x] and not seen[y, x]: seen[y, x] = 1; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if clear[y, x] and not seen[y, x]: seen[y, x] = 1; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            v, u = y + dy, x + dx
            if 0 <= v < H and 0 <= u < W and clear[v, u] and not seen[v, u]:
                seen[v, u] = 1; q.append((v, u))
    return clear & ~seen
