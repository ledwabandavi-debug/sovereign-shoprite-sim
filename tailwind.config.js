/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shoprite: { red: "#E30613", yellow: "#FFD200", slate: "#F4F4F4" },
        sixty60: "#0a2a5e",
        sovereign: { gold: "#c5a059", goldlite: "#e8c97a", obsidian: "#0b0c10", obsidian2: "#14161b" },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        pulse: "0 0 30px rgba(255,210,0,0.6)",
      },
    },
  },
  plugins: [],
};
