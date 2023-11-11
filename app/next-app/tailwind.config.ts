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
        "1/2": "110px",
      },
      fontFamily: {
        body: "Work Sans",
        display: "Libre Baskerville",
      },
      height: {
        "4/5": "80%",
        "almost-full": "calc(100% - 16px)",
      },
      gridTemplateRows: {
        "fixed-10": "2.5rem",
      },
      gridTemplateColumns: {
        labeled: "minmax(60px, 200px) minmax(120px, 1fr)",
      },
      minWidth: { px: "1px" },
      width: {
        "almost-full": "calc(100% - 64px)",
        "almost-4/10": "calc(40% - 16px)",
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
        "dark-white": "#eee",
        "less-dark-white": "#F2F2F2",
        "white-transparent": "rgba(255, 255, 255, 0.75)",
        gray: "#5E5E5E",
        "dark-gray": "#404040",
        "super-dark-gray": "#242424",
        black: "#1A1A1A",
        "black-transparent": "rgba(26, 26, 26, 0.84)",
        red: "#FF3530",
      },
    },
  },
  plugins: [],
};
export default config;
