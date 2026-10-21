import sys
p = sys.argv[1]
s = open(p).read()


def rep(old, new):
    global s
    assert s.count(old) == 1, old
    s = s.replace(old, new)


rep("  Void: ['..EEE..', '.E...E.', 'E..E..E', 'E.EEE.E', 'E..E..E', '.E...E.', '..EEE..'],\n};",
    "  Void: ['..EEE..', '.E...E.', 'E..E..E', 'E.EEE.E', 'E..E..E', '.E...E.', '..EEE..'],\n"
    "  Earth: ['.......', '..E....', '.EeE.E.', '.EeEEeE', 'EeeeEeE', 'EeeeeeE', 'EEEEEEE'],\n};")

rep("""/** Grimoire I: the orb of the chakra's nature gathered before the pointing finger. */""",
    """/** Earth: a hovering boulder, angular and lit from the upper left, chakra glowing in a crack across it, grit circling it. */
function earthOrb(g: DrawCtx, hex: string): void {
  const { tip, dir } = fingertip(g);
  const put = fxPainter(g, hex);
  const m = fxMats(g, hex);
  const rock = g.m(mixHex(hex, '#2e2418', 0.45), 'cloth');
  const f = g.rig.frame % 2;
  const R = 6;
  const cx = fine(tip.x + dir.x * 3.6) + 0.5;
  const cy = fine(tip.y + dir.y * 3.6) + 0.5;
  // the corners' reach: straight-ish faces between them make it a rock, not a ball
  const corners = [1, 0.78, 0.96, 0.8, 1.04, 0.84, 0.92];
  sphere(cx, cy, R * 1.05, (x, y, d, nx, ny) => {
    const u = ((Math.atan2(ny, nx) / (Math.PI * 2) + 1) % 1) * corners.length;
    const i = Math.floor(u);
    const fr = u - i;
    const reach = (corners[i] * (1 - fr) + corners[(i + 1) % corners.length] * fr) * (1 - 0.1 * Math.sin(Math.PI * fr));
    if (Math.hypot(nx, ny) > reach) return;
    put(x, y, d > 0.6 ? 4 : d > 0.2 ? 3 : d > -0.25 ? 2 : 1, rock);
  });
  // the crack, glowing brighter on the beat
  const ox = Math.floor(cx);
  const oy = Math.floor(cy);
  for (const [dx, dy] of [[-4, -1], [-3, 0], [-2, 0], [-1, 1], [0, 1], [1, 0], [2, 0], [3, -1], [0, 2], [1, 3]])
    put(ox + dx, oy + dy, f ? 5 : 4, f ? m.hot : m.glow);
  // grit circling it
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + f * 0.6;
    const x = Math.round(cx + Math.cos(a) * (R + 3));
    const y = Math.round(cy + Math.sin(a) * (R + 2) * 0.65);
    put(x, y, 3, rock);
    if (k % 2 === 0) put(x + 1, y, 2, rock);
  }
}

/** Grimoire I: the orb of the chakra's nature gathered before the pointing finger. */""")

rep("""    Void: voidOrb,
  };""", """    Void: voidOrb,
    Earth: earthOrb,
  };""")


rep("""      { pts: [[13, 10.2], [12.6, 13], [12.8, 16]], w: [2.2, 0.8] },
    ],
    dots: [],
  },
};""", """      { pts: [[13, 10.2], [12.6, 13], [12.8, 16]], w: [2.2, 0.8] },
    ],
    dots: [],
  },
  Earth: {
    strokes: [
      { pts: [[27.2, 2.4], [27.3, 7], [27.4, 11]], w: [1.4, 2] },
      { pts: [[24.6, 8.6], [24.4, 11.4], [23, 13.6], [20.4, 15]], w: [2.2, 0.8] },
      { pts: arcPts(16.6, 9.6, 2.6, 1.5, 0, 360), w: [1.4, 1.4] },
      { pts: arcPts(10.6, 10.8, 3.4, 3.6, 0, 180), w: [2.4, 1] },
    ],
    dots: [[16.6, 6]],
  },
};""")
open(p, 'w').write(s)
print('ok')
