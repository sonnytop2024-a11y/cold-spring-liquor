import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { brand: { 500: "#ff6b1a", 600: "#e85010" } } } },
  plugins: [],
};

export default config;
