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
import { Headline } from "../components/Headline";
import "../fonts";

// Illustration of the problem (not app UI): out on the street, no signal, no way to practice.
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#EEF2F7", fontFamily: "Inter" }}>
      <Interactive.Svg
        name="Map"
        viewBox="0 0 1920 1080"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          scale: interpolate(frame, [0, 165], [1.08, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            output: "perceptual-scale",
          }),
        }}
      >
        <rect x={0} y={0} width={1920} height={1080} fill="#E6ECF3" />
        <path d="M 1500 -20 C 1580 300 1700 520 1660 1100" stroke="#CFE3FA" strokeWidth={90} fill="none" />
        <rect x={980} y={90} width={300} height={230} rx={28} fill="#DCEBFA" />
        <rect x={1340} y={420} width={180} height={150} rx={22} fill="#D8DFE9" />
        <rect x={980} y={420} width={300} height={150} rx={22} fill="#D8DFE9" />
        <rect x={980} y={690} width={180} height={260} rx={22} fill="#D8DFE9" />
        <rect x={1220} y={690} width={300} height={260} rx={22} fill="#D8DFE9" />
        <rect x={1740} y={90} width={220} height={480} rx={22} fill="#D8DFE9" />
        <rect x={1740} y={690} width={220} height={260} rx={22} fill="#D8DFE9" />
        <rect x={600} y={90} width={320} height={230} rx={22} fill="#D8DFE9" />
        <rect x={600} y={420} width={320} height={530} rx={22} fill="#D8DFE9" />
        <path d="M -20 370 H 1940" stroke="#FFFFFF" strokeWidth={56} />
        <path d="M -20 630 H 1940" stroke="#FFFFFF" strokeWidth={70} />
        <path d="M 950 -20 V 1100" stroke="#FFFFFF" strokeWidth={46} />
        <path d="M 1310 -20 V 1100" stroke="#FFFFFF" strokeWidth={40} />
        <path d="M 1190 630 V 1100" stroke="#FFFFFF" strokeWidth={34} />
        <path d="M 1700 -20 V 1100" stroke="#FFFFFF" strokeWidth={40} />
      </Interactive.Svg>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, #F8FBFF 0%, #F8FBFF 38%, rgba(248,251,255,0) 58%)",
        }}
      />
      <Headline name="Hook headline" premountFor={fps} style={{ left: 140 }}>
        No signal. Interview tomorrow.
      </Headline>
      <Interactive.Div
        name="Walker"
        style={{
          position: "absolute",
          left: 1230,
          top: 470,
          width: 160,
          height: 176,
          translate: interpolate(frame, [0, 40], ["-260px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.23, 1, 0.32, 1),
          }),
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            bottom: -14,
            height: 28,
            borderRadius: "50%",
            backgroundColor: "rgba(22,119,242,0.22)",
            scale: interpolate(frame % 45, [0, 44], [0.7, 1.5]),
            opacity: interpolate(frame % 45, [0, 44], [0.9, 0]),
          }}
        />
        <CanvasImage
          name="Mascot happy"
          src={staticFile("mascot/happy.png")}
          width={160}
          height={176}
          style={{
            position: "absolute",
            opacity: interpolate(frame, [52, 58], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            translate: `0px ${frame < 40 ? -Math.abs(Math.sin(frame / 3)) * 10 : 0}px`,
          }}
        />
        <CanvasImage
          name="Mascot sad"
          src={staticFile("mascot/sad.png")}
          width={160}
          height={176}
          style={{
            position: "absolute",
            opacity: interpolate(frame, [52, 58], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
      </Interactive.Div>
      <Interactive.Div
        name="No Wi-Fi badge"
        style={{
          position: "absolute",
          left: 1262,
          top: 330,
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: "#FFFFFF",
          boxShadow: "0 12px 32px rgba(16,27,63,0.14)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: interpolate(frame, [44, 52], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [44, 60], [0.6, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 12 }),
            output: "perceptual-scale",
          }),
        }}
      >
        <svg width={56} height={56} viewBox="0 0 24 24" fill="none">
          <path d="M2 8.5a15 15 0 0 1 20 0" stroke="#A2AEC0" strokeWidth={2.2} strokeLinecap="round" />
          <path d="M5.5 12.2a10 10 0 0 1 13 0" stroke="#A2AEC0" strokeWidth={2.2} strokeLinecap="round" />
          <path d="M9 15.9a5 5 0 0 1 6 0" stroke="#A2AEC0" strokeWidth={2.2} strokeLinecap="round" />
          <circle cx={12} cy={19.5} r={1.6} fill="#A2AEC0" />
          <path d="M4 3 L20 21" stroke="#DB4961" strokeWidth={2.6} strokeLinecap="round" />
        </svg>
      </Interactive.Div>
      <Interactive.Div
        name="Offline card"
        style={{
          position: "absolute",
          left: 1110,
          top: 720,
          width: 560,
          padding: "26px 30px",
          borderRadius: 24,
          backgroundColor: "#FFFFFF",
          boxShadow: "0 16px 40px rgba(16,27,63,0.14)",
          color: "#101B3F",
          opacity: interpolate(frame, [70, 80], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [70, 88], ["0px 30px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.23, 1, 0.32, 1),
          }),
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 700 }}>You&apos;re offline</div>
        <div style={{ marginTop: 8, fontSize: 26, fontWeight: 500, color: "#687B9F" }}>
          Interview practice needs an internet connection.
        </div>
      </Interactive.Div>
      <Audio
        name="Offline blip"
        src={staticFile("sfx/switch.wav")}
        from={44}
        volume={0.3}
        premountFor={fps}
      />
      <Audio
        name="Whoosh"
        src={staticFile("sfx/whoosh.wav")}
        from={148}
        volume={0.35}
        premountFor={fps}
      />
    </AbsoluteFill>
  );
};
