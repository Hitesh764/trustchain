/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe7ff",
          200: "#bcd2ff",
          300: "#8fb3ff",
          400: "#5c8bff",
          500: "#3566f2",
          600: "#2549d6",
          700: "#1f3aab",
          800: "#1e3389",
          900: "#1c2d6e",
        },
        success: {
          50: "#eafbf1",
          100: "#d1f5e0",
          300: "#7fe3ad",
          500: "#22b573",
          600: "#189259",
          700: "#147448",
        },
        danger: {
          50: "#fdecec",
          100: "#f9d3d3",
          300: "#ee9494",
          500: "#df4b4b",
          600: "#c23b3b",
        },
      },
      fontFamily: {
        sans: ["'Segoe UI'", "system-ui", "-apple-system", "sans-serif"],
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "fade-in": {
          from: { opacity: 0, transform: "translateY(4px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        "fade-in": "fade-in .25s ease-out",
      },
      backgroundImage: {
        "brand-glow":
          "radial-gradient(60% 60% at 20% 10%, rgba(53,102,242,0.18), transparent), radial-gradient(50% 50% at 90% 30%, rgba(34,181,115,0.14), transparent)",
      },
    },
  },
  plugins: [],
};
