import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff8f1",
          100: "#ffecd9",
          200: "#ffd5ae",
          300: "#ffb879",
          400: "#ff8f40",
          500: "#ff6b1a",
          600: "#e85010",
          700: "#c03b0d",
          800: "#9a3013",
          900: "#7c2b13",
          950: "#431207",
        },
        dark: {
          DEFAULT: "#1a1a1a",
          50: "#f5f5f5",
          100: "#e8e8e8",
          800: "#2d2d2d",
          900: "#1a1a1a",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-playfair)", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
