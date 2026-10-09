// Motion tokens (Emil Kowalski / Apple fluid-interface values). Use these instead of hand-typed curves.
import { Easing, FadeIn, FadeOut, LinearTransition, cubicBezier } from 'react-native-reanimated';

export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);      // entering / exiting UI
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);  // moving on screen
export const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);    // iOS sheet curve
export const EASE_OUT_CSS = cubicBezier(0.23, 1, 0.32, 1); // same curve for Reanimated CSS transitions

// Springs in Apple's (duration, dampingRatio) form. Bounce only when a finger carried momentum.
export const SPRING_SETTLE = { duration: 400, dampingRatio: 1 } as const;
export const SPRING_SNAP = { duration: 400, dampingRatio: 0.8 } as const;
export const SPRING_SHEET = { duration: 300, dampingRatio: 0.8 } as const;

/** Where a flick would come to rest (Apple's exponential-decay projection). */
export function project(velocity: number, decelerationRate = 0.998) {
  'worklet';
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}
/** Resistance past a boundary: the further past, the less it follows. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

// Layout animations live at module scope (builders rebuilt in render cost every re-render).
export const LIST_REFLOW = LinearTransition.duration(220).easing(EASE_IN_OUT);
export const ROW_IN = FadeIn.duration(180).easing(EASE_OUT);
export const ROW_OUT = FadeOut.duration(140).easing(EASE_OUT);
