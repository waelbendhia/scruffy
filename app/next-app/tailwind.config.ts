import type { Config } from "tailwindcss";
//   background-position-x: 100%;
//   background-position-y: 130%;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        "spin-slow": "spin 2s linear infinite",
      },
      backgroundPosition: {
        "scruff-offset": "100% 130%",
      },
      backgroundSize: {
        "1/2": "6.25rem",
      },
      fontFamily: {
        body: "var(--font-work-sans)",
        display: "var(--font-libre-baskerville)",
      },
      height: {
        "4/5": "80%",
        "headless-screen": "calc(100vh - 2.5rem)",
        "almost-full": "calc(100% - 1rem)",
      },
      gridTemplateRows: {
        "fixed-10": "2.5rem",
        labeled: "minmax(3.75rem, 12.5rem) minmax(7.5rem, 1fr)",
      },
      gridTemplateColumns: {
        labeled: "minmax(3.75rem, 12.5rem) minmax(7.5rem, 1fr)",
        "artist-content": "1fr minmax(200px, 400px)",
      },
      minWidth: { px: "1px" },
      width: {
        "almost-full": "calc(100% - 4rem)",
        "almost-4/10": "calc(40% - 1rem)",
        "6/10": "60%",
      },
      lineHeight: {},
      inset: {
        "4/10": "40%",
        "7/10": "70%",
      },
      fontSize: {},
      padding: {},
      backgroundImage: {
        scruff: "url('/ScruffFace.png')",
      },
      colors: {
        "dark-white": "#eaeaea",
        "less-dark-white": "#F2F2F2",
        "white-transparent": "rgba(255, 255, 255, 0.75)",
        gray: "#5E5E5E",
        "dark-gray": "#404040",
        "super-dark-gray": "#242424",
        black: "#1A1A1A",
        "black-transparent": "rgba(26, 26, 26, 0.34)",
        red: "#FF3530",
      },
    },
  },
  plugins: [],
};
export default config;
