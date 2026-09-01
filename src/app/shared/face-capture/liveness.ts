/**
 * Passive liveness heuristics computed from face-api.js's 68 landmarks.
 *
 * These raise the bar past "hold up a still photo": the user has to blink or
 * turn their head on demand. They are NOT anti-spoofing — a video replay or a
 * determined attacker defeats them. Real liveness needs a dedicated vendor
 * (AWS Face Liveness, iProov, Unico); this is a demo-grade stand-in and is
 * labelled as such in the UI.
 */

export type Challenge = 'BLINK' | 'TURN_LEFT' | 'TURN_RIGHT';

export interface Point {
  x: number;
  y: number;
}

/** Eyes closed enough to count as a blink. */
const EYE_CLOSED_RATIO = 0.22;
/** How far off-centre the nose must sit, as a fraction of face width. */
const TURN_RATIO = 0.11;

/**
 * Eye aspect ratio: eye height over eye width. Drops sharply when the lid
 * closes, which is what makes a blink detectable from landmarks alone.
 */
export function eyeAspectRatio(eye: Point[]): number {
  if (eye.length < 6) {
    return 1;
  }
  const vertical =
    distance(eye[1], eye[5]) + distance(eye[2], eye[4]);
  const horizontal = distance(eye[0], eye[3]);
  return horizontal === 0 ? 1 : vertical / (2 * horizontal);
}

export function eyesAreClosed(leftEye: Point[], rightEye: Point[]): boolean {
  const average = (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
  return average < EYE_CLOSED_RATIO;
}

/**
 * Where the nose sits between the two eyes, from -1 (turned hard right) through
 * 0 (facing forward) to +1 (turned hard left).
 */
export function headTurn(leftEye: Point[], rightEye: Point[], noseTip: Point): number {
  const leftCentre = centroid(leftEye);
  const rightCentre = centroid(rightEye);
  const eyeSpan = Math.abs(rightCentre.x - leftCentre.x);
  if (eyeSpan === 0) {
    return 0;
  }
  const midpoint = (leftCentre.x + rightCentre.x) / 2;
  return (midpoint - noseTip.x) / eyeSpan;
}

export function satisfiesTurn(turn: number, challenge: 'TURN_LEFT' | 'TURN_RIGHT'): boolean {
  return challenge === 'TURN_LEFT' ? turn > TURN_RATIO : turn < -TURN_RATIO;
}

export function randomChallenge(): Challenge {
  const all: Challenge[] = ['BLINK', 'TURN_LEFT', 'TURN_RIGHT'];
  return all[Math.floor(Math.random() * all.length)];
}

export const CHALLENGE_LABELS: Record<Challenge, string> = {
  BLINK: 'Pisque os olhos',
  TURN_LEFT: 'Vire o rosto para a sua esquerda',
  TURN_RIGHT: 'Vire o rosto para a sua direita',
};

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function centroid(points: Point[]): Point {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}
