import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SceneLayout } from "../components/SceneLayout";
import { PhoneMockup } from "../components/PhoneMockup";
import { BRAND } from "../constants/brand";

export const HabitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const transition = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  const scale = interpolate(transition, [0, 1], [0.95, 1.15]);
  const y = interpolate(transition, [0, 1], [40, 20]);

  // Check action frames
  const check1 = frame >= 25;
  const check2 = frame >= 55;
  const check3 = frame >= 85;

  const check1Scale = spring({ frame: frame - 25, fps, config: { damping: 10 } });
  const check2Scale = spring({ frame: frame - 55, fps, config: { damping: 10 } });
  const check3Scale = spring({ frame: frame - 85, fps, config: { damping: 10 } });

  // Progress bar fill interpolation
  const progress = interpolate(
    frame,
    [15, 25, 55, 85, 110],
    [10, 40, 70, 100, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <SceneLayout 
      headline="Kebiasaan Sehat Promil"
      subHeadline="Dipandu Harian oleh AI Habit Coach 🧘‍♀️"
    >
      <PhoneMockup scale={scale} y={y}>
        {/* Inner Screen */}
        <div className="flex-1 bg-[#fcf8fa] p-5 flex flex-col justify-start relative select-none">
          
          {/* Header */}
          <div className="mt-2 mb-5">
            <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">Habit Coach</span>
            <h3 className="text-md font-bold text-slate-800 mt-0.5" style={{ fontFamily: BRAND.fonts.heading }}>Jurnal Harian Promil</h3>
          </div>

          {/* Checklist Items */}
          <div className="flex flex-col gap-3 mb-6">
            
            {/* Item 1 */}
            <div className="w-full bg-white rounded-2xl p-4 border border-pink-100/50 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-150"
                  style={{
                    borderColor: check1 ? BRAND.colors.teal : "#fbcfe8",
                    backgroundColor: check1 ? `${BRAND.colors.teal}15` : "transparent",
                    transform: check1 ? `scale(${check1Scale})` : "none"
                  }}
                >
                  {check1 && <span className="text-[10px] font-bold text-teal-600">✓</span>}
                </div>
                <span className="text-xs font-semibold text-slate-800">Minum Asam Folat</span>
              </div>
              <span className="text-[10px] text-slate-400">07:00</span>
            </div>

            {/* Item 2 */}
            <div className="w-full bg-white rounded-2xl p-4 border border-pink-100/50 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-150"
                  style={{
                    borderColor: check2 ? BRAND.colors.teal : "#fbcfe8",
                    backgroundColor: check2 ? `${BRAND.colors.teal}15` : "transparent",
                    transform: check2 ? `scale(${check2Scale})` : "none"
                  }}
                >
                  {check2 && <span className="text-[10px] font-bold text-teal-600">✓</span>}
                </div>
                <span className="text-xs font-semibold text-slate-800">Tidur Sebelum 22:00</span>
              </div>
              <span className="text-[10px] text-slate-400">22:00</span>
            </div>

            {/* Item 3 */}
            <div className="w-full bg-white rounded-2xl p-4 border border-pink-100/50 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-150"
                  style={{
                    borderColor: check3 ? BRAND.colors.teal : "#fbcfe8",
                    backgroundColor: check3 ? `${BRAND.colors.teal}15` : "transparent",
                    transform: check3 ? `scale(${check3Scale})` : "none"
                  }}
                >
                  {check3 && <span className="text-[10px] font-bold text-teal-600">✓</span>}
                </div>
                <span className="text-xs font-semibold text-slate-800">Jalan Kaki 15 Menit</span>
              </div>
              <span className="text-[10px] text-slate-400">Pagi</span>
            </div>

          </div>

          {/* Habit Progress Bar Box */}
          <div className="w-full bg-white rounded-3xl p-5 border border-pink-50 shadow-xs flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Progres Hari Ini</span>
              <span className="text-[10px] font-bold text-teal-600">{Math.floor(progress)}%</span>
            </div>
            <div className="w-full h-2.5 bg-pink-100/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-teal-500 rounded-full transition-all duration-100 ease-out"
                style={{
                  width: `${progress}%`
                }}
              />
            </div>
          </div>

        </div>
      </PhoneMockup>
    </SceneLayout>
  );
};
