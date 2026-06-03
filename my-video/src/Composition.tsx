import React from "react";
import { Series } from "remotion";
import { TIMELINE } from "./constants/brand";

import { HookScene } from "./scenes/HookScene";
import { DashboardScene } from "./scenes/DashboardScene";
import { HusbandMessageScene } from "./scenes/HusbandMessageScene";
import { HabitScene } from "./scenes/HabitScene";
import { TWWSanctuaryScene } from "./scenes/TWWSanctuaryScene";
import { CTAScene } from "./scenes/CTAScene";

export const SiklusioDemoPortrait: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={TIMELINE.scenes.hook.duration}>
        <HookScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={TIMELINE.scenes.dashboard.duration}>
        <DashboardScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={TIMELINE.scenes.husbandMessage.duration}>
        <HusbandMessageScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={TIMELINE.scenes.habit.duration}>
        <HabitScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={TIMELINE.scenes.tww.duration}>
        <TWWSanctuaryScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={TIMELINE.scenes.cta.duration}>
        <CTAScene />
      </Series.Sequence>
    </Series>
  );
};
