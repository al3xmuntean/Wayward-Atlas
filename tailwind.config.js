/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Calibri", "Candara", "Segoe UI", "Optima", "Arial", "sans-serif"],
      },
      colors: {
        olive: {
          50: "#f6f8f2",
          100: "#ebf0e2",
          200: "#d7e2c5",
          300: "#b9cca0",
          400: "#9ab379",
          500: "#7d9957",
          600: "#627c40",
          700: "#556b2f",
          800: "#3f4e2c",
          900: "#2d3a18",
          950: "#141a0e",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "hsl(var(--border))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(107, 142, 35, 0.45)",
        "glow-olive": "0 0 30px -5px rgba(125, 153, 87, 0.45)",
      },
    },
  },
  plugins: [],
};
