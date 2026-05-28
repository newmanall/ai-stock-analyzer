import { useState, useCallback } from "react";

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("dashboardTheme") || "light");

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const isDark = theme === "dark";

  return { theme, setTheme, toggleTheme, isDark };
}
