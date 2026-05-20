/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tentukan path ke semua komponen React Native Anda
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#ec4899",
        "on-primary": "#ffffff",
        background: "#fdf2f8", // pink-50
        "on-background": "#4a044e", // fuchsia-900
        surface: "#ffffff",
        "on-surface": "#701a75", // fuchsia-800
        "surface-variant": "#fce7f3", // pink-100
        "on-surface-variant": "#831843", // pink-900
        "outline-variant": "#fbcfe8", // pink-200
        "surface-container-low": "#fdf2f8",
        error: "#e11d48", // rose-600
        secondary: "#ccfbf1", // teal-100 (Masa Subur)
        "on-secondary": "#0f766e", // teal-700
        tertiary: "#14b8a6", // teal-500 (Ovulasi)
        "on-tertiary": "#ffffff", // white
      }
    },
  },
  plugins: [],
};
