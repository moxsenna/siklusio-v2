import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SceneLayout } from "../components/SceneLayout";
import { PhoneMockup } from "../components/PhoneMockup";
import { BRAND } from "../constants/brand";

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene entrance transition
  const enterTransition = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  const scale = interpolate(enterTransition, [0, 1], [0.9, 1.25]);
  const x = interpolate(enterTransition, [0, 1], [0, -160]);
  const y = interpolate(enterTransition, [0, 1], [40, 20]);

  // Gauge circle fill logic
  const strokeDash = interpolate(frame, [15, 60], [283, 70], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneLayout 
      headline="Pantau Siklus Bunda"
      subHeadline="Prediksi Akurat Berbasis AI 🌸"
    >
      <PhoneMockup scale={scale} x={x} y={y}>
        {/* Inner Screen */}
        <div className="flex-1 bg-[#fcf8fa] p-5 flex flex-col justify-start relative select-none">
          {/* Header of Screen */}
          <div className="flex justify-between items-center mb-6 mt-1">
            <span className="text-xs font-semibold text-slate-400">Hi Bunda! 👋</span>
            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-xs">👩</div>
          </div>

          {/* Circular Cycle Card Dashboard */}
          <div className="w-full bg-white rounded-3xl p-5 border border-pink-100/50 shadow-sm shadow-pink-100/50 flex flex-col items-center mb-5">
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-4">Masa Subur</span>

            {/* SVG Ring Progress */}
            <div className="relative w-36 h-36 flex justify-center items-center mb-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Outer circle track */}
                <circle cx="50" cy="50" r="45" stroke="#fce7f3" strokeWidth="6" fill="transparent" />
                {/* Active progress track */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  stroke={BRAND.colors.teal} 
                  strokeWidth="6" 
                  fill="transparent" 
                  strokeDasharray="283"
                  strokeDashoffset={strokeDash}
                  strokeLinecap="round"
                />
              </svg>
              {/* Inside Circle Info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[28px] font-extrabold text-slate-800" style={{ fontFamily: BRAND.fonts.heading }}>
                  HARI 14
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Prediksi Haid</span>
              </div>
            </div>

            {/* Status Badge */}
            <div 
              className="bg-teal-50 px-4 py-1.5 rounded-full border border-teal-200/50 flex items-center gap-1.5"
              style={{
                transform: `scale(${1.0 + Math.sin(frame / 12) * 0.03})`
              }}
            >
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wide">Peluang Tinggi 🔥</span>
            </div>
          </div>

          {/* Action Call Cards */}
          <div className="w-full bg-white rounded-3xl p-4 border border-pink-50 flex items-center gap-4 shadow-2xs mb-3">
            <div className="w-11 h-11 bg-pink-50 rounded-full flex items-center justify-center text-xl shrink-0">🌸</div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-800 mb-0.5 leading-tight">Log Gejala Hari Ini</h4>
              <p className="text-[10px] text-slate-500 leading-snug">Catat gejala fisik untuk presisi AI</p>
            </div>
            <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center text-pink-500 font-bold text-[10px] shrink-0">➔</div>
          </div>
        </div>
      </PhoneMockup>
    </SceneLayout>
  );
};
