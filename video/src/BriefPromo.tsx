import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import {
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AskScene } from "./scenes/AskScene";
import { DiscoverScene } from "./scenes/DiscoverScene";
import { HomeScene } from "./scenes/HomeScene";
import { HookScene } from "./scenes/HookScene";
import { MockScene } from "./scenes/MockScene";
import { OutroScene } from "./scenes/OutroScene";
import { PrivacyScene } from "./scenes/PrivacyScene";
import { RevealScene } from "./scenes/RevealScene";
import { TrackScene } from "./scenes/TrackScene";

const MusicBed: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  return (
    <Audio
      name="Music bed"
      src={staticFile("music/bed.mp3")}
      premountFor={fps}
      volume={interpolate(
        frame,
        [0, fps, durationInFrames - 2 * fps, durationInFrames - 10],
        [0, 0.13, 0.13, 0],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.23, 1, 0.32, 1),
        },
      )}
    />
  );
};

// Scene sum 1896 − 8 transitions × 12 = 1800 frames (60 s @ 30 fps).
export const BriefPromo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <>
    <MusicBed />
    <TransitionSeries name="Brief promo">
      <TransitionSeries.Sequence name="Hook" durationInFrames={165} premountFor={fps}>
        <HookScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence name="Reveal" durationInFrames={192} premountFor={fps}>
        <RevealScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence name="Home" durationInFrames={192} premountFor={fps}>
        <HomeScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence name="Discover + Add" durationInFrames={282} premountFor={fps}>
        <DiscoverScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence name="Track" durationInFrames={222} premountFor={fps}>
        <TrackScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence name="Ask Brief" durationInFrames={222} premountFor={fps}>
        <AskScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence name="Mock interview" durationInFrames={312} premountFor={fps}>
        <MockScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence name="Privacy" durationInFrames={162} premountFor={fps}>
        <PrivacyScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence name="Outro" durationInFrames={147} premountFor={fps}>
        <OutroScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    </>
  );
};
