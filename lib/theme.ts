export type ThemeColor = "indigo" | "black";

export const THEME_COLORS: Record<ThemeColor, string> = {
  indigo: "indigo",
  black: "black",
};

export const THEME_COLOR_NAMES: Record<ThemeColor, string> = {
  indigo: "Indigo",
  black: "Black",
};

export const DEFAULT_THEME: ThemeColor = "indigo";

export const THEME_STORAGE_KEY = "dod-platform-theme-color";
