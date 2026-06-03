import React from "react";
import { useCurrentFrame } from "remotion";

export const BrandBackground: React.FC = () => {
  const frame = useCurrentFrame();

  // Floating trigonometry offsets
  const blob1X = Math.sin(frame / 75) * 80;
  const blob1Y = Math.cos(frame / 60) * 100;
  const blob2X = Math.cos(frame / 80) * 90;
  const blob2Y = Math.sin(frame / 65) * 70;

  return (
    <div 
      className="absolute inset-0 overflow-hidden -z-20 flex items-center justify-center animate-none"
      style={{
        background: "linear-gradient(135deg, #fdf2f8 0%, #faf5ff 50%, #f0fdfa 100%)"
      }}
    >
      {/* Soft Pink Blob */}
      <div 
        className="absolute w-[800px] h-[800px] rounded-full bg-pink-300/20 blur-[130px] transition-transform"
        style={{
          transform: `translate(${blob1X}px, ${blob1Y}px) scale(${1.0 + Math.sin(frame / 120) * 0.1})`,
          top: "10%",
          left: "-20%",
        }}
      />

      {/* Soft Teal Blob */}
      <div 
        className="absolute w-[900px] h-[900px] rounded-full bg-teal-300/20 blur-[150px] transition-transform"
        style={{
          transform: `translate(${blob2X}px, ${blob2Y}px) scale(${1.1 + Math.cos(frame / 100) * 0.1})`,
          bottom: "10%",
          right: "-20%",
        }}
      />
    </div>
  );
};
