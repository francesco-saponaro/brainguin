/**
 * "Cardly" Theme Constants
 * Strictly mirrors the Tailwind/NativeWind configuration.
 */

export const Colors = {
  // Constants (Brand colors that don't change based on mode)
  brand: {
    primary: "#0F172A",
    action: "#F97316",
    actionHover: "#EA580C",
    accent: "#38BDF8",
    wood: "#A16207",
  },

  light: {
    background: "#F8FAFC", // page.light
    card: "#FFFFFF", // card.light
    input: "#F1F5F9", // input.light
    text: "#0F172A", // text.main.light
    textMuted: "#64748B", // text.muted.light
    tint: "#F97316", // Default action color
    icon: "#64748B",
    tabIconDefault: "#64748B",
    tabIconSelected: "#0F172A", // Deep Slate for light mode active tabs
  },

  dark: {
    background: "#1E293B", // page.dark
    card: "#334155", // card.dark
    input: "#1E293B", // input.dark
    text: "#F8FAFC", // text.main.dark
    textMuted: "#94A3B8", // text.muted.dark
    tint: "#F97316", // Orange for dark mode active tabs
    icon: "#94A3B8",
    tabIconDefault: "#94A3B8",
    tabIconSelected: "#F97316",
  },

  status: {
    hard: "#EF4444",
    medium: "#EAB308",
    easy: "#22C55E",
  },
};

export const Fonts = {
  heading: "Poppins",
  body: "Inter",
  sans: "Inter",
  serif: "Poppins",
};
