import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND } from "../constants/brand";
import { BrandBackground } from "./BrandBackground";

interface SceneLayoutProps {
  headline: string;
  subHeadline: string;
  children: React.ReactNode;
}

export const SceneLayout: React.FC<SceneLayoutProps> = ({
  headline,
  subHeadline,
  children
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring animations for text entrance
  const textEntrance = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15 },
  });

  const subEntrance = spring({
    frame: frame - 25,
    fps,
    config: { damping: 14 },
  });

  return (
    <div className="w-full h-full relative flex flex-col justify-start items-center pt-24 px-8 overflow-hidden select-none">
      <BrandBackground />

      {/* Text Area */}
      <div className="w-full text-center mb-10 z-10 min-h-[160px] flex flex-col justify-center items-center">
        <h2 
          className="text-[44px] font-extrabold text-slate-800 leading-tight mb-3"
          style={{ 
            fontFamily: BRAND.fonts.heading,
            transform: `scale(${textEntrance}) translateY(${(1 - textEntrance) * 30}px)`,
            opacity: textEntrance,
          }}
        >
          {headline}
        </h2>
        <p 
          className="text-[26px] font-semibold leading-relaxed max-w-[90%]"
          style={{ 
            fontFamily: BRAND.fonts.body,
            color: BRAND.colors.pink,
            transform: `scale(${subEntrance}) translateY(${(1 - subEntrance) * 20}px)`,
            opacity: subEntrance,
          }}
        >
          {subHeadline}
        </p>
      </div>

      {/* Mockup Container */}
      <div className="flex-1 w-full flex items-start justify-center pt-8 relative z-10">
        {children}
      </div>
    </div>
  );
};
