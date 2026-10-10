import { AbsoluteFill, useVideoConfig } from "remotion";
import { Callout } from "../components/Callout";
import { Headline } from "../components/Headline";

export const PrivacyScene: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#F8FBFF" }}>
      <Headline
        name="Privacy headline"
        premountFor={fps}
        style={{
          left: 960,
          bottom: 500,
          transform: "translateX(-50%)",
          textAlign: "center",
        }}
      >
        Your data stays yours
      </Headline>
      <Callout
        name="Chip local LLM"
        from={30}
        premountFor={fps}
        style={{ left: "calc(50% - 360px)", top: 650 }}
      >
        Local LLM
      </Callout>
      <Callout
        name="Chip Whisper"
        from={36}
        premountFor={fps}
        style={{ left: "calc(50% + 30px)", top: 650 }}
      >
        Whisper
      </Callout>
      <Callout
        name="Chip KittenTTS"
        from={42}
        premountFor={fps}
        style={{ left: "calc(50% - 360px)", top: 770 }}
      >
        KittenTTS
      </Callout>
      <Callout
        name="Chip OCR"
        from={48}
        premountFor={fps}
        style={{ left: "calc(50% + 30px)", top: 770 }}
      >
        On-device OCR
      </Callout>
    </AbsoluteFill>
  );
};
