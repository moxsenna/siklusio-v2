# Siklusio Portrait Video Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a modular, 35-second, 30 FPS, 1080x1920 portrait video demo in Remotion highlighting key Siklusio v2 app features (Dashboard, WhatsApp Husband Message, Habit Coach, TWW Sanctuary) inside an animated premium phone mockup.

**Architecture:** A modular React structure where each of the 6 scenes resides in its own component inside `src/scenes/`. Each scene encapsulates its own layout, typography, visual effects, and dynamically interpolates its own `<PhoneMockup>` component with spring camera properties (`scale`, `translateX`, `translateY`, `rotateZ`, `rotateY`, `opacity`) based on the scene's local frames.

**Tech Stack:** React 19, Remotion 4, Tailwind CSS v4 (@remotion/tailwind-v4), TypeScript.

---

## Technical Preparations & File Structure Map

We will create/modify the following files in order:
1. `my-video/src/constants/brand.ts` (Brand variables & copywriting)
2. `my-video/src/index.css` (Tailwind & custom fonts loader)
3. `my-video/src/components/BrandBackground.tsx` (Living floating gradient background)
4. `my-video/src/components/PhoneMockup.tsx` (Premium animated phone shell)
5. `my-video/src/components/SceneLayout.tsx` (Universal scene content wrapper)
6. `my-video/src/scenes/HookScene.tsx` (Intro scene: Frame 0-150)
7. `my-video/src/scenes/DashboardScene.tsx` (Dashboard cycle tracking: Frame 150-330)
8. `my-video/src/scenes/HusbandMessageScene.tsx` (WA Husband Message: Frame 330-510)
9. `my-video/src/scenes/HabitScene.tsx` (AI Habit Coach: Frame 510-690)
10. `my-video/src/scenes/TWWSanctuaryScene.tsx` (TWW Breathing & AI Letter: Frame 690-870)
11. `my-video/src/scenes/CTAScene.tsx` (Outro premium pricing: Frame 870-1050)
12. `my-video/src/Composition.tsx` (Sequence binder with Series)
13. `my-video/src/Root.tsx` (Remotion root setup)

---

### Task 1: Brand Configuration Setup

**Files:**
- Create: `my-video/src/constants/brand.ts`

- [ ] **Step 1: Write the brand configuration file**  
  Write the constant variables defining colors, typography, copywriting, and timeline parameters.

  Code:
  ```typescript
  export const BRAND = {
    colors: {
      pink: '#ec4899',
      pinkDark: '#db2777',
      violet: '#9333ea',
      teal: '#14b8a6',
      bgGradients: ['#fdf2f8', '#faf5ff', '#f0fdfa'],
      surface: '#ffffff',
      textSlate800: '#1e293b',
      textSlate600: '#475569',
    },
    fonts: {
      heading: "'Outfit', sans-serif",
      body: "'Plus Jakarta Sans', sans-serif",
    },
  };

  export const TIMELINE = {
    fps: 30,
    width: 1080,
    height: 1920,
    scenes: {
      hook: { duration: 5 * 30, start: 0, end: 150 },
      dashboard: { duration: 6 * 30, start: 150, end: 330 },
      husbandMessage: { duration: 6 * 30, start: 330, end: 510 },
      habit: { duration: 6 * 30, start: 510, end: 690 },
      tww: { duration: 6 * 30, start: 690, end: 870 },
      cta: { duration: 6 * 30, start: 870, end: 1050 },
    },
  };
  ```

- [ ] **Step 2: Commit Task 1**  
  Add and commit `brand.ts`.

---

### Task 2: CSS Stylesheets & Typography Loading

**Files:**
- Modify: `my-video/src/index.css`

- [ ] **Step 1: Import Google Fonts into global CSS**  
  Load 'Outfit' and 'Plus Jakarta Sans' fonts and configure global classes.

  Target Content to replace inside `my-video/src/index.css`:
  ```css
  @import "tailwindcss";
  ```

  Replacement Content:
  ```css
  @import "tailwindcss";

  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  body {
    background-color: #fafafa;
    overflow: hidden;
  }
  ```

- [ ] **Step 2: Verify linting of CSS**  
  Ensure the imports are resolved without issues.

- [ ] **Step 3: Commit Task 2**  
  Add and commit `index.css`.

---

### Task 3: Living Ambient Background

**Files:**
- Create: `my-video/src/components/BrandBackground.tsx`

- [ ] **Step 1: Write the dynamic background component**  
  Write `BrandBackground.tsx` which uses floating colored nodes in the background that drift slowly using trigonometry based on `useCurrentFrame()`.

  Code:
  ```tsx
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
        className="absolute inset-0 overflow-hidden -z-20 flex items-center justify-center"
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
  ```

- [ ] **Step 2: Commit Task 3**  
  Add and commit `BrandBackground.tsx`.

---

### Task 4: Premium Animated Phone Mockup Shell

**Files:**
- Create: `my-video/src/components/PhoneMockup.tsx`

- [ ] **Step 1: Write the Premium Phone Mockup component**  
  Create the 3D-floating iPhone-like physical screen container with battery, Wifi, Dynamic Island, and Home bar. It receives standard transformation factors.

  Code:
  ```tsx
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
  ```

- [ ] **Step 2: Commit Task 4**  
  Add and commit `PhoneMockup.tsx`.

---

### Task 5: Scene Canvas Layout Wrapper

**Files:**
- Create: `my-video/src/components/SceneLayout.tsx`

- [ ] **Step 1: Write the Universal Scene Layout wrapper**  
  Create `SceneLayout.tsx` to standardize the heading transition and layout spacing of texts inside the 9:16 portrait viewport.

  Code:
  ```tsx
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
  ```

