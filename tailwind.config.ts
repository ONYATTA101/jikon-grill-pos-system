import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ember: {
          50: "#fff7ed",
          100: "#ffedd5",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c"
        },
        charcoal: {
          900: "#18181b",
          800: "#27272a",
          700: "#3f3f46"
        },
        smoke: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4"
        },
        brass: {
          500: "#d6a73c",
          600: "#b88418"
        },
        leaf: {
          500: "#16a34a",
          600: "#15803d"
        }
      },
      boxShadow: {
        panel: "0 18px 45px rgba(24, 24, 27, 0.08)",
        lift: "0 24px 70px rgba(24, 24, 27, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
