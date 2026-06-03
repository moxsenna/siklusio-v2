import React from "react";
import { BRAND } from "../constants/brand";

interface PhoneMockupProps {
  scale?: number;
  x?: number;
  y?: number;
  rotateZ?: number;
  rotateY?: number;
  opacity?: number;
  children: React.ReactNode;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  scale = 1,
  x = 0,
  y = 0,
  rotateZ = 0,
  rotateY = 0,
  opacity = 1,
  children
}) => {
  return (
    <div
      className="relative transition-all duration-75 ease-out select-none"
      style={{
        width: "410px",
        height: "830px",
        transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotateZ}deg) rotateY(${rotateY}deg)`,
        transformStyle: "preserve-3d",
        perspective: 1000,
        opacity: opacity,
      }}
    >
      {/* Physical Shadow */}
      <div 
        className="absolute inset-0 rounded-[48px] bg-pink-900/10 blur-xl pointer-events-none -z-10"
        style={{
          transform: "translate(15px, 35px) scale(0.97)"
        }}
      />

      {/* Outer Bezel Box */}
      <div 
        className="w-full h-full border-[12px] border-slate-900 bg-slate-900 rounded-[48px] relative overflow-hidden shadow-2xl flex flex-col"
        style={{
          boxShadow: "inset 0 0 10px rgba(255,255,255,0.15), 0 25px 50px -12px rgba(236,72,153,0.15)"
        }}
      >
        {/* Front Screen Overlay Glass Reflection */}
        <div className="absolute inset-0 pointer-events-none z-30 bg-gradient-to-tr from-white/0 via-white/5 to-white/15 rounded-[36px]" />

        {/* Top Status Bar (Wifi, Signal, Clock, Battery) */}
        <div className="h-[48px] px-8 bg-white z-20 flex justify-between items-center relative shrink-0">
          {/* Time */}
          <span 
            className="text-[14px] font-bold text-slate-800 tracking-tight"
            style={{ fontFamily: BRAND.fonts.heading }}
          >
            09:41
          </span>

          {/* Dynamic Island */}
          <div className="absolute left-1/2 -translate-x-1/2 w-[110px] h-[30px] bg-black rounded-full flex items-center justify-center z-40" />

          {/* Icons */}
          <div className="flex items-center gap-1.5 text-slate-800">
            {/* Signal */}
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M2 22h20V2z" opacity="0.3" />
              <path d="M2 22h14V8z" />
            </svg>
            {/* Wifi */}
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 21l-12-14.3c.3-.3 4.8-4 12-4s11.7 3.7 12 4z" />
            </svg>
            {/* Battery */}
            <div className="w-6 h-3 border border-current rounded-sm p-0.5 flex items-center relative">
              <div className="h-full w-4/5 bg-current rounded-2xs" />
              <div className="absolute -right-[3px] top-[3px] w-[2px] h-[4px] bg-current rounded-r-3xs" />
            </div>
          </div>
        </div>

        {/* Safe Screen Content Area */}
        <div className="flex-1 w-full rounded-b-[36px] overflow-hidden bg-white relative flex flex-col">
          {children}
        </div>

        {/* Bottom Home Indicator Line */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[130px] h-[5px] bg-slate-800/80 rounded-full z-20" />
      </div>
    </div>
  );
};
