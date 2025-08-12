import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    fontFamily: { sans: ["var(--font-inter)"] },
    extend: {
      colors: {
        brand: { 500: "#7C4DFF", 600: "#673AB7" },
        primary: { 400: "#A78BFA", 500: "#8B5CF6" },
        secondary: { 400: "#F0ABFC", 500: "#D946EF" },
      },
      keyframes: {
        pop: {
          "0%": { transform: "translate(-50%,10px) scale(.96)", opacity: "0" },
          "100%": { transform: "translate(-50%,0) scale(1)", opacity: "1" },
        },
      },
      animation: { pop: "pop 300ms ease-out forwards" },
    },
  },
  plugins: [],
} satisfies Config;