- [ ] **Step 2: Commit Task 5**  
  Add and commit `SceneLayout.tsx`.

---

### Task 6: Scene 1 - Intro Hook

**Files:**
- Create: `my-video/src/scenes/HookScene.tsx`

- [ ] **Step 1: Write the HookScene component**  
  Create the first scene showing a beautiful splash screen loading card with breathing logo animations.

  Code:
  ```tsx
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
  ```

- [ ] **Step 2: Commit Task 6**  
  Add and commit `HookScene.tsx`.

---

### Task 7: Scene 2 - Dashboard Cycle Tracking

**Files:**
- Create: `my-video/src/scenes/DashboardScene.tsx`

- [ ] **Step 1: Write the DashboardScene component**  
  Create the scene demonstrating the AI cycle logging and circular gauge component with a clean entering spring motion.

  Code:
  ```tsx
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
                <svg className="w-full h-full transform -rotate-95" viewBox="0 0 100 100">
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
  ```

- [ ] **Step 2: Commit Task 7**  
  Add and commit `DashboardScene.tsx`.

---

### Task 8: Scene 3 - Husband Message WhatsApp Bridge

**Files:**
- Create: `my-video/src/scenes/HusbandMessageScene.tsx`

- [ ] **Step 1: Write the HusbandMessageScene component**  
  Create the WhatsApp link simulation screen, demonstrating the single click action sending to WhatsApp interface with spring physics.

  Code:
  ```tsx
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
                    <h4 className="text-xs font-bold">Papap Suami 💖</h4>
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
  ```

- [ ] **Step 2: Commit Task 8**  
  Add and commit `HusbandMessageScene.tsx`.

---

### Task 9: Scene 4 - Habit Coach Checklist

**Files:**
- Create: `my-video/src/scenes/HabitScene.tsx`

- [ ] **Step 1: Write the HabitScene component**  
  Create the checklist items page, with successive green ticking checks popping in with delay, updating the progress bar.

  Code:
  ```tsx
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
  ```

- [ ] **Step 2: Commit Task 9**  
  Add and commit `HabitScene.tsx`.

---

### Task 10: Scene 5 - TWW Sanctuary Calm breathing & AI Calm Letter

**Files:**
- Create: `my-video/src/scenes/TWWSanctuaryScene.tsx`

- [ ] **Step 1: Write the TWWSanctuaryScene component**  
  Create the breathing mindfulness scene featuring a beautiful pulsing circle and gradual fading AI Letter lines.

  Code:
  ```tsx
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
  ```

- [ ] **Step 2: Commit Task 10**  
  Add and commit `TWWSanctuaryScene.tsx`.

---

### Task 11: Scene 6 - CTA Outro & Price Option

**Files:**
- Create: `my-video/src/scenes/CTAScene.tsx`

- [ ] **Step 1: Write the CTAScene component**  
  Create the final scene showing beautiful life-time pricing, Play Store badges, and app mockup positioned beautifully.

  Code:
  ```tsx
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
  ```

- [ ] **Step 2: Commit Task 11**  
  Add and commit `CTAScene.tsx`.

---

### Task 12: Sequence Coordinator (Composition.tsx)

**Files:**
- Modify: `my-video/src/Composition.tsx`

- [ ] **Step 1: Write Composition.tsx to sequence scenes**  
  Connect all modular scenes using `<Series>` inside `Composition.tsx`.

  Target Content to replace inside `my-video/src/Composition.tsx`:
  ```tsx
  export const MyComposition = () => {
    return null;
  };
  ```

  Replacement Content:
  ```tsx
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
  ```

- [ ] **Step 2: Commit Task 12**  
  Add and commit `Composition.tsx`.

---

### Task 13: Main Root Registry Configuration

**Files:**
- Modify: `my-video/src/Root.tsx`

- [ ] **Step 1: Write Root.tsx to register the Composition**  
  Update `Root.tsx` to mount the brand-specific composition with 35s duration, 30fps, and 1080x1920 portrait dimensions.

  Target Content to replace inside `my-video/src/Root.tsx`:
  ```tsx
  import "./index.css";
  import { Composition } from "remotion";
  import { MyComposition } from "./Composition";
  
  export const RemotionRoot: React.FC = () => {
    return (
      <>
        <Composition
          id="MyComp"
          component={MyComposition}
          durationInFrames={60}
          fps={30}
          width={1280}
          height={720}
        />
      </>
    );
  };
  ```

  Replacement Content:
  ```tsx
  import "./index.css";
  import { Composition } from "remotion";
  import { SiklusioDemoPortrait } from "./Composition";
  import { TIMELINE } from "./constants/brand";
  
  export const RemotionRoot: React.FC = () => {
    return (
      <>
        <Composition
          id="SiklusioDemoPortrait"
          component={SiklusioDemoPortrait}
          durationInFrames={TIMELINE.scenes.cta.end} // 1050 frames
          fps={TIMELINE.fps}
          width={TIMELINE.width}
          height={TIMELINE.height}
        />
      </>
    );
  };
  ```

- [ ] **Step 2: Verify compiling and previewing via Remotion**  
  Ensure there are no build, syntax or path errors.

- [ ] **Step 3: Commit Task 13**  
  Add and commit `Root.tsx`.

---

## Verification & Build Validation Plan

### Local Testing Command
To verify layout correctness and animation curves, start Remotion Studio:
```powershell
npm --prefix my-video run dev
```

To render the complete 1050 frames video sequence locally and verify it exports successfully without errors:
```powershell
npx --prefix my-video remotion render SiklusioDemoPortrait out/siklusio_demo_portrait.mp4
```
Expected output: A successful render report indicating `out/siklusio_demo_portrait.mp4` is compiled, and checking the size matches the expected MP4 format.
