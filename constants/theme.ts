/**
 * "Cardly" Theme Constants
 * Matches the Tailwind Config: Deep Blue, Orange, Snow White.
 */

const tintColorLight = "#0F172A"; // Deep Slate for selected tabs in Light Mode
const tintColorDark = "#F97316"; // Penguin Orange for selected tabs in Dark Mode

export const Colors = {
  light: {
    text: "#0F172A", // text-text-main-light
    background: "#F8FAFC", // bg-page-light
    tint: tintColorLight,
    icon: "#64748B", // text-text-muted-light
    tabIconDefault: "#64748B",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#F8FAFC", // text-text-main-dark
    background: "#1E293B", // bg-page-dark
    tint: tintColorDark,
    icon: "#94A3B8", // text-text-muted-dark
    tabIconDefault: "#94A3B8",
    tabIconSelected: tintColorDark,
  },
};

/**
 * Font Families
 * Use these reference names in your StyleSheet styles if not using Tailwind.
 */
export const Fonts = {
  heading: "Poppins",
  body: "Inter",
  // You can keep the platform logic if you want fallbacks,
  // but since you are loading Google Fonts, simple strings work best:
  sans: "Inter",
  serif: "Poppins",
};
