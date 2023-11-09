import type { Config } from "tailwindcss";

const headerHeight = 40;

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
      fontFamily: {
        body: "Work Sans",
        display: "Libre Baskerville",
      },
      height: {
        header: `${headerHeight}px`,
        "2-header": `${headerHeight * 2}px`,
        "minus-header": `calc(100vh - ${headerHeight}px)`,
        "7/10": "70%",
        "almost-full": "calc(100% - 16px)",
      },
      gridTemplateRows: {
        "fixed-10": "2.5rem",
      },
      gridTemplateColumns: {
        labeled: "minmax(60px, 180px) minmax(120px, 1fr)",
      },
      minWidth: { px: "1px" },
      width: {
        "almost-full": "calc(100% - 64px)",
        "almost-4/10": "calc(40% - 16px)",
        "6/10": "60%",
      },
      lineHeight: {
        header: `${headerHeight}px`,
      },
      inset: {
        header: `${headerHeight}px`,
        "4/10": "40%",
        "7/10": "70%",
      },
      fontSize: {
        header: [`${headerHeight / 2}px`, `${headerHeight}px`],
        "header-title": [`${(2 * headerHeight) / 3}px`, `${headerHeight}px`],
      },
      padding: {
        "half-header": `${headerHeight / 2}px`,
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
