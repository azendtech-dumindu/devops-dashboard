"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

export const STORAGE_KEY = "ops-dashboard-visible-modules";

export const allModules = [
    { id: "home", name: "Executive Summary", href: "/", required: true },
    { id: "projects", name: "Projects", href: "/projects", required: false },
    { id: "tasks", name: "Task Allocations", href: "/task-allocations", required: false },
    { id: "spend", name: "Cloud Spend", href: "/cloud-spend", required: false },
    { id: "azure", name: "Azure Resources", href: "/azure", required: false },
    { id: "radar", name: "Tech Radar", href: "/radar", required: false },
];

// Map href to module ID for looking up visibility
export const hrefToModuleId: Record<string, string> = {
    "/": "home",
    "/projects": "projects",
    "/task-allocations": "tasks",
    "/cloud-spend": "spend",
    "/azure": "azure",
    "/radar": "radar",
};

// Get default module IDs
const defaultModuleIds = allModules.map(m => m.id);

// Shared state for cross-component sync
let listeners: Set<() => void> = new Set();
let currentModules: string[] = [...defaultModuleIds];

function getSnapshot(): string[] {
    return currentModules;
}

function getServerSnapshot(): string[] {
    return defaultModuleIds;
}

function subscribe(callback: () => void): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

function emitChange() {
    listeners.forEach(listener => listener());
}

function loadFromStorage(): string[] {
    if (typeof window === "undefined") return defaultModuleIds;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Always include required modules
            const moduleSet = new Set<string>(parsed);
            allModules.filter(m => m.required).forEach(m => moduleSet.add(m.id));
            return [...moduleSet];
        } catch {
            return defaultModuleIds;
        }
    }
    return defaultModuleIds;
}

function saveToStorage(modules: string[]) {
    currentModules = modules;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
    emitChange();
}

// Initialize from storage on first load
let initialized = false;

export function useModuleVisibility() {
    const modules = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const [mounted, setMounted] = useState(false);

    // Load from localStorage on mount (only once globally)
    useEffect(() => {
        if (!initialized) {
            initialized = true;
            currentModules = loadFromStorage();
            emitChange();
        }
        setMounted(true);
    }, []);

    const visibleModules = new Set(modules);

    const toggleModule = useCallback((moduleId: string) => {
        const module = allModules.find(m => m.id === moduleId);
        if (module?.required) return;

        const newModules = visibleModules.has(moduleId)
            ? modules.filter(id => id !== moduleId)
            : [...modules, moduleId];

        saveToStorage(newModules);
    }, [modules, visibleModules]);

    const showAll = useCallback(() => {
        saveToStorage([...defaultModuleIds]);
    }, []);

    const isModuleVisible = useCallback((moduleId: string) => {
        return visibleModules.has(moduleId);
    }, [visibleModules]);

    const isHrefVisible = useCallback((href: string) => {
        const moduleId = hrefToModuleId[href];
        return moduleId ? visibleModules.has(moduleId) : true;
    }, [visibleModules]);

    return {
        visibleModules,
        mounted,
        toggleModule,
        showAll,
        isModuleVisible,
        isHrefVisible,
        allModules,
    };
}
