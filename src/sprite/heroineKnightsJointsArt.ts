// The owner's heroine knights' joints, his pixels at our scale (tools/refs/hk-joints-from-ref.py from
// docs/reference/heroine-knights-owner-reference.jpg, shrunk and cleaned by tools/refs/heroine_knights_ref.py).
// Generated: rerun the script to change it.

/** His joints at rest in our female idle frame 0 (fine pixels): where she turns as he drew her. */
export const HK_HIS: Record<string, [number, number]> = {
  neck: [127.260, 146.010],
  shoulderN: [112.010, 152.010],
  elbowN: [107.010, 164.760],
  wristN: [105.760, 173.260],
  handN: [105.010, 177.010],
  shoulderF: [135.010, 151.010],
  elbowF: [137.010, 165.260],
  wristF: [139.010, 174.010],
  handF: [139.760, 179.260],
  pelvis: [126.760, 175.010],
  hipN: [120.010, 177.010],
  hipF: [133.010, 176.010],
  kneeN: [116.010, 194.010],
  kneeF: [136.010, 194.010],
  ankleN: [112.010, 212.677],
  ankleF: [132.010, 212.677],
};

/** Her face anchor in our frame: her near eye's lash row and first column. */
export const HK_FACE_ANCHOR: [number, number] = [122, 139];

/** Where her eyes start from the face anchor's column: the near eye, the far eye. */
export const HK_EYE_COLS: [number, number] = [0, 6];
