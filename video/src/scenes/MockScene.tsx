import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Callout } from "../components/Callout";
import { Headline } from "../components/Headline";
import { PhoneFrame } from "../components/PhoneFrame";

export const MockScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#F8FBFF" }}>
      <Headline name="Mock headline" premountFor={fps} style={{ left: 140 }}>
        Practice out loud
      </Headline>
      <PhoneFrame
        name="Mock clip"
        premountFor={fps}
        src=""
        label="mock.mp4"
        muted={false}
        style={{
          left: 1230,
          top: 101,
          opacity: interpolate(frame, [0, 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [0, 18], ["0px 60px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.23, 1, 0.32, 1),
          }),
        }}
      />
      <Callout
        name="Feedback callout"
        from={220}
        premountFor={fps}
        style={{ left: 140, top: 740 }}
      >
        Scored, honest feedback
      </Callout>
      <Audio
        name="Feedback ding"
        src={staticFile("sfx/ding.wav")}
        from={220}
        volume={0.25}
        premountFor={fps}
      />
    </AbsoluteFill>
  );
};
