import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SceneLayout } from "../components/SceneLayout";
import { PhoneMockup } from "../components/PhoneMockup";
import { BRAND } from "../constants/brand";

export const HusbandMessageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const transition = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  const scale = interpolate(transition, [0, 1], [0.95, 1.1]);
  const x = interpolate(transition, [0, 1], [0, 160]);
  const y = interpolate(transition, [0, 1], [40, 30]);
  const rotate = interpolate(transition, [0, 1], [0, -5]);

  // Simulated tap cursor coordinates & opacity
  const tapScale = spring({
    frame: frame - 45,
    fps,
    config: { damping: 10, stiffness: 200 },
  });

  const cursorOpacity = interpolate(frame, [15, 30, 60, 70], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cursorY = interpolate(frame, [15, 45], [400, 210], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cursorX = interpolate(frame, [15, 45], [100, 180], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // WhatsApp Popup overlay entrance
  const waEntrance = spring({
    frame: frame - 65,
    fps,
    config: { damping: 16, stiffness: 120 },
  });

  return (
    <SceneLayout 
      headline="Libatkan Suami Hangat"
      subHeadline="WhatsApp 2-Ketukan Saja 💬"
    >
      <PhoneMockup scale={scale} x={x} y={y} rotateZ={rotate}>
        {/* Inner Screen */}
        <div className="flex-1 bg-[#fff8fa] p-5 flex flex-col justify-start relative select-none">
          
          {/* Header Title */}
          <div className="mt-2 mb-5">
            <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">Jembatan Rasa</span>
            <h3 className="text-md font-bold text-slate-800 mt-0.5" style={{ fontFamily: BRAND.fonts.heading }}>Hubungkan Pasangan</h3>
          </div>

          {/* Message Template Cards */}
          <div className="flex flex-col gap-3 z-0">
            <div 
              className="w-full bg-white rounded-2xl p-4 border border-pink-100/50 flex justify-between items-center shadow-xs"
              style={{
                transform: frame >= 45 && frame <= 65 ? `scale(${1 - (tapScale * 0.05)})` : "none"
              }}
            >
              <div>
                <h4 className="text-xs font-bold text-slate-800 leading-tight">Kabar Masa Subur 🌸</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Template ramah ajak pulang awal</p>
              </div>
              <div className="px-2.5 py-1 bg-teal-50 rounded-full border border-teal-200/50 text-[9px] font-bold text-teal-600 uppercase">Kirim</div>
            </div>

            <div className="w-full bg-white rounded-2xl p-4 border border-pink-50/50 flex justify-between items-center opacity-60">
              <div>
                <h4 className="text-xs font-bold text-slate-800 leading-tight">Ajak Jalan Santai ☕</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Hilangkan penat berdua saja</p>
              </div>
              <div className="px-2.5 py-1 bg-slate-50 rounded-full border border-slate-200/50 text-[9px] font-bold text-slate-400 uppercase">Kirim</div>
            </div>
          </div>

          {/* Simulated Finger Click Cursor */}
          <div 
            className="absolute w-10 h-10 rounded-full border-2 border-pink-500/70 bg-pink-400/30 flex items-center justify-center z-10 pointer-events-none"
            style={{
              top: `${cursorY}px`,
              left: `${cursorX}px`,
              opacity: cursorOpacity,
              transform: `scale(${1 - (tapScale * 0.3)})`
            }}
          >
            <div className="w-3 h-3 rounded-full bg-pink-600/80" />
          </div>

          {/* Simulated WhatsApp Interface Pop-Up Overlay */}
          {frame >= 65 && (
            <div 
              className="absolute inset-0 bg-[#e5ddd5] flex flex-col justify-end z-20"
              style={{
                transform: `translateY(${(1 - waEntrance) * 800}px)`,
                opacity: waEntrance
              }}
            >
              {/* Simulated WA Header */}
              <div className="h-[48px] bg-[#075e54] px-4 flex items-center gap-3 text-white shrink-0 shadow-sm">
                <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-xs">🧔</div>
                <div>
                  <h4 className="text-xs font-bold text-white">Papap Suami 💖</h4>
                  <span className="text-[8px] text-slate-200/80">Online</span>
                </div>
              </div>

              {/* Simulated Chat Area */}
              <div className="flex-1 p-4 flex flex-col justify-end gap-2 overflow-hidden pb-8 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-contain">
                <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-xs p-3 self-end shadow-xs max-w-[85%] border border-[#cbeaa5]/50 flex flex-col">
                  <p className="text-[11px] text-slate-800 font-medium leading-relaxed">
                    Papap, hari ini masa subur Bunda nih. Pulang kantor nanti kita ngobrol santai berdua ya, no gadget time! 😉
                  </p>
                  <span className="text-[8px] text-slate-400 self-end mt-1">09:41 ✓✓</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </PhoneMockup>
    </SceneLayout>
  );
};
