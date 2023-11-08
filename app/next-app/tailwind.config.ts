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
      },
      lineHeight: {
        header: "72px",
      },
      inset: {
        header: "60px",
      },
      padding: {
        "half-header": "30px",
      },
      colors: {
        "dark-white": "#eee",
        "less-dark-white": "#F2F2F2",
        "super-dark-grey": "#242424",
        black: "#1A1A1A",
        red: "#FF3530",
      },
    },
  },
  plugins: [],
};
export default config;
