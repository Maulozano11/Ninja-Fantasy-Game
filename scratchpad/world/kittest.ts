import { Canvas, ramp, band, cylinderLight, sphereLight, m, preview, WorldSprite, noise } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
const wood = ramp('#8a5a34'), iron = ramp('#5c6170', { shift: 8 });
function barrel(): Canvas {
  const W = m(0.62), H = m(0.9);
  const c = new Canvas(W + 4, H + 4);
  const cx = (W + 4) / 2, top = 2, bot = H + 1;
  for (let y = top; y <= bot; y++) {
    const t = (y - top) / (bot - top);
    const bulge = 1 - 0.13 * Math.pow(2 * t - 1, 2);
    const hw = (W / 2) * bulge;
    for (let x = Math.ceil(cx - hw); x < cx + hw; x++) {
      const u = (x + 0.5 - cx) / hw;
      const hoop = [0.12, 0.3, 0.7, 0.88].some((h) => Math.abs(t - h) < 0.035);
      const stave = Math.abs(((x - cx) / hw * 3.2 + 10) % 1 - 0.5) > 0.46;
      const L = cylinderLight(u) - (stave ? 0.12 : 0) + (noise(x, y * 0.4, 3) - 0.5) * 0.1;
      const r = hoop ? iron : wood;
      c.set(x, y, r[band(L, x, y, { steps: [1, 2, 3, 3, 4] })]);
    }
  }
  c.fillEllipse(cx, top + 2, W / 2 * 0.86, 2.5, (x, y) => wood[(x + y) % 5 === 0 ? 2 : 3]);
  c.outline();
  return c;
}
const s: WorldSprite = { name: 'barrel', label: 'Barrel', meters: [0.62, 0.9], anchor: [Math.round((m(0.62) + 4) / 2), m(0.9) + 1], tags: [], anims: { idle: { frames: [barrel()], fps: 0 } } };
const rock = new Canvas(m(1.2), m(0.8));
const rr = ramp('#7a7c80', { shift: 10 });
rock.fillEllipse(rock.w / 2, rock.h * 0.62, rock.w / 2 - 2, rock.h * 0.6, (x, y) => rr[band(sphereLight((x - rock.w / 2) / (rock.w / 2), (y - rock.h * 0.62) / (rock.h * 0.6)), x, y, { steps: [1, 2, 3, 4, 5] })]);
rock.outline();
preview([s, { name: 'rock', label: 'Rock', meters: [1.2, 0.8], anchor: [rock.w / 2, rock.h - 1], tags: [], anims: { idle: { frames: [rock], fps: 0 } } }], process.argv[2], { scale: 3, maxWidth: 400 });
