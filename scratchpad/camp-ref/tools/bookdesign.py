# Book template designer: renders a char-grid template with the game's ramps, next to the owner's book (resampled).
import sys
from PIL import Image, ImageDraw

PAL = {
    # frame leather '#7f5a3c'
    'o': '#2b1411', 'k': '#361c15', 'm': '#5c3927', 'c': '#7f5a3c', 'C': '#a07c53', 'B': '#b39f83',
    # board leather '#5a3020'
    'd': '#431513', 'e': '#4f2219', 'f': '#5a3020', 'F': '#875235',
    # pages '#ece2c6'
    'r': '#cf8d4a', 'q': '#dcbd8a', 'p': '#ece2c6', 'P': '#f1edda', 'W': '#f7f6ee',
    # skin (approx) for the hand mock
    's': '#c98e6e', 'b': '#e8b48f', 'l': '#f5cfae', 'D': '#a8664e', 'O': '#3a1a14',
}


def render(rows, scale=14):
    w = max(len(r) for r in rows)
    h = len(rows)
    im = Image.new('RGB', (w * scale, h * scale), (38, 43, 57))
    d = ImageDraw.Draw(im)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in PAL:
                d.rectangle([x * scale, y * scale, x * scale + scale - 1, y * scale + scale - 1], fill=PAL[ch])
    for x in range(w + 1):
        d.line([(x * scale, 0), (x * scale, h * scale)], fill=(60, 60, 70))
    for y in range(h + 1):
        d.line([(0, y * scale), (w * scale, y * scale)], fill=(60, 60, 70))
    return im


if __name__ == '__main__':
    rows = [l.rstrip('\n') for l in open(sys.argv[1]) if not l.startswith('#')]
    rows = [r for r in rows if r]
    out = sys.argv[2]
    a = render(rows)
    ref = Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/fine-antes-leer1.png').convert('RGB')
    # book region in fine coords x 114..144, y 156..182 (fine-antes-leer1 origin 72,128)
    r = ref.crop((114 - 72, 156 - 128, 144 - 72, 182 - 128))
    r = r.resize((r.width * 14, r.height * 14), Image.NEAREST)
    W = a.width + r.width + 20
    im = Image.new('RGB', (W, max(a.height, r.height)), (0, 0, 0))
    im.paste(a, (0, 0))
    im.paste(r, (a.width + 20, 0))
    im.save(out)
    print(out, im.size)
