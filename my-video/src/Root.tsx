import "./index.css";
import { Composition } from "remotion";
import { SiklusioDemoPortrait } from "./Composition";
import { TIMELINE } from "./constants/brand";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SiklusioDemoPortrait"
        component={SiklusioDemoPortrait}
        durationInFrames={TIMELINE.scenes.cta.end} // 1050 frames
        fps={TIMELINE.fps}
        width={TIMELINE.width}
        height={TIMELINE.height}
      />
    </>
  );
};
