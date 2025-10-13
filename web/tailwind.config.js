/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {},
  },
  safelist: [
    // Pills & badges (explicit slash-opacity variants)
    "bg-emerald-800/40",
    "bg-orange-800/40",
    "bg-green-800/40",
    "bg-slate-800/40",
    "bg-slate-700/40",
    "bg-slate-700/60",
    "text-emerald-200",
    "text-orange-200",
    "text-green-200",
    "text-slate-200",
    "border-emerald-700",
    "border-orange-700",
    "border-green-700",
    "border-slate-700",
  ],
  plugins: [],
};
