import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        body: "Work Sans",
        display: "Libre Baskerville",
      },
      height: {
        header: "60px",
        "2-header": "120px",
        "minus-header": "calc(100vh - 60px)",
        "7/10": "70%",
        "almost-full": "calc(100% - 16px)",
      },
      gridTemplateRows: {
        "fixed-10": "2.5rem",
      },
      minWidth: { px: "1px" },
      width: {
        "almost-full": "calc(100% - 64px)",
        "almost-4/10": "calc(40% - 16px)",
        "6/10": "60%",
      },
      lineHeight: {
        header: "60px",
      },
      inset: {
        header: "60px",
        "4/10": "40%",
        "7/10": "70%",
      },
      padding: {
        "half-header": "30px",
      },
      colors: {
        "dark-white": "#eee",
        "less-dark-white": "#F2F2F2",
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
