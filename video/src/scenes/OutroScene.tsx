import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import "../fonts";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#F8FBFF",
        fontFamily: "Inter",
        alignItems: "center",
        justifyContent: "center",
        gap: 44,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: "#EAF4FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CanvasImage
            name="Mascot"
            src={staticFile("mascot/happy.png")}
            width={180}
            height={198}
            style={{
              translate: interpolate(
                frame,
                [8, 18, 30],
                ["0px 0px", "0px -44px", "0px 0px"],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.77, 0, 0.175, 1),
                },
              ),
            }}
          />
        </div>
        <Interactive.Div
          name="Wordmark"
          style={{
            fontFamily: "Fredoka",
            fontWeight: 700,
            fontSize: 200,
            lineHeight: 1,
            color: "#000000",
          }}
        >
          brief
        </Interactive.Div>
      </div>
      <Interactive.Div
        name="Tagline"
        style={{
          fontSize: 100,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "#101B3F",
          opacity: interpolate(frame, [14, 28], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [14, 32], ["0px 30px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.23, 1, 0.32, 1),
          }),
        }}
      >
        Job hunting, made lighter.
      </Interactive.Div>
      <Interactive.Div
        name="Coming soon"
        style={{
          padding: "16px 36px",
          borderRadius: 999,
          backgroundColor: "#1677F2",
          color: "#FFFFFF",
          fontSize: 48,
          fontWeight: 700,
          opacity: interpolate(frame, [34, 46], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Coming soon
      </Interactive.Div>
      <Audio
        name="Outro ding"
        src={staticFile("sfx/ding.wav")}
        from={10}
        volume={0.25}
        premountFor={fps}
      />
    </AbsoluteFill>
  );
};
