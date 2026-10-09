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

export const PrivacyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#F8FBFF" }}>
      <PhoneFrame
        name="Offline clip"
        premountFor={fps}
        src=""
        label="offline.mp4"
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
      <Headline
        name="Privacy headline"
        premountFor={fps}
        style={{ left: 880, bottom: 250 }}
      >
        Works in airplane mode
      </Headline>
      <Callout
        name="Chip local LLM"
        from={30}
        premountFor={fps}
        style={{ left: 880, top: 700 }}
      >
        Local LLM
      </Callout>
      <Callout
        name="Chip Whisper"
        from={36}
        premountFor={fps}
        style={{ left: 1260, top: 700 }}
      >
        Whisper
      </Callout>
      <Callout
        name="Chip KittenTTS"
        from={42}
        premountFor={fps}
        style={{ left: 880, top: 812 }}
      >
        KittenTTS
      </Callout>
      <Callout
        name="Chip OCR"
        from={48}
        premountFor={fps}
        style={{ left: 1260, top: 812 }}
      >
        On-device OCR
      </Callout>
    </AbsoluteFill>
  );
};
