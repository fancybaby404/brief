import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Headline } from "../components/Headline";
import { PhoneFrame } from "../components/PhoneFrame";

export const TrackScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#F8FBFF" }}>
      <Headline name="Track headline" premountFor={fps} style={{ left: 140 }}>
        Interviews, sorted
      </Headline>
      <PhoneFrame
        name="Track clip"
        trimBefore={8 * fps}
        durationInFrames={389}
        playbackRate={1.75}
        premountFor={fps}
        src="track.mp4"
        label="track.mp4"
        speedLabel="Sped up 1.75×"
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
    </AbsoluteFill>
  );
};
