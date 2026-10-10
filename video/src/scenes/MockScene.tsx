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

  const entrance = {
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
  } as const;

  return (
    <AbsoluteFill style={{ backgroundColor: "#F8FBFF" }}>
      <Headline name="Mock headline" premountFor={fps} style={{ left: 140 }}>
        Practice out loud
      </Headline>
      <PhoneFrame
        name="Mock setup clip"
        durationInFrames={135}
        trimBefore={85 * fps}
        playbackRate={1.5}
        premountFor={fps}
        src="mocksetup.mp4"
        label="mocksetup.mp4"
        style={entrance}
      />
      <PhoneFrame
        name="Mock question clip"
        from={90}
        durationInFrames={180}
        trimBefore={30 * fps}
        playbackRate={2}
        premountFor={fps}
        src="mock.mp4"
        label="mock.mp4"
        speedLabel="Sped up 2×"
        style={{ left: 1230, top: 101 }}
      />
      <PhoneFrame
        name="Mock listening clip"
        from={180}
        durationInFrames={252}
        trimBefore={44 * fps}
        playbackRate={2}
        premountFor={fps}
        src="mock.mp4"
        label="mock.mp4"
        speedLabel="Sped up 2×"
        style={{ left: 1230, top: 101 }}
      />
      <Callout
        name="Transcribe callout"
        from={200}
        premountFor={fps}
        style={{ left: 140, top: 740 }}
      >
        Transcribed on your phone
      </Callout>
      <Audio
        name="Transcribe ding"
        src={staticFile("sfx/ding.wav")}
        from={200}
        volume={0.25}
        premountFor={fps}
      />
    </AbsoluteFill>
  );
};
