"""Read a GIF back from disk and save (1) a full-size copy of chosen frames and (2) a contact strip
of all frames (downscaled by an integer factor, nearest) with frame index and delay."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/06-09-tierra-genjutsu-chakra-veneno')
from lib import *


def read(path):
    g = Image.open(path)
    out = []
    for i in range(g.n_frames):
        g.seek(i)
        out.append((g.convert('RGB'), g.info.get('duration'), getattr(g, 'disposal_method', None)))
    return out


def contact(path, dst, cols, kdown=2, pick=None):
    fr = read(path)
    idx = pick if pick is not None else list(range(len(fr)))
    w, h = fr[0][0].size
    w2, h2 = w // kdown, h // kdown
    rows = (len(idx) + cols - 1) // cols
    cs = Image.new('RGB', (cols * (w2 + 6) + 6, rows * (h2 + 22) + 6), (70, 20, 70))
    d = ImageDraw.Draw(cs)
    t = 0
    starts = []
    for i, (f, du, dp) in enumerate(fr):
        starts.append(t)
        t += du
    for j, i in enumerate(idx):
        f, du, dp = fr[i]
        x = 6 + (j % cols) * (w2 + 6)
        y = 6 + (j // cols) * (h2 + 22)
        cs.paste(f.resize((w2, h2), Image.NEAREST), (x, y))
        d.text((x + 2, y + h2 + 3), f'#{i} t={starts[i]} d={du} disp={dp}', font=font(12), fill=(255, 255, 255))
    cs.save(dst)
    return len(fr), t


if __name__ == '__main__':
    p, dst, cols, k = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    pick = [int(v) for v in sys.argv[5].split(',')] if len(sys.argv) > 5 else None
    print(contact(p, dst, cols, k, pick))
