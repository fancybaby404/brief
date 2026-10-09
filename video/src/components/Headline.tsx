import type React from "react";
import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  type InteractivitySchema,
} from "remotion";
import "../fonts";

type HeadlineProps = {
  readonly children: string;
  readonly sub?: string;
  readonly style?: React.CSSProperties;
};

const HeadlineInner: React.FC<HeadlineProps> = ({ children, sub = "", style }) => {
  const frame = useCurrentFrame();

  return (
    <Interactive.Div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 860,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        fontFamily: "Inter",
        color: "#101B3F",
        opacity: interpolate(frame, [0, 15], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.23, 1, 0.32, 1),
        }),
        translate: interpolate(frame, [0, 18], ["0px 40px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.23, 1, 0.32, 1),
        }),
        ...style,
      }}
    >
      <div
        style={{
          fontSize: 140,
          fontWeight: 800,
          lineHeight: 1.02,
          letterSpacing: "-0.035em",
        }}
      >
        {children}
      </div>
      {sub ? (
        <div
          style={{
            marginTop: 32,
            fontSize: 78,
            fontWeight: 500,
            lineHeight: 1.15,
            color: "#687B9F",
          }}
        >
          {sub}
        </div>
      ) : null}
    </Interactive.Div>
  );
};

const headlineSchema = {
  children: { type: "text-content", default: "", description: "Headline" },
  sub: { type: "text-content", default: "", description: "Supporting line" },
} as const satisfies InteractivitySchema;

export const Headline = Interactive.withSchema({
  Component: HeadlineInner,
  componentName: "<Headline>",
  schema: headlineSchema,
  wrapInSequence: true,
});
