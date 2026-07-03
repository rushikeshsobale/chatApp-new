// Shared design tokens for the profile surface (ProfilePage and the modals
// it opens — EditProfile, etc.) so they stay visually consistent instead of
// each component inventing its own palette.
const tokens = {
  radius: { md: "10px", lg: "16px", xl: "22px", full: "9999px" },
  border: (dark) => `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
  surface: (dark) => (dark ? "#000000" : "#ffffff"),
  page: (dark) => (dark ? "#000000" : "#f3f4f8"),
  surfaceAlt: (dark) => (dark ? "#1c1c20" : "#f6f7fb"),
  text: (dark) => (dark ? "#f5f5f7" : "#111114"),
  textMuted: (dark) => (dark ? "#8e8e97" : "#6b7280"),
  accent: "#6366f1",
  accentSoft: "#8b5cf6",
  gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  accentBg: (dark) => (dark ? "rgba(99,102,241,0.16)" : "#EEF0FF"),
  accentText: (dark) => (dark ? "#B4B8FF" : "#4F46E5"),
  danger: "#E24B4A",
  success: "#1D9E75",
  warning: "#EF9F27",
  shadow: (dark) =>
    dark
      ? "0 1px 2px rgba(0,0,0,0.5), 0 12px 28px -8px rgba(0,0,0,0.55)"
      : "0 1px 2px rgba(16,24,40,0.04), 0 12px 28px -8px rgba(16,24,40,0.10)",
};

export default tokens;
