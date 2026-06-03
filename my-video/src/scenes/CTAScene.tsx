import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SceneLayout } from "../components/SceneLayout";
import { PhoneMockup } from "../components/PhoneMockup";
import { BRAND } from "../constants/brand";

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const transition = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  const scale = interpolate(transition, [0, 1], [0.95, 0.85]);
  const y = interpolate(transition, [0, 1], [40, 240]);

  // Badge CTA entrance transitions
  const badgeEntrance = spring({
    frame: frame - 20,
    fps,
    config: { damping: 14 },
  });

  const playStoreEntrance = spring({
    frame: frame - 35,
    fps,
    config: { damping: 14 },
  });

  return (
    <SceneLayout 
      headline="Waktunya Promil Hangat"
      subHeadline="Sahabat Terbaik di Setiap Fase Kewanitaanmu 🌸"
    >
      {/* Floating Ambient Halo Ring in background behind phone */}
      <div 
        className="absolute w-[450px] h-[450px] rounded-full border-4 border-dashed border-pink-400/20 z-0 pointer-events-none animate-spin"
        style={{
          top: "550px",
          animationDuration: "25s",
        }}
      />

      {/* Floating Cards / Content Overlay Luar HP */}
      <div className="absolute inset-x-8 top-[360px] flex flex-col items-center z-20 gap-5 select-none">
        {/* Pricing Badge Lifetime */}
        <div 
          className="w-full bg-white/80 backdrop-blur-md border border-pink-100 rounded-3xl p-5 shadow-lg shadow-pink-100/50 flex flex-col items-center text-center"
          style={{
            transform: `scale(${badgeEntrance}) translateY(${(1 - badgeEntrance) * 40}px)`,
            opacity: badgeEntrance,
          }}
        >
          <span className="px-3 py-1 bg-pink-100 rounded-full border border-pink-200/50 text-[10px] font-bold text-pink-600 uppercase tracking-widest mb-2">Siklusio Premium</span>
          <h3 className="text-xl font-bold text-slate-800 leading-snug" style={{ fontFamily: BRAND.fonts.heading }}>Patungan Operasional Sekali</h3>
          <p className="text-[28px] font-extrabold text-pink-500 mt-1" style={{ fontFamily: BRAND.fonts.heading }}>
            Rp 37.000
          </p>
          <span className="text-[11px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">Aktif Selamanya / Tanpa Iklan</span>
        </div>

        {/* Download Badges & QR Code */}
        <div 
          className="w-full flex justify-center items-center gap-5"
          style={{
            transform: `scale(${playStoreEntrance}) translateY(${(1 - playStoreEntrance) * 30}px)`,
            opacity: playStoreEntrance,
          }}
        >
          {/* Fake QR code card */}
          <div className="bg-white p-3 rounded-2xl border border-pink-100/30 shadow-md flex items-center justify-center">
            <svg className="w-16 h-16 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="2" width="8" height="8" rx="1" />
              <rect x="14" y="2" width="8" height="8" rx="1" />
              <rect x="2" y="14" width="8" height="8" rx="1" />
              <rect x="14" y="14" width="3" height="3" />
              <rect x="19" y="14" width="3" height="3" />
              <rect x="14" y="19" width="3" height="3" />
              <rect x="19" y="19" width="3" height="3" />
              <circle cx="6" cy="6" r="1.5" fill="currentColor" />
              <circle cx="18" cy="6" r="1.5" fill="currentColor" />
              <circle cx="6" cy="18" r="1.5" fill="currentColor" />
            </svg>
          </div>
          
          <div className="flex flex-col gap-2 shrink-0">
            {/* Play Store */}
            <div className="bg-slate-900 border border-slate-700/50 px-4 py-2 rounded-xl flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div className="flex flex-col text-left">
                <span className="text-[8px] text-slate-400 font-semibold uppercase leading-none">Get it on</span>
                <span className="text-[11px] text-white font-extrabold leading-none mt-1">Google Play</span>
              </div>
            </div>
            {/* App Store */}
            <div className="bg-slate-900 border border-slate-700/50 px-4 py-2 rounded-xl flex items-center gap-2">
              <span className="text-lg">🍏</span>
              <div className="flex flex-col text-left">
                <span className="text-[8px] text-slate-400 font-semibold uppercase leading-none">Download on the</span>
                <span className="text-[11px] text-white font-extrabold leading-none mt-1">App Store</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Phone floating */}
      <div className="z-10 absolute inset-x-0 bottom-0 flex justify-center">
        <PhoneMockup scale={scale} y={y}>
          <div className="flex-1 bg-gradient-to-b from-[#fdf2f8] to-[#ffffff] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-pink-500 flex items-center justify-center text-white text-xl shadow-lg mb-3">🌸</div>
            <h2 className="text-md font-bold text-slate-800" style={{ fontFamily: BRAND.fonts.heading }}>Siklusio</h2>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[80%]">Sahabat Terbaik di Setiap Fase Kewanitaanmu</p>
          </div>
        </PhoneMockup>
      </div>
    </SceneLayout>
  );
};
