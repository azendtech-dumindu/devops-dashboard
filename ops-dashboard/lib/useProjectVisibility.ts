"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

export const PROJECT_STORAGE_KEY = "ops-dashboard-visible-projects";

// Shared state for cross-component sync
let projectListeners: Set<() => void> = new Set();
let visibleProjects: string[] = [];
let allProjectsCache: string[] = [];

// Cache server snapshot to avoid infinite loop
const SERVER_SNAPSHOT: string[] = [];

function getProjectSnapshot(): string[] {
    return visibleProjects;
}

function getProjectServerSnapshot(): string[] {
    return SERVER_SNAPSHOT;
}

function subscribeProjects(callback: () => void): () => void {
    projectListeners.add(callback);
    return () => projectListeners.delete(callback);
}

function emitProjectChange() {
    projectListeners.forEach(listener => listener());
}

function loadProjectsFromStorage(): string[] {
    if (typeof window === "undefined") return [];

    const saved = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            return [];
        }
    }
    return [];
}

function saveProjectsToStorage(projects: string[]) {
    visibleProjects = projects;
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
    emitProjectChange();
}

// Initialize from storage on first load
let projectsInitialized = false;

export function useProjectVisibility() {
    const projects = useSyncExternalStore(subscribeProjects, getProjectSnapshot, getProjectServerSnapshot);
    const [mounted, setMounted] = useState(false);
    const forcedProjects = ["Saral", "Soliyana"];

    // Initialize allProjects with forced projects
    const [allProjects] = useState<{ id: string; name: string }[]>(
        forcedProjects.map(name => ({ id: name, name }))
    );
    const [loading, setLoading] = useState(false);

    // Initial load from storage, filtered by forced projects
    useEffect(() => {
        if (!projectsInitialized) {
            projectsInitialized = true;
            const saved = loadProjectsFromStorage();
            // Fallback to both if none saved or invalid saved state
            if (saved.length === 0) {
                visibleProjects = forcedProjects;
            } else {
                // Only keep projects that are in our forced list
                visibleProjects = saved.filter(p => forcedProjects.includes(p));
                if (visibleProjects.length === 0) visibleProjects = forcedProjects;
            }
            emitProjectChange();
        }
        setMounted(true);
    }, []);

    const toggleProject = useCallback((projectName: string) => {
        if (!forcedProjects.includes(projectName)) return;

        const currentVisible = new Set(projects);
        let nextVisible: string[];

        if (currentVisible.has(projectName)) {
            nextVisible = projects.filter(name => name !== projectName);
        } else {
            nextVisible = [...projects, projectName];
        }

        saveProjectsToStorage(nextVisible);
    }, [projects]);

    const showAllProjects = useCallback(() => {
        saveProjectsToStorage(forcedProjects);
    }, []);

    const hideAllProjects = useCallback(() => {
        saveProjectsToStorage([]);
    }, []);

    const isProjectVisible = useCallback((projectName: string) => {
        return new Set(projects).has(projectName);
    }, [projects]);

    return {
        visibleProjects: new Set(projects),
        visibleProjectsList: projects,
        allProjects,
        mounted,
        loading,
        toggleProject,
        showAllProjects,
        hideAllProjects,
        isProjectVisible,
    };
}
