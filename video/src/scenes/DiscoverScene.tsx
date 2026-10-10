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
        durationInFrames={165}
        trimBefore={3 * fps}
        premountFor={fps}
        src="explore.mp4"
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
        from={165}
        trimBefore={2 * fps}
        durationInFrames={234}
        playbackRate={2}
        premountFor={fps}
        src="addjob.mp4"
        label="addjob.mp4"
        speedLabel="Sped up 2×"
        style={{ left: 280, top: 101 }}
      />
      <Headline
        name="Swipe headline"
        durationInFrames={165}
        premountFor={fps}
        style={{ left: 880 }}
      >
        Swipe to save
      </Headline>
      <Headline
        name="Snap headline"
        from={165}
        premountFor={fps}
        style={{ left: 880 }}
      >
        Snap to add
      </Headline>
    </AbsoluteFill>
  );
};
