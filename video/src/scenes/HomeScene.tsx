import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Callout } from "../components/Callout";
import { Headline } from "../components/Headline";
import { PhoneFrame } from "../components/PhoneFrame";

export const HomeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#F8FBFF" }}>
      <Headline name="Home headline" premountFor={fps} style={{ left: 140 }}>
        Every job, one glance
      </Headline>
      <PhoneFrame
        name="Home clip"
        trimBefore={6 * fps}
        premountFor={fps}
        src="onboarding.mp4"
        label="home.mp4"
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
        name="Chart callout"
        from={24}
        premountFor={fps}
        style={{ left: 140, top: 740 }}
      >
        Progress, week by week
      </Callout>
    </AbsoluteFill>
  );
};
