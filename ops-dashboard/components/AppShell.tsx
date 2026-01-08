"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, PieChart, ShieldCheck, Radar, ChevronLeft, ChevronRight, DollarSign, Cloud, Server } from "lucide-react";
import { useState } from "react";

const navigation = [
    { name: "Executive Summary", href: "/", icon: LayoutDashboard },
    { name: "Task Allocations", href: "/task-allocations", icon: PieChart },
    { name: "Cloud Spend", href: "/cloud-spend", icon: DollarSign },
    { name: "Azure Resources", href: "/azure", icon: Server },
    { name: "Tech Radar", href: "/radar", icon: Radar },
];

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(" ");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(true);

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
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
                            {navigation.map((item) => {
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
                    {/* Collapse Toggle Button at Bottom */}
                    <div className="flex-shrink-0 px-2 py-2 border-t border-gray-200 dark:border-gray-800">
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
