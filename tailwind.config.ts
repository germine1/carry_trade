import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#18212f",
        panel: "#f7f8fa",
        line: "#d9dee7",
        positive: "#1f8a5b",
        warning: "#b76b14",
        danger: "#b3261e",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 12px 30px rgba(20, 31, 48, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
