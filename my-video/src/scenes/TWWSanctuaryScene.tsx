import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SceneLayout } from "../components/SceneLayout";
import { PhoneMockup } from "../components/PhoneMockup";
import { BRAND } from "../constants/brand";

export const TWWSanctuaryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const transition = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  const baseScale = interpolate(transition, [0, 1], [0.95, 0.95]);
  const y = interpolate(transition, [0, 1], [40, 20]);

  // Breathing loop pulse logic: 120 frames (4s) per full breath loop
  const breathingIndex = frame % 120;
  const breatheGlow = interpolate(
    breathingIndex,
    [0, 45, 60, 105, 120],
    [1.0, 1.15, 1.15, 0.95, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Dynamic guidance text based on phase
  let breatheText = "Tarik Napas...";
  if (breathingIndex >= 45 && breathingIndex < 60) breatheText = "Tahan...";
  else if (breathingIndex >= 60) breatheText = "Hembuskan...";

  // AI Letter Fade in progress
  const line1Opacity = interpolate(frame, [25, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const line2Opacity = interpolate(frame, [65, 85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneLayout 
      headline="Cemas Menanti Garis Dua?"
      subHeadline="Tenangkan Hati di TWW Sanctuary 🍃"
    >
      <PhoneMockup scale={baseScale * breatheGlow} y={y}>
        {/* Inner Screen */}
        <div 
          className="flex-1 p-5 flex flex-col justify-start relative select-none"
          style={{
            background: "linear-gradient(to bottom, #fef2f6, #f0f6fe)"
          }}
        >
          {/* Header */}
          <div className="mt-2 mb-4">
            <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">TWW Sanctuary</span>
            <h3 className="text-md font-bold text-slate-800 mt-0.5" style={{ fontFamily: BRAND.fonts.heading }}>Pojok Tenang Bunda</h3>
          </div>

          {/* Breathing Circle Visualizer */}
          <div className="w-full bg-white/40 backdrop-blur-md rounded-3xl p-5 border border-white/50 flex flex-col items-center mb-4 shadow-sm">
            <div 
              className="w-28 h-28 rounded-full flex items-center justify-center shadow-lg relative border-4 border-pink-200/50"
              style={{
                background: `linear-gradient(135deg, ${BRAND.colors.pink}20, ${BRAND.colors.violet}30)`,
                transform: `scale(${breatheGlow})`
              }}
            >
              <div className="absolute inset-2 rounded-full border border-pink-300/30 animate-pulse" />
              <span 
                className="text-xs font-bold text-pink-600 transition-all"
                style={{ fontFamily: BRAND.fonts.body }}
              >
                {breatheText}
              </span>
            </div>
          </div>

          {/* AI Calm Letter Cards */}
          <div className="w-full bg-white/70 backdrop-blur-md border border-pink-100/50 rounded-3xl p-4 shadow-md shadow-pink-100/30 flex-1 flex flex-col justify-start overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs">🤖</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Surat Tenang AI</span>
            </div>

            {/* Letter Paragraph lines */}
            <div className="flex flex-col gap-2.5">
              <p 
                className="text-[11px] text-slate-700 leading-relaxed transition-all duration-150 font-medium"
                style={{
                  opacity: line1Opacity,
                  transform: `translateY(${(1 - line1Opacity) * 8}px)`
                }}
              >
                "Bunda, rasa cemas menanti garis dua di fase TWW ini adalah hal yang sepenuhnya valid..."
              </p>
              <p 
                className="text-[11px] text-slate-700 leading-relaxed transition-all duration-150 font-medium"
                style={{
                  opacity: line2Opacity,
                  transform: `translateY(${(1 - line2Opacity) * 8}px)`
                }}
              >
                "Tarik napas dalam-dalam. Kami di sini memeluk hatimu di setiap detik perjuangan hangat ini. 💕"
              </p>
            </div>
          </div>

        </div>
      </PhoneMockup>
    </SceneLayout>
  );
};
