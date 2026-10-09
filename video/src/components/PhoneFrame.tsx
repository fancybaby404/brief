import { Video } from "@remotion/media";
import type React from "react";
import {
  CanvasImage,
  Interactive,
  staticFile,
  type InteractivitySchema,
} from "remotion";
import "../fonts";

type PhoneFrameProps = {
  readonly src: string;
  readonly label: string;
  readonly aspect?: number;
  readonly statusBarHeight?: number;
  readonly muted?: boolean;
  readonly speedLabel?: string;
  readonly style?: React.CSSProperties;
};

const SCREEN_HEIGHT = 850;
const BEZEL = 14;

const PhoneFrameInner: React.FC<PhoneFrameProps> = ({
  src,
  label,
  aspect = 0.45,
  statusBarHeight = 36,
  muted = true,
  speedLabel = "",
  style,
}) => {
  return (
    <Interactive.Div
      style={{
        position: "absolute",
        width: SCREEN_HEIGHT * aspect + BEZEL * 2,
        height: SCREEN_HEIGHT + BEZEL * 2,
        padding: BEZEL,
        boxSizing: "border-box",
        borderRadius: 64,
        backgroundColor: "#0E1424",
        boxShadow:
          "0 40px 80px rgba(16,27,63,0.16), 0 8px 24px rgba(16,27,63,0.10)",
        fontFamily: "Inter",
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 50,
          overflow: "hidden",
          backgroundColor: "#F8FBFF",
        }}
      >
        {src ? (
          <Video
            src={staticFile(`clips/${src}`)}
            muted={muted}
            objectFit="cover"
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              backgroundColor: "#EAF4FF",
              color: "#687B9F",
              fontSize: 26,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            <CanvasImage
              src={staticFile("mascot/question.png")}
              width={120}
              height={132}
            />
            <div style={{ color: "#101B3F", fontSize: 30 }}>{label}</div>
            <div>Recording goes here</div>
          </div>
        )}
        {statusBarHeight > 0 ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: statusBarHeight,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 28px",
              backgroundColor: "#F8FBFF",
              color: "#101B3F",
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            <span>9:41</span>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: "#0E1424",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
                <div style={{ width: 3, height: 5, borderRadius: 1, backgroundColor: "#101B3F" }} />
                <div style={{ width: 3, height: 8, borderRadius: 1, backgroundColor: "#101B3F" }} />
                <div style={{ width: 3, height: 11, borderRadius: 1, backgroundColor: "#101B3F" }} />
              </div>
              <div
                style={{
                  width: 24,
                  height: 12,
                  borderRadius: 3,
                  border: "2px solid #101B3F",
                  boxSizing: "border-box",
                  padding: 1,
                }}
              >
                <div style={{ width: "100%", height: "100%", borderRadius: 1, backgroundColor: "#101B3F" }} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {speedLabel ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -64,
            textAlign: "center",
            color: "#687B9F",
            fontSize: 26,
            fontWeight: 600,
          }}
        >
          {speedLabel}
        </div>
      ) : null}
    </Interactive.Div>
  );
};

const phoneFrameSchema = {
  src: {
    type: "text-content",
    default: "",
    description: "Clip in public/clips (empty = placeholder)",
  },
  label: {
    type: "text-content",
    default: "clip.mp4",
    description: "Placeholder label",
  },
  aspect: {
    type: "number",
    default: 0.45,
    min: 0.4,
    max: 0.6,
    step: 0.005,
    keyframable: false,
    hiddenFromList: false,
    description: "Screen width / height",
  },
  statusBarHeight: {
    type: "number",
    default: 36,
    min: 0,
    max: 80,
    step: 1,
    keyframable: false,
    hiddenFromList: false,
    description: "Clean status bar height (0 = off)",
  },
  muted: {
    type: "boolean",
    default: true,
    keyframable: false,
    description: "Mute clip audio",
  },
  speedLabel: {
    type: "text-content",
    default: "",
    description: "Speed badge, e.g. Sped up 3×",
  },
} as const satisfies InteractivitySchema;

export const PhoneFrame = Interactive.withSchema({
  Component: PhoneFrameInner,
  componentName: "<PhoneFrame>",
  schema: phoneFrameSchema,
  wrapInSequence: true,
});
