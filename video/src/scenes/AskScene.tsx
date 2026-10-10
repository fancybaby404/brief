import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Headline } from "../components/Headline";
import { PhoneFrame } from "../components/PhoneFrame";

export const AskScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#F8FBFF" }}>
      <PhoneFrame
        name="Resume clip"
        durationInFrames={60}
        trimBefore={15 * fps}
        premountFor={fps}
        src="resume.mp4"
        label="resume.mp4"
        style={{
          left: 280,
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
      <PhoneFrame
        name="Ask Brief clip"
        from={60}
        durationInFrames={405}
        trimBefore={11 * fps}
        playbackRate={2.5}
        premountFor={fps}
        src="ask.mp4"
        label="ask.mp4"
        speedLabel="Sped up 2.5×"
        style={{ left: 280, top: 101 }}
      />
      <Headline name="Ask headline" premountFor={fps} style={{ left: 880 }}>
        Knows your resume
      </Headline>
    </AbsoluteFill>
  );
};
