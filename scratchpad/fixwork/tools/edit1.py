import os
os.chdir('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix')
p = 'src/sprite/rig.ts'
t = open(p).read()
start = t.index('/**\n * Throw, 4 frames:')
end = t.index('/**\n * Pierce, 5 frames:')
new = '''/**
 * Throw, 5 frames: a short wind-up (coiled low with the weapon drawn back at the hip, then the
 * weapon raised behind the head while the free hand points at the target), THE THROW (the arm
 * whips forward and flings the weapon level at the target, the body pitching after it), THE
 * RELEASE, where the phase starts, and a follow-through into the leap. The release is the owner's
 * reference (docs/reference/poses/warp-throw-owner-reference.jpg, a figure of blue light leaping
 * as it throws), its angles measured on his picture: the body pitched forward 32 degrees (pelvis to
 * neck), the head hung ahead of the chest and below the shoulders (31 degrees below level from the
 * neck; his 33); the throwing arm flung up and back behind the head, the hand open (upper arm 50
 * degrees above level, forearm 30); the front knee driven forward (thigh 31 degrees below level)
 * with its shin folded back under the body; the back leg stretched out behind, pushing off. His
 * free arm is swept back on the far side of his back, which our three-quarter front view puts
 * behind the torso: it is swept back and down out of sight there (a hand showing behind the back
 * would sit under the throwing elbow, like a second hand on that arm). From the release on the
 * weapon is out of the hand (PoseFrame.released): the battle draws it in flight from where the
 * throw flung it (throwRelease() in grip.ts). Bare hands throw a kunai from the pouch (grip.ts
 * throwsKunai).
 */
const THROW: PoseFrame[] = [
  // Coil: crouched over the front foot, the weapon drawn back low behind the hip, the free hand out at the target.
  { lean: 14, pelvisDx: -1, sink: 1.5, footN: v(-0.42, 0.9), footF: v(0.4, 0.9), handN: arm(-0.62, 0.52), handF: arm(0.86, 0.24), shapeN: 'grip', shapeF: 'point' },
  // Cock: rising, the weapon raised behind the head with the elbow back, the free hand pointing the way.
  { lean: 9, footN: v(-0.46, 0.91), footF: v(0.4, 0.88), handN: arm(-0.42, -0.6), bendN: -1, handF: arm(0.96, -0.1), shapeN: 'grip', shapeF: 'point' },
  // Throw: the arm whips forward under the chin and flings the weapon level at the target, the body
  // pitching after it halfway to the release, the free arm swinging back.
  { lean: 21, pelvisDx: 1.5, headDx: 2.5, headDy: 2.5, footN: v(-0.52, 0.87), footF: v(0.25, 0.8), handN: arm(0.84, 0.6), handF: arm(-0.55, 0.5), shapeN: 'grip', shapeF: 'fist' },
  // RELEASE: the owner's reference; the phase starts here.
  { lean: 32, pelvisDx: 2, headDx: 6, headDy: 8, footN: v(-0.56, 0.83), footF: v(0.087, 0.637), handN: arm(-0.73, -0.62), handF: arm(-0.62, 0.55), shapeN: 'open', shapeF: 'open', released: true, streamBack: true },
  // Follow-through: carried on into the leap, both feet leaving the ground.
  { lean: 34, pelvisDx: 2.5, headDx: 6, headDy: 8, lift: 1.5, footN: v(-0.6, 0.78), footF: v(0.1, 0.6), handN: arm(-0.77, -0.6), handF: arm(-0.66, 0.5), shapeN: 'open', shapeF: 'open', released: true, streamBack: true },
];

/**
 * The first 'throw' frame without the weapon in the hand: the owner's reference pose, where the
 * phase starts. The frame before it flings the weapon.
 */
export const THROW_RELEASE_FRAME = THROW.findIndex((f) => f.released);

'''
t = t[:start] + new + t[end:]
a = '''  /**
   * The body is pitched so far forward that a cape cannot hang behind the legs: it streams back
   * from the shoulders behind the back (compose.ts cuts what would show in front of the back).
   */
  streamBack?: boolean;'''
b = '''  /**
   * The body is pitched so far forward that a cape cannot hang straight down from the shoulders:
   * it is hung from the body standing upright and turned forward with it, so it lies along the back
   * and streams out behind (compose.ts drawPitchedCape).
   */
  streamBack?: boolean;'''
assert a in t
t = t.replace(a, b)
open(p, 'w').write(t)

p = 'src/sprite/types.ts'
t = open(p).read()
a = ''' * Weapon techniques: 'throw' hurls the held weapon (it leaves the hand at the release frame, see
 * rig.ts throwRelease; the battle draws it in flight), 'pierce' is a lunging thrust.'''
b = ''' * Weapon techniques: 'throw' hurls the held weapon (it is out of the hand from the release frame on,
 * see grip.ts throwRelease; the battle draws it in flight), 'pierce' is a lunging thrust.'''
assert a in t
open(p, 'w').write(t.replace(a, b))

p = 'src/components/CharacterCreator.tsx'
t = open(p).read()
a = "  pose_throw: { en: 'Throw weapon', es: 'Lanzar arma' },"
assert a in t
open(p, 'w').write(t.replace(a, "  pose_throw: { en: 'Throw weapon', es: 'Arrojar arma' },"))
print('ok')
