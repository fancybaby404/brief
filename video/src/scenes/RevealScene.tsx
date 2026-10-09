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
import { PhoneFrame } from "../components/PhoneFrame";
import "../fonts";

export const RevealScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#F8FBFF", fontFamily: "Inter" }}>
      <Interactive.Div
        name="Brand group"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          translate: interpolate(frame, [84, 112], ["0px 0px", "-380px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.77, 0, 0.175, 1),
          }),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div
            style={{
              width: 340,
              height: 340,
              borderRadius: 170,
              backgroundColor: "#EAF4FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CanvasImage
              name="Mascot"
              src={staticFile("mascot/happy.png")}
              width={240}
              height={263}
              style={{
                opacity: interpolate(frame, [0, 8], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                translate: interpolate(frame, [0, 22], ["0px -140px", "0px 0px"], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.spring({ damping: 14 }),
                }),
              }}
            />
          </div>
          <Interactive.Div
            name="Wordmark"
            style={{
              fontFamily: "Fredoka",
              fontWeight: 700,
              fontSize: 240,
              lineHeight: 1,
              color: "#000000",
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
            brief
          </Interactive.Div>
        </div>
        <Interactive.Div
          name="On-device badge"
          style={{
            padding: "18px 36px",
            borderRadius: 999,
            backgroundColor: "#EAF4FF",
            color: "#1677F2",
            fontSize: 56,
            fontWeight: 700,
            opacity: interpolate(frame, [36, 46], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            scale: interpolate(frame, [36, 50], [0.9, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 200 }),
              output: "perceptual-scale",
            }),
          }}
        >
          On-device AI
        </Interactive.Div>
      </Interactive.Div>
      <PhoneFrame
        name="Onboarding clip"
        from={90}
        premountFor={fps}
        src=""
        label="onboarding.mp4"
        style={{
          left: 1230,
          top: 101,
          opacity: interpolate(frame, [90, 104], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [90, 116], ["300px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.23, 1, 0.32, 1),
          }),
        }}
      />
      <Audio
        name="Mascot pop"
        src={staticFile("sfx/mouse-click.wav")}
        from={14}
        volume={0.3}
        premountFor={fps}
      />
    </AbsoluteFill>
  );
};
