import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneLayout } from "../components/SceneLayout";
import { PhoneMockup } from "../components/PhoneMockup";
import { BRAND } from "../constants/brand";

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phone Entrance motion
  const entry = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  const scale = entry * 1.05;
  const y = (1 - entry) * 800 + 40;
  const rotate = (1 - entry) * -15 - 3; // Float angle

  // Typing effect for the welcome card
  const textProgress = Math.min(Math.floor(frame / 2), 65);
  const welcomeText = "Bunda, rahimmu adalah tempat yang aman. Mari mulai promil hangat hari ini...".slice(0, textProgress);

  return (
    <SceneLayout 
      headline="Pejuang Garis Dua?"
      subHeadline="Promil Lebih Terarah, Hati Lebih Tenang 🌸"
    >
      <PhoneMockup scale={scale} y={y} rotateZ={rotate}>
        {/* Inner Screen */}
        <div 
          className="flex-1 flex flex-col justify-between items-center p-8 text-center"
          style={{
            background: "linear-gradient(to bottom, #fdf2f8, #ffffff)"
          }}
        >
          {/* Upper Header Brand Logo */}
          <div className="mt-8 flex flex-col items-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-pink-200/50 mb-3"
              style={{
                background: `linear-gradient(to right, ${BRAND.colors.pink}, ${BRAND.colors.pinkDark})`,
                transform: `scale(${1.0 + Math.sin(frame / 15) * 0.05})`
              }}
            >
              <span className="text-white text-3xl font-extrabold">🌸</span>
            </div>
            <h1 
              className="text-2xl font-extrabold tracking-tight"
              style={{ 
                fontFamily: BRAND.fonts.heading,
                color: BRAND.colors.textSlate800 
              }}
            >
              Siklusio
            </h1>
          </div>

          {/* Premium Centered Loading Welcome Card */}
          <div className="w-full bg-white/70 backdrop-blur-md border border-pink-100 rounded-3xl p-6 shadow-md shadow-pink-100/50 mb-16 flex flex-col items-center">
            <div className="px-3 py-1 rounded-full bg-pink-50 border border-pink-200/30 text-[10px] font-bold text-pink-500 uppercase tracking-wider mb-3">
              Sahabat Terbaik
            </div>
            <h3 
              className="text-md font-bold text-slate-800 mb-2 leading-snug"
              style={{ fontFamily: BRAND.fonts.heading }}
            >
              Selamat Datang, Bunda!
            </h3>
            <p 
              className="text-xs text-slate-600 leading-relaxed min-h-[48px]"
              style={{ fontFamily: BRAND.fonts.body }}
            >
              {welcomeText}
            </p>
          </div>
        </div>
      </PhoneMockup>
    </SceneLayout>
  );
};
