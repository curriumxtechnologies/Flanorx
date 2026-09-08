    import React, { createContext, useState, useEffect, useContext } from "react";

    const ThemeContext = createContext();

    export const ThemeProvider = ({ children }) => {
    const getInitialTheme = () => {
        const saved = localStorage.getItem("flanorx-theme");
        if (saved === "light" || saved === "dark") return saved;
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
        return "light";
    };

    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        const html = document.documentElement;
        
        // Remove both classes, then add the correct one
        html.classList.remove("light", "dark");
        html.classList.add(theme);
        
        // Also set a data attribute for CSS fallback
        html.setAttribute("data-theme", theme);
        
        localStorage.setItem("flanorx-theme", theme);
        console.log("🌓 Theme applied:", theme, "Class list:", html.className);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    };

    const setSystemTheme = () => {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setTheme(prefersDark ? "dark" : "light");
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setSystemTheme, isDark: theme === "dark" }}>
        {children}
        </ThemeContext.Provider>
    );
    };

    export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used within ThemeProvider");
    return context;
    };