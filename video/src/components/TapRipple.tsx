import type React from "react";
import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  type InteractivitySchema,
} from "remotion";

type TapRippleProps = {
  readonly style?: React.CSSProperties;
};

// Place with style.left/top at the tap point; give it durationInFrames={18}.
const TapRippleInner: React.FC<TapRippleProps> = ({ style }) => {
  const frame = useCurrentFrame();

  return (
    <Interactive.Div
      style={{
        position: "absolute",
        width: 80,
        height: 80,
        marginLeft: -40,
        marginTop: -40,
        borderRadius: 40,
        border: "4px solid #1677F2",
        boxSizing: "border-box",
        backgroundColor: "rgba(22,119,242,0.18)",
        opacity: interpolate(frame, [0, 4, 18], [0, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        scale: interpolate(frame, [0, 18], [0.6, 1.3], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.23, 1, 0.32, 1),
          output: "perceptual-scale",
        }),
        ...style,
      }}
    />
  );
};

const tapRippleSchema = {} as const satisfies InteractivitySchema;

export const TapRipple = Interactive.withSchema({
  Component: TapRippleInner,
  componentName: "<TapRipple>",
  schema: tapRippleSchema,
  wrapInSequence: true,
});
