import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211d",
        paper: "#f7f4ed",
        jade: "#146b53",
        mint: "#dff2e9",
        amber: "#f5c563",
      },
      boxShadow: {
        card: "0 18px 55px rgba(23, 33, 29, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
