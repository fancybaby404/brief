import { Composition, Folder } from "remotion";
import { BriefPromo } from "./BriefPromo";
import { Callout } from "./components/Callout";
import { Headline } from "./components/Headline";
import { PhoneFrame } from "./components/PhoneFrame";
import { TapRipple } from "./components/TapRipple";
import { AskScene } from "./scenes/AskScene";
import { DiscoverScene } from "./scenes/DiscoverScene";
import { HomeScene } from "./scenes/HomeScene";
import { HookScene } from "./scenes/HookScene";
import { MockScene } from "./scenes/MockScene";
import { OutroScene } from "./scenes/OutroScene";
import { PrivacyScene } from "./scenes/PrivacyScene";
import { RevealScene } from "./scenes/RevealScene";
import { TrackScene } from "./scenes/TrackScene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BriefPromo"
        component={BriefPromo}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
      <Folder name="Scenes">
        <Composition id="Hook" component={HookScene} durationInFrames={165} fps={30} width={1920} height={1080} />
        <Composition id="Reveal" component={RevealScene} durationInFrames={192} fps={30} width={1920} height={1080} />
        <Composition id="Home" component={HomeScene} durationInFrames={192} fps={30} width={1920} height={1080} />
        <Composition id="Discover" component={DiscoverScene} durationInFrames={282} fps={30} width={1920} height={1080} />
        <Composition id="Track" component={TrackScene} durationInFrames={222} fps={30} width={1920} height={1080} />
        <Composition id="Ask" component={AskScene} durationInFrames={222} fps={30} width={1920} height={1080} />
        <Composition id="Mock" component={MockScene} durationInFrames={312} fps={30} width={1920} height={1080} />
        <Composition id="Privacy" component={PrivacyScene} durationInFrames={162} fps={30} width={1920} height={1080} />
        <Composition id="Outro" component={OutroScene} durationInFrames={147} fps={30} width={1920} height={1080} />
      </Folder>
      <Folder name="Elements">
        <Composition
          id="PhoneFrame"
          component={PhoneFrame}
          durationInFrames={90}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            src: "onboarding.mp4",
            label: "home.mp4",
            muted: true,
            speedLabel: "",
            style: { left: 750, top: 101 },
          }}
        />
        <Composition
          id="Headline"
          component={Headline}
          durationInFrames={60}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            children: "Every job, one glance",
            sub: "",
            style: { left: 140, backgroundColor: "#F8FBFF" },
          }}
        />
        <Composition
          id="Callout"
          component={Callout}
          durationInFrames={45}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            children: "Progress, week by week",
            style: { left: 140, top: 740 },
          }}
        />
        <Composition
          id="TapRipple"
          component={TapRipple}
          durationInFrames={18}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ style: { left: 960, top: 540 } }}
        />
      </Folder>
    </>
  );
};
