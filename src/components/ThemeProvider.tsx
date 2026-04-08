import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark" | "auto";

interface ThemeContextType {
  theme: Theme;
  actualTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Vrijeme kada se mijenja tema (u satima)
const LIGHT_START = 6;  // 06:00 - počinje svjetli režim
const DARK_START = 17;  // 17:00 - počinje tamni režim (zima)

const getThemeByTime = (): "light" | "dark" => {
  const hour = new Date().getHours();
  return hour >= LIGHT_START && hour < DARK_START ? "light" : "dark";
};

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider = ({
  children,
  defaultTheme = "auto",
  storageKey = "e-tickets-theme",
}: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey) as Theme;
      return stored || defaultTheme;
    }
    return defaultTheme;
  });

  const [actualTheme, setActualTheme] = useState<"light" | "dark">(getThemeByTime);

  useEffect(() => {
    const updateActualTheme = () => {
      let newActualTheme: "light" | "dark";
      
      if (theme === "auto") {
        newActualTheme = getThemeByTime();
      } else {
        newActualTheme = theme;
      }
      
      setActualTheme(newActualTheme);
      
      const root = document.documentElement;
      if (newActualTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    updateActualTheme();

    if (theme === "auto") {
      const interval = setInterval(updateActualTheme, 60000);
      return () => clearInterval(interval);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(storageKey, newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, actualTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeProvider;
