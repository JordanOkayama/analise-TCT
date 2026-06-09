import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        academy: {
          ink: "#071418",
          panel: "#0b1d23",
          line: "#1e3a43",
          blue: "#0f2f3f",
          teal: "#5ee0bb",
          gold: "#f3c969",
          red: "#ef6b73"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(94, 224, 187, .16), 0 18px 50px rgba(0, 0, 0, .28)"
      }
    }
  },
  plugins: []
} satisfies Config;

