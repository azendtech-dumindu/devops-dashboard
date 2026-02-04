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
    const [allProjects, setAllProjects] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    // Load from localStorage on mount (only once globally)
    useEffect(() => {
        if (!projectsInitialized) {
            projectsInitialized = true;
            visibleProjects = loadProjectsFromStorage();
            emitProjectChange();
        }
        setMounted(true);
    }, []);

    // Fetch all projects from API
    useEffect(() => {
        async function fetchProjects() {
            try {
                const response = await fetch("/api/azure/projects");
                if (response.ok) {
                    const data = await response.json();
                    const projectList = data.projects || [];
                    setAllProjects(projectList);
                    allProjectsCache = projectList.map((p: any) => p.name);

                    // If no projects are selected yet, don't auto-select any
                    // User must explicitly choose which to show
                }
            } catch (error) {
                console.error("Failed to fetch projects:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchProjects();
    }, []);

    const visibleProjectSet = new Set(projects);

    const toggleProject = useCallback((projectName: string) => {
        const newProjects = visibleProjectSet.has(projectName)
            ? projects.filter(name => name !== projectName)
            : [...projects, projectName];
        saveProjectsToStorage(newProjects);
    }, [projects, visibleProjectSet]);

    const showAllProjects = useCallback(() => {
        saveProjectsToStorage([...allProjectsCache]);
    }, []);

    const hideAllProjects = useCallback(() => {
        saveProjectsToStorage([]);
    }, []);

    const isProjectVisible = useCallback((projectName: string) => {
        return visibleProjectSet.has(projectName);
    }, [visibleProjectSet]);

    return {
        visibleProjects: visibleProjectSet,
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
