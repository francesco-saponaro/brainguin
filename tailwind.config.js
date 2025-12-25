/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class", // 👈 Enables the 'dark:' prefix logic
  theme: {
    extend: {
      colors: {
        // ---------------------------------------------------------
        // 1. BRAND COLORS (Constant - They don't change in Dark Mode)
        // ---------------------------------------------------------
        primary: "#0F172A", // Deep Slate (Logo, Headers)
        action: {
          DEFAULT: "#F97316", // Orange (Buttons)
          hover: "#EA580C", // Darker Orange (Pressed)
        },
        accent: "#38BDF8", // Blue (Links, Highlights)
        wood: "#A16207", // The Penguin's Sign

        // ---------------------------------------------------------
        // 2. BACKGROUNDS (The Surfaces)
        // Labeling: 'light' = Day Mode, 'dark' = Night Mode
        // ---------------------------------------------------------
        page: {
          light: "#F8FAFC", // Snow White
          dark: "#1E293B", // Deep Navy
        },
        card: {
          light: "#FFFFFF", // Pure White
          dark: "#334155", // Slate Grey
        },
        input: {
          light: "#F1F5F9", // Light Grey
          dark: "#1E293B", // Dark Slate
        },

        // ---------------------------------------------------------
        // 3. TEXT COLORS (Reading)
        // Labeling: 'main' = Primary Text, 'muted' = Secondary
        // ---------------------------------------------------------
        text: {
          // In Light Mode: Dark Text. In Dark Mode: White Text.
          main: {
            light: "#0F172A",
            dark: "#F8FAFC",
          },
          muted: {
            light: "#64748B",
            dark: "#94A3B8",
          },
        },

        // ---------------------------------------------------------
        // 4. FUNCTIONAL (Status Indicators)
        // ---------------------------------------------------------
        status: {
          hard: "#EF4444", // Red
          medium: "#EAB308", // Yellow
          easy: "#22C55E", // Green
        },
      },
      fontFamily: {
        heading: ["Poppins"],
        body: ["Inter"],
      },
    },
  },
  plugins: [],
};
