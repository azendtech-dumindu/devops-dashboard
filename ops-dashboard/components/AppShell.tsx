"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, PieChart, Radar, ChevronLeft, ChevronRight, DollarSign, Server, Settings, X, Sun, Moon, Monitor, FolderGit2, Loader2, Briefcase } from "lucide-react";
import { useState } from "react";
import { useModuleVisibility, allModules } from "@/lib/useModuleVisibility";
import { useTheme, Theme } from "@/lib/useTheme";
import { useProjectVisibility } from "@/lib/useProjectVisibility";

const moduleIcons: Record<string, any> = {
    home: LayoutDashboard,
    projects: Briefcase,
    tasks: PieChart,
    spend: DollarSign,
    azure: Server,
    radar: Radar,
};

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(" ");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const { visibleModules, mounted, toggleModule, showAll } = useModuleVisibility();
    const { theme, setTheme } = useTheme();
    const {
        visibleProjects,
        allProjects,
        loading: projectsLoading,
        toggleProject,
        showAllProjects,
        hideAllProjects
    } = useProjectVisibility();

    const themeOptions: { value: Theme; label: string; icon: any }[] = [
        { value: "light", label: "Light", icon: Sun },
        { value: "dark", label: "Dark", icon: Moon },
        { value: "system", label: "System", icon: Monitor },
    ];

    // Filter navigation based on visibility
    const visibleNavigation = allModules
        .filter(m => visibleModules.has(m.id))
        .map(m => ({
            ...m,
            icon: moduleIcons[m.id],
        }));

    // Don't render until mounted to avoid hydration mismatch
    if (!mounted) {
        return (
            <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse text-gray-400">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* Settings Modal */}
            {settingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSettingsOpen(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
                            <button
                                onClick={() => setSettingsOpen(false)}
                                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Visible Modules</h3>
                            <p className="text-xs text-gray-500 mb-4">Controls both sidebar navigation and Executive Summary cards.</p>
                            {allModules.map((module) => {
                                const Icon = moduleIcons[module.id];
                                return (
                                    <label
                                        key={module.id}
                                        className={classNames(
                                            "flex items-center p-3 rounded-lg cursor-pointer transition-colors",
                                            module.required
                                                ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800"
                                                : "hover:bg-gray-100 dark:hover:bg-gray-800"
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={visibleModules.has(module.id)}
                                            onChange={() => toggleModule(module.id)}
                                            disabled={module.required}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                        />
                                        <Icon className="h-5 w-5 ml-3 text-gray-500 dark:text-gray-400" />
                                        <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                                            {module.name}
                                        </span>
                                        {module.required && (
                                            <span className="ml-auto text-xs text-gray-400">(required)</span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>

                        {/* Executive Summary Cards Section */}
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Executive Summary Cards</h3>
                            <p className="text-xs text-gray-500 mb-4">Toggle KPI cards on the homepage.</p>
                            <div className="space-y-1">
                                {/* Cost Card toggle */}
                                <label className="flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={visibleModules.has("spend")}
                                        onChange={() => toggleModule("spend")}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <DollarSign className="h-5 w-5 ml-3 text-green-500" />
                                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                                        Cost Card
                                    </span>
                                </label>
                                {/* Defense Card toggle */}
                                <label className="flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={visibleModules.has("azure")}
                                        onChange={() => toggleModule("azure")}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <Server className="h-5 w-5 ml-3 text-blue-500" />
                                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                                        Defense Card
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Appearance</h3>
                            <div className="flex gap-2">
                                {themeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setTheme(option.value)}
                                        className={classNames(
                                            "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors",
                                            theme === option.value
                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400"
                                        )}
                                    >
                                        <option.icon className="h-4 w-4" />
                                        <span className="text-sm font-medium">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Visible Projects</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={showAllProjects}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        Select all
                                    </button>
                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                    <button
                                        onClick={hideAllProjects}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        Clear all
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">Select which projects to show on the dashboard.</p>
                            <div className="space-y-1">
                                {allProjects.map((project: any) => (
                                    <label
                                        key={project.id}
                                        className="flex items-center p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={visibleProjects.has(project.name)}
                                            onChange={() => toggleProject(project.name)}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <Briefcase className="h-4 w-4 ml-3 text-gray-400" />
                                        <span className="ml-2 text-sm text-gray-900 dark:text-white">
                                            {project.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={showAll}
                                className="w-full px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                                Show All Modules
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <div className={classNames(
                "hidden md:flex md:flex-col transition-all duration-300",
                isCollapsed ? "md:w-16" : "md:w-64"
            )}>
                <div className="flex flex-col flex-grow border-r border-gray-200 bg-white pt-5 pb-4 overflow-y-auto dark:bg-gray-950 dark:border-gray-800">
                    <div className="flex items-center flex-shrink-0 px-4">
                        {!isCollapsed && (
                            <span className="text-xl font-bold text-tremor-brand-emphasis dark:text-blue-500">
                                AzendTech <span className="text-gray-900 dark:text-white">DevOps</span>
                            </span>
                        )}
                    </div>
                    <div className="mt-8 flex-grow flex flex-col">
                        <nav className="flex-1 px-2 space-y-1">
                            {visibleNavigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={classNames(
                                            isActive
                                                ? "bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white"
                                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",
                                            "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150",
                                            isCollapsed ? "justify-center" : ""
                                        )}
                                        title={isCollapsed ? item.name : undefined}
                                    >
                                        <item.icon
                                            className={classNames(
                                                isActive
                                                    ? "text-gray-500 dark:text-gray-300"
                                                    : "text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300",
                                                "flex-shrink-0 h-6 w-6",
                                                isCollapsed ? "" : "mr-3"
                                            )}
                                            aria-hidden="true"
                                        />
                                        {!isCollapsed && item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Bottom buttons */}
                    <div className="flex-shrink-0 px-2 py-2 border-t border-gray-200 dark:border-gray-800 space-y-1">
                        {/* Settings Button */}
                        <button
                            onClick={() => setSettingsOpen(true)}
                            className={classNames(
                                "w-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center",
                                isCollapsed ? "justify-center" : ""
                            )}
                            title={isCollapsed ? "Settings" : undefined}
                        >
                            <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            {!isCollapsed && <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Settings</span>}
                        </button>

                        {/* Collapse Toggle */}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="w-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
                            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {isCollapsed ? (
                                <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            ) : (
                                <ChevronLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex flex-col w-0 flex-1 overflow-hidden">
                <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
                    <div className="py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
