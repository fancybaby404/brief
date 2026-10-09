# Brief — design system v1

## North star
Premium iOS feel, not visual noise. **A good job hunt organizer with a friendly briefcase**. Read `apple-design-reference.md` before modifying gestures and timing. Reference hierarchy: user-approved latest screenshots in `design/references/current/` > explicit product requirements here > earlier concepts (history).

## Identity
- Brand: `brief` all lowercase in **Fredoka Bold (700)** (`@expo-google-fonts/fredoka`, SIL OFL), black, mini mascot alongside. Loaded at startup with expo-font; falls back to the system font if loading fails. Wordmark does not scale with Dynamic Type.
- Mascot: `assets/mascot-happy-original.png` user-supplied; `mascot-happy.png` automatically alpha-cropped for rendering. White 2D flat briefcase, heavy black outline, black feet, black dot eyes/smile/buckle, **NO ARMS/HANDS EVER**. Only compatible emotions via simple black ASCII-like face changes, not 3D and never another creature. Blue simple sparkle shapes or pale blue circle behind it are acceptable.
- Large mascot LEFT of dashboard's speech bubble. On chat/mock larger mascot in calm blue halo; do not overpopulate screens with clones.

## Palette
| Token | Hex | Usage |
|---|---|---|
| accent | `#1677F2` | Primary buttons, active nav, small data emphasis |
| accent-dark | `#0B55CF` | Pressed state, darker accent |
| canvas | `#F8FBFF` | App background; white dominant |
| surface | `#FFFFFF` | Cards, floating bar, menus |
| mist | `#EAF4FF` | Chat panel, selected actions, halo |
| quiet-surface | `#F3F8FF` | Inputs, secondary cards |
| ink | `#101B3F` | Headings and body (near navy, not pure cobalt) |
| secondary | `#687B9F` | Metadata/secondary copy |
| divider | `#E8EFF9` | Very light separators |
| green | `#168E63` | Positive status chips ONLY |
| danger | `#DB4961` | Destructive/error ONLY |

NO rainbow analytics cards; preserve provider logos only if legitimately available and allowed. Single blue series in bar chart, soft/focus treatment not fake gradients.

## Native iOS feel
- SF system text, semibold 26–30 pt major heading, 16–17 pt body, 11–13 pt metadata (scale according to accessibility).
- 16–20 pt horizontal screen margins, 8 pt spacing grid; floating pills radii 18–28 pt; proper status/navigation safe area.
- Navigation: white floating 4-tab capsule + detached blue + button to right, same visual height; anchored popover top-right, anchored short quick menu above +.
- Interactions: immediate pressed feedback (haptics for save/status changes), natural spring damping near 1.0 / response ~0.3–0.4, no default exaggerated bounce. Sheet anchored to trigger and interruptible. Preserve touch during transitions. Graceful reduced motion.
- Only content should scroll; top header stable; avoid stacking too many frosted layers. Translucent navigation material where supported, fallback readable opaque white, never blur text itself.
- Touch targets min 44x44 pt; headings and controls should remain legible at large Dynamic Type.
- Maximal primary visual emphasis goes to the current job/action, not to decoration. Empty-state mascot accompanied by clear CTA; no excessive motivational slogans.

## Page-specific differences
- Dashboard: mascot left, speech bubble right, `Application progress` REAL blue bars across rolling 4 weeks, direct list `Recent applications`. **Never** an Up Next banner, rainbow 3/4 tile stats or line graph.
- Applications: single list only (no Applications/Events segment), search + visible sort action.
- Ask Brief: no upper shortcut tiles. Chat and bottom suggestion chips only.
- Resume: strong page preview, no filename or readiness banner; below preview concise actions and resume summary.
- Mock: two screens, job picker with large mascot and session with messages. In-progress answer voice visuals only if truly recording.

## iOS-native semantics and content policy
- Save/bookmark means local tracker; external "Apply" action must open the provider's listing, not claim application submitted.
- Status chips may use semantic subtle colors but not color alone; always label.
- Accessible icons need spoken labels.
- Long job titles truncate gracefully; never clip actions under the floating bar.
