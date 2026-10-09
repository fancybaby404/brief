import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Headline } from "../components/Headline";
import { PhoneFrame } from "../components/PhoneFrame";

export const DiscoverScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#F8FBFF" }}>
      <PhoneFrame
        name="Explore clip"
        durationInFrames={130}
        premountFor={fps}
        src=""
        label="explore.mp4"
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
        name="Add job clip"
        from={130}
        premountFor={fps}
        src=""
        label="addjob.mp4"
        style={{ left: 280, top: 101 }}
      />
      <Headline
        name="Swipe headline"
        durationInFrames={130}
        premountFor={fps}
        style={{ left: 880 }}
      >
        Swipe to save
      </Headline>
      <Headline
        name="Snap headline"
        from={130}
        premountFor={fps}
        style={{ left: 880 }}
      >
        Snap to add
      </Headline>
    </AbsoluteFill>
  );
};
