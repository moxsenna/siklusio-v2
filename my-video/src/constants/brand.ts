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
