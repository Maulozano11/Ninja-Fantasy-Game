    # His clod on the tip of his tallest back spike is not part of the burst: it rides the spike while the dirt
    # flies (frames 4 and 5), then is kicked off up and back and fades.
    clod = dust & poly_mask(LOOSE[0], (CH, CW), off5)
    dust &= ~clod
    # The pile is his mound: the biggest piece of the dust once an opening has taken off its thin splash
    # fingers. Everything else (the fingers, the streaks and the loose specks) is his spray.
    mound = dilate(erode(dust, PILE_R), PILE_R) & dust
    comps = sorted(components(mound), key=len, reverse=True)
    pile = np.zeros((CH, CW), bool)
    pts = np.array(comps[0])
    pile[pts[:, 0], pts[:, 1]] = True
    pile = dilate(pile, 2) & dust
    spray = dust & ~pile
    # His spray is thin, bright orange strokes with no dark edge. Only his bright streak pixels count (strongly
    # orange: red over blue by more than 70); the dark rim around each stroke is where the JPEG blended it
    # into his dark panel, and kept as solid soil browns it made every streak read as a muddy outline.
    r5c, b5c = crop5[..., 0], crop5[..., 2]
    sbright = spray & (r5c - b5c > 70)
    print('dust: pile px', int(pile.sum()), 'spray px', int(spray.sum()), 'bright spray px', int(sbright.sum()),
          'clod px', int(clod.sum()))
    core = dilate(erode(pile, 3), 3)
    # Colour from his solid dust pixels (the edge pixels he shares with the dark panel would darken it).
    wcol = np.clip((diff5 - 30.0) / 50.0, 0.05, 1.0) * pile
    sat = pile & (diff5 > 70)
    DUST = median_palette(crop5[sat], 10)
    # His streak oranges, from the cores of his strokes (their mid orange and the lighter tone along the middle).
    SPRAY = median_palette(crop5[sbright & (diff5 > 120)], 3)
    print('dust palette', DUST.astype(int).tolist(), 'spray palette', SPRAY.astype(int).tolist(),
          'his spray mean', np.round(crop5[sbright].mean(0)).astype(int).tolist())
    pile_f, core_f, spray_f, clod_f = (m.astype(np.float32) for m in (pile, core, sbright, clod))
    # His aux layers, carried through every warp with the colour: horn (ch 3) and far eye (ch 4).
    crop6 = {}
    for k in (0, 5):
        crop = keys[k][0]
        fe = (EYEW[k] & limes(crop) & keys[k][1]).astype(np.float32)
        crop6[k] = np.concatenate([crop, HORNW[k].astype(np.float32)[..., None], fe[..., None],
                                   np.zeros((CH, CW, 1), np.float32)], -1)
    # His lowest claw in his prowl (the feet line), in working-canvas rows; both keys share the canvas rows.
    FEET_ROW = int(np.nonzero(keys[0][1].any(1))[0].max())

    def eye_at(k, pitch=0.0, bob=0.0, tx=0.0):
        """Where his near eye lands on our canvas for a frame from key k pitched, bobbed and moved (exact)."""
        ex, ey = to_work(k, EYE[k])
        px, py = to_work(k, PITCH[k])
        a = np.deg2rad(pitch)
        dx_, dy_ = ex - px, ey - py
        wx = px + dx_ * np.cos(a) - dy_ * np.sin(a) + tx / S
        wy = py + dx_ * np.sin(a) + dy_ * np.cos(a) + bob / S
        return oanchor[0] + (wx - WAX) * S, oanchor[1] + (wy - WAY) * S

    EYE0 = eye_at(0)

    def pose(k, pitch=0.0, eye=0.0, legs=None, dust_at=None, scale=1.0, head=1.0, feet=False, clod_at=None):
        """Frame from key k: pieces turned by legs[name] degrees and the head scaled by `head` about the eye; the
        whole body scaled by `scale` about the eye, pitched, and carried so that the eye sits at frame 0's x and
        `eye` game px below frame 0's eye (or, with `feet`, so that the lowest claw stands on the feet line).

        dust_at = (x scale, y scale, dx in game px, alpha) about DUST_ORIGIN (on the ground), or None.
        clod_at = (dx, dy in game px, alpha): his clod on the spike tip, moved off it, or None.
        Returns the frame and its (bob, tx) in game px."""
        crop = crop6[k]
        masks, base = split[k]
        legs = dict(legs or {})
        if head != 1.0:
            legs['head'] = 0.0
        far, near = [], []
        fields = {}
        for n, pc in PIECES[k].items():
            m = masks[n].astype(np.float32)
            sc = head if n == 'head' else 1.0
            if legs.get(n, 0.0) or sc != 1.0:
                dx, dy, t = bend_field(k, pc, legs.get(n, 0.0), sc)
                fields[n] = (dx, dy)
                lay = (warp(crop * m[..., None], dx, dy), warp(m, dx, dy), warp(m, dx, dy) * t)
            else:
                lay = (crop * m[..., None], m, np.zeros_like(m))
            (far if pc.get('far') else near).append(lay)
        b = base.astype(np.float32)
        layers = far + [(crop * b[..., None], b, np.zeros_like(b))] + near
        if fields:
            # The joints. A turned piece must not open a see-through gap, or a flat patch, where it leaves the
            # body along its sides. Under everything goes the whole body bent by one smooth field: each piece's
            # own turn, blended into the body's stillness over about SOFT px across the piece's edges. So
            # whatever a turned piece uncovers shows his own pixels there, stretched a little, as a joint does.
            # It is kept to the joints: where a turned piece lay next to the body (within JOINT px of it).
            # Elsewhere it would leave a half-turned ghost of the piece's edges where the piece moved away.
            bk = keys[k][1].astype(np.float32)
            gb = np.maximum(soften(bk, SOFT), 1e-3)
            DX = np.zeros((CH, CW), np.float32)
            DY = np.zeros((CH, CW), np.float32)
            joint = np.zeros((CH, CW), bool)
            near_base = dilate(base, JOINT)
            for n, (dx, dy) in fields.items():
                w = np.clip(soften(masks[n], SOFT) / gb, 0.0, 1.0)
                DX += w * dx
                DY += w * dy
                joint |= masks[n] & near_base
            ja = (bk * joint).astype(np.float32)
            layers = [(warp(crop * ja[..., None], DX, DY), warp(ja, DX, DY), np.zeros((CH, CW), np.float32))] + layers
        prem = np.zeros((CH, CW, crop.shape[2]), np.float32)
        cov = np.zeros((CH, CW), np.float32)
        free = np.zeros((CH, CW), np.float32)  # near pieces away from their joint (they get an edge line)
        for pr, a, w in layers:
            prem = pr + prem * (1 - a[..., None])
            cov = a + cov * (1 - a)
            free = w + free * (1 - a)
        moved = bool(legs) or pitch != 0.0 or scale != 1.0 or feet or eye != 0.0
        bob, tx = 0.0, 0.0
        if moved:
            # Carried so the eye keeps frame 0's x; held up by the feet or by the eye's arc.
            tx = EYE0[0] - eye_at(k, pitch)[0]
            if feet:
                c0 = warp(cov, *rigid(k, pitch, 0.0, scale, tx))
                low = int(np.nonzero((c0 > 0.5).sum(1) >= 2)[0].max())
                bob = (FEET_ROW - low) * S
            else:
                bob = EYE0[1] + eye - eye_at(k, pitch)[1]
            RG = rigid(k, pitch, bob, scale, tx)
            prem, cov, free = warp(prem, *RG), warp(cov, *RG), warp(free, *RG)
        rgb6 = prem / np.maximum(cov, 1e-4)[..., None]
        rgb = rgb6[..., :3]
        A, C = shrink(rgb, cov, (WAX, WAY), S, size, oanchor)
        Af, _ = shrink(rgb, free, (WAX, WAY), S, size, oanchor)
        _, AUX = shrink(rgb6[..., 3:6], cov, (WAX, WAY), S, size, oanchor)
        out = np.zeros((OH, OW, 4), np.uint8)

        def levels_of(a_px):
            return np.where(a_px > 0.8, 255, np.where(a_px > 0.47, 160, np.where(a_px > 0.2, 95, 0)))

        if dust_at is not None:
            sx_, sy_, ddx, alpha = dust_at
            # (The dust lives on the ground: it does not follow the body's pitch and bob. Every key's working
            # canvas has its placement point at (WAX, WAY), so key 5's dust lands on any frame as it is.)
            gox, goy = to_work(5, DUST_ORIGIN)
            qx = gox + (xx - gox - ddx / S) / sx_
            qy = goy + (yy - goy) / sy_
            fx_, fy_ = xx - qx, yy - qy
            c5 = warp(crop5, fx_, fy_)
            # His pile: solid in his colours; only where it is thinner than a game pixel is it partly clear.
            Ad, _ = shrink(crop5, warp(pile_f, fx_, fy_), (WAX, WAY), S, size, oanchor)
            _, Cd = shrink(c5, warp(wcol.astype(np.float32), fx_, fy_), (WAX, WAY), S, size, oanchor)
            Ac, _ = shrink(crop5, warp(core_f, fx_, fy_), (WAX, WAY), S, size, oanchor)
            solid_px = Ad >= 0.5
            thin_px = (Ad >= 0.22) & ~solid_px & (Ac < 0.1)
            lv = levels_of(np.where(solid_px, 1.0, 0.6) * alpha)
            g = (solid_px | thin_px) & (lv > 0)
            # (The faintest level takes every other dust colour: the palette has to fit the alphabet.)
            out[g, :3] = np.where((lv == 95)[..., None], snap(Cd, DUST[::2]), snap(Cd, DUST))[g]
            out[g, 3] = lv[g].astype(np.uint8)
            # His spray: a game pixel his bright strokes cover at least half of is solid streak orange; one they
            # cover a quarter of is the same orange, partly clear; less, and it is clear.
            As, Cs = shrink(c5, warp(spray_f, fx_, fy_), (WAX, WAY), S, size, oanchor)
            s_solid = As >= 0.5
            s_thin = (As >= 0.25) & ~s_solid
            lv = levels_of(np.where(s_solid, 1.0, 0.63) * alpha)
            g = (s_solid | s_thin) & (lv > 0) & ~(solid_px & (out[..., 3] == 255))
            g &= lv >= out[..., 3]
            out[g, :3] = snap(Cs, SPRAY)[g]
            out[g, 3] = lv[g].astype(np.uint8)
        op = A >= 0.5
        if moved:
            # Slivers left at a joint where a piece turned away.
            for pts in components(op):
                if len(pts) < 6:
                    op[tuple(np.array(pts).T)] = False
        # Gaps closed inside the drake: a see-through hole the body surrounds is his dark under-body shadow,
        # not the battlefield. That is every small one (his narrowest gaps between plates, where his panel
        # peeks through) and every one a turned leg or tail uncovered (it was body in his picture).
        if moved:
            kb = keys[k][1].astype(np.float32)
            kb = warp(kb, *RG)
            Ab, _ = shrink(rgb, kb, (WAX, WAY), S, size, oanchor)
        else:
            Ab = A
        gap = np.zeros_like(op)
        for pts in components4(~op):
            p = np.array(pts)
            if p[:, 0].min() == 0 or p[:, 1].min() == 0 or p[:, 0].max() == OH - 1 or p[:, 1].max() == OW - 1:
                continue
            if len(p) <= GAP_PX or (Ab[p[:, 0], p[:, 1]] >= 0.5).mean() >= 0.5:
                gap[p[:, 0], p[:, 1]] = True
                GAPS.append(len(p))
        op |= gap
        op, edge = outline_clean(op)
        out[op, :3] = snap(C, PAL)[op]
        # His horns snap only to his horn greys (cooler than the stone; his seams stay dark, and his near-white
        # highlight comes only where his own horn is that light).
        hn = op & (AUX[..., 0] >= 0.5)
        out[hn, :3] = snap(C, PAL_HORN)[hn]
        # His glowing eyes and glints are smaller than the averaging footprint: where they cover a good
        # part of a pixel, the pixel takes their colour (so they keep glowing instead of turning muddy),
        # and where only his orange-amber surround of the eye does, it takes his amber. (His far eye is not
        # one of them: it is his lemon oval, below.)
        fe_full = rgb6[..., 4] > 0.5
        hot = (rgb[..., 0] > 200) & (rgb[..., 1] > 140) & (rgb[..., 2] < 120) & (cov > 0.5) & ~fe_full
        amber = (rgb[..., 0] > 150) & (rgb[..., 0] - rgb[..., 1] > 40) & (rgb[..., 1] > 80) & (rgb[..., 2] < 100) & (cov > 0.5) & ~fe_full
        Ah, Ch = shrink(rgb, hot.astype(np.float32), (WAX, WAY), S, size, oanchor)
        Aa, _ = shrink(rgb, (hot | amber).astype(np.float32), (WAX, WAY), S, size, oanchor)
        hm = (Ah > 0.25) & op
        am = (Aa > 0.25) & ~hm & op & dilate(hm, 1)
        # His far eye: where his lemon oval covers a quarter of a pixel, the pixel is his lemon. No ring.
        lm = (AUX[..., 1] * A > 0.25) & ~hm & ~am & op
        # Next to a glowing eye nothing is moss: the mixed yellow-grey there snapped to the moss greens and
        # gave the eyes a green rim he did not draw.
        rim = dilate(hm | lm, 1) & op & ~hm & ~am & ~lm & ~hn
        out[rim, :3] = snap(C, PAL_NO_MOSS)[rim]
        out[hm, :3] = snap(Ch, PAL)[hm]
        out[am, :3] = EYE_AMBER
        out[lm, :3] = EYE_LEMON
        out[op, 3] = 255
        out[gap & ~edge, :3] = SHADOW
        out[edge, :3] = OUTLINE
        out[edge, 3] = 255
        # A moved piece keeps its own edge where it lies over the body (away from its joint).
        fm = (Af >= 0.5) & op
        fe = np.zeros_like(fm)
        for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            fe |= fm & op & ~np.roll(np.roll(Af >= 0.25, oy, 0), ox, 1)
        out[fe, :3] = OUTLINE
        if clod_at is not None:
            # His clod rides the spike tip with the body (it is key 5's), then flies off it.
            cdx, cdy, calpha = clod_at
            cf, cc = clod_f, crop5
            if moved:
                cf, cc = warp(cf, *RG), warp(cc, *RG)
            if cdx or cdy:
                cf, cc = warp(cf, cdx / S, cdy / S), warp(cc, cdx / S, cdy / S)
            Acl, Ccl = shrink(cc, cf, (WAX, WAY), S, size, oanchor)
            g = Acl >= 0.5
            lv = levels_of(np.full((OH, OW), calpha, np.float32))
            g &= lv > 0
            out[g, :3] = snap(Ccl, DUST)[g]
            out[g, 3] = lv[g].astype(np.uint8)
        return out, bob, tx

    def key_frame(k):
        return pose(k, dust_at=(1.0, 1.0, 0.0, 1.0), clod_at=(0.0, 0.0, 1.0)) if k == 5 else pose(k)

    # The run, a bounding charge. 0: his prowl, gathered on the ground. 1-2: the hind legs push off (the claws
    # stay on the feet line), the front legs lift and tuck, the tail drops and the front of the body rises.
    # 3-4: his lunge, springing off the ground, his dust bursting behind the hind feet; 5: his lunge at the top
    # of the leap. 6: the body comes down nose first, the front legs reaching, the dust drifting back. 7: about
    # to land, nose down and tail up, the dust settling (it spreads out low) and fading. Then his prowl, landed.
    # His prowl is drawn about 12% larger than his lunge, and its head about 18% larger: the in-betweens
    # scale the body (and the head a little more) so the size changes over the loop instead of at the two cuts
    # between his drawings (2->3 and 7->0). The eye keeps one x.
    # Leg angles in degrees (+ turns a hanging limb's foot backward, and lifts the tail); pitch in degrees about
    # the shoulders (+ is nose down); eye: the eye's height in game px below frame 0's (+ is down).
    FLY = [
        None,
        dict(k=0, pitch=-3.0, feet=True, scale=0.96, head=0.975,
             legs={'nf': 8, 'ff': -4, 'nh': 8, 'fh': 6, 'tail': -12}),
        dict(k=0, pitch=-6.0, feet=True, scale=0.92, head=0.95,
             legs={'nf': 16, 'ff': -8, 'nh': 16, 'fh': 12, 'tail': -25}),
        dict(k=5, pitch=5.0, eye=-14.0, scale=1.06, head=1.0,
             legs={'nf': -2, 'ff': 2, 'nh': -12, 'fh': -10, 'tail': 10}, dust_at=(0.7, 0.7, 2.0, 1.0)),
        dict(k=5, pitch=2.5, eye=-18.5, scale=1.03, head=1.0,
             legs={'nf': -1, 'ff': 1, 'nh': -6, 'fh': -5, 'tail': 5}, dust_at=(0.88, 0.88, 1.0, 1.0),
             clod_at=(0.0, 0.0, 1.0)),
        None,
        dict(k=5, pitch=6.0, eye=-12.5, scale=1.04, head=1.02,
             legs={'nf': -12, 'ff': -10, 'nh': -16, 'fh': -12, 'tail': 10}, dust_at=(1.04, 0.9, -5.0, 0.75),
             clod_at=(-3.5, -3.5, 0.63)),
        dict(k=5, pitch=9.0, eye=-3.0, scale=1.08, head=1.04,
             legs={'nf': -16, 'ff': -14, 'nh': -22, 'fh': -18, 'tail': 20}, dust_at=(1.08, 0.6, -10.0, 0.4)),
    ]
    GAPS.clear()
    frames = {'fly': []}
    moves = []
    for i, f in enumerate(FLY):
        if f is None:
            fr, bob, tx = key_frame(i)
        else:
            fr, bob, tx = pose(f['k'], f['pitch'], f.get('eye', 0.0), f['legs'], f.get('dust_at'), f.get('scale', 1.0),
                               f.get('head', 1.0), f.get('feet', False), f.get('clod_at'))
        frames['fly'].append(fr)
        moves.append((bob, tx))
        print(f'  frame {i}: bob {bob:+.1f} tx {tx:+.1f} (game px); closed gaps (px)', GAPS[:])
        GAPS.clear()
    f0 = frames['fly'][0]
    feet = int(np.nonzero((f0[..., 3] == 255).any(1))[0].max())
    print('drake: feet line (lowest claw of frame 0) at y', feet, 'of', OH, '; anchor', oanchor)
    eyes = []
    for i, f in enumerate(frames['fly']):
        src = FLY[i] or {'k': i}
        ex, ey = eye_at(src['k'], src.get('pitch', 0.0), moves[i][0], moves[i][1])
        eyes.append((ex, ey))
        a = f[..., 3]
        ys_, xs_ = np.nonzero(a > 0)
        solid_rows = np.nonzero((a == 255).any(1))[0]
        print(f'  frame {i}: eye ({ex:.1f}, {ey:.1f}); lowest solid y {solid_rows.max()}, lowest any y {ys_.max()};'
              f' clear margin L{xs_.min()} T{ys_.min()} R{OW - 1 - xs_.max()} B{OH - 1 - ys_.max()}')
    print('  eye steps', ', '.join(f'{i}->{(i + 1) % 8} {eyes[(i + 1) % 8][1] - eyes[i][1]:+.1f}' for i in range(8)))
