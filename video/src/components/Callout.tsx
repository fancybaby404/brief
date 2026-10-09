import type React from "react";
import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  type InteractivitySchema,
} from "remotion";
import "../fonts";

type CalloutProps = {
  readonly children: string;
  readonly style?: React.CSSProperties;
};

// Feature chip that sits in the headline column, below the headline.
const CalloutInner: React.FC<CalloutProps> = ({ children, style }) => {
  const frame = useCurrentFrame();

  return (
    <Interactive.Div
      style={{
        position: "absolute",
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "14px 30px 14px 14px",
        borderRadius: 999,
        backgroundColor: "#FFFFFF",
        border: "2px solid #E8EFF9",
        color: "#101B3F",
        fontFamily: "Inter",
        fontSize: 44,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
        boxShadow: "0 6px 18px rgba(16,27,63,0.06)",
        opacity: interpolate(frame, [0, 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.23, 1, 0.32, 1),
        }),
        translate: interpolate(frame, [0, 16], ["0px 16px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.23, 1, 0.32, 1),
        }),
        ...style,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: "#EAF4FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12.5l4.2 4.2L19 7"
            stroke="#1677F2"
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {children}
    </Interactive.Div>
  );
};

const calloutSchema = {
  children: { type: "text-content", default: "", description: "Label" },
} as const satisfies InteractivitySchema;

export const Callout = Interactive.withSchema({
  Component: CalloutInner,
  componentName: "<Callout>",
  schema: calloutSchema,
  wrapInSequence: true,
});
