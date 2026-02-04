"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "ops-dashboard-theme";

function getStoredTheme(): Theme {
    if (typeof window === "undefined") return "system";

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
        return saved;
    }
    return "system";
}

function applyTheme(theme: Theme) {
    if (typeof window === "undefined") return;

    const root = document.documentElement;

    if (theme === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", prefersDark);
    } else {
        root.classList.toggle("dark", theme === "dark");
    }
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>("system");
    const [mounted, setMounted] = useState(false);

    // Load from localStorage and apply on mount
    useEffect(() => {
        const stored = getStoredTheme();
        setThemeState(stored);
        applyTheme(stored);
        setMounted(true);

        // Listen for system preference changes
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            const currentTheme = getStoredTheme();
            if (currentTheme === "system") {
                applyTheme("system");
            }
        };
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem(STORAGE_KEY, newTheme);
        applyTheme(newTheme);
    }, []);

    const resolvedTheme = mounted
        ? (theme === "system"
            ? (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
            : theme)
        : "light";

    return {
        theme,
        setTheme,
        resolvedTheme,
        mounted,
    };
}
