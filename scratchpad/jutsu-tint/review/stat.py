import sys, colorsys
from PIL import Image
def st(f):
  im=Image.open(f).convert('RGBA'); px=[p for p in im.getdata() if p[3]>=200]
  L=[0.299*p[0]+0.587*p[1]+0.114*p[2] for p in px]
  S=[colorsys.rgb_to_hls(*[t/255 for t in p[:3]])[2] for p in px]
  L.sort(); S.sort(); n=len(L)
  q=lambda a,f: round(a[int(f*(n-1))])
  return f"n={n} luma p5/50/95={q(L,.05)}/{q(L,.5)}/{q(L,.95)} sat med={S[n//2]:.2f} ncol={len(set(px))}"
for f in sys.argv[1:]: print(f, st(f))
