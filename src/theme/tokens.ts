export const C = {
  blue: '#1677F2', blueDeep: '#0B55CF', pale: '#EAF4FF', pale2: '#F3F8FF',
  ink: '#101B3F', muted: '#687B9F', soft: '#A2AEC0', white: '#FFFFFF',
  line: '#E8EFF9', background: '#F8FBFF', surface: '#FFFFFF',
  green: '#168E63', greenSoft: '#E7FAF1', danger: '#DB4961', redSoft: '#FFF0F3',
} as const;
export const R = { card: 18, sheet: 22, pill: 30, nav: 25 } as const;
// Apple spring presets (damping ratio, response) converted to RN mass/stiffness/damping.
// UI: ratio 1.0, response 0.35 s (no overshoot). Sheet: ratio 0.85, response 0.3 s.
export const SPRING = { ui: { mass: 1, stiffness: 322, damping: 36 }, sheet: { mass: 1, stiffness: 439, damping: 36 } } as const;
