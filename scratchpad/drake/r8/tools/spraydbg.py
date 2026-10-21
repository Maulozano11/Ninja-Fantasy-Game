# exec'd in drake(): spray coverage numbers around a canvas box for the key-5 dust (frame 5)
fx_ = np.zeros((CH, CW), np.float32); fy_ = fx_
c5 = crop5
As, _ = shrink(c5, spray_a, (WAX, WAY), S, size, oanchor)
Asb, Cs = shrink(c5, sbright.astype(np.float32), (WAX, WAY), S, size, oanchor)
Asp, _ = shrink(c5, spray.astype(np.float32), (WAX, WAY), S, size, oanchor)
x0, y0, x1, y1 = [int(v) for v in os.environ['BOX'].split(',')]
np.set_printoptions(linewidth=250)
print('As (stroke fraction)'); print((As[y0:y1, x0:x1] * 100).astype(int))
print('Asb (bright stroke cov)'); print((Asb[y0:y1, x0:x1] * 100).astype(int))
print('Asp (spray mask cov)'); print((Asp[y0:y1, x0:x1] * 100).astype(int))
fr = key_frame(5)[0]
print('alpha'); print(fr[y0:y1, x0:x1, 3])
