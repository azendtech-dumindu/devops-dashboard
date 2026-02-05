"use client";

import {
    Card,
    Badge,
} from "@tremor/react";
import useSWR from "swr";
import { FolderGit2, ChevronRight, Settings, ShieldCheck, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useProjectVisibility } from "@/lib/useProjectVisibility";

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
});

// Project colors
const projectColors = ["blue", "violet", "emerald", "amber", "rose", "cyan"];

function getProjectColor(name: string): string {
    const colorIndex = name.charCodeAt(0) % projectColors.length;
    return projectColors[colorIndex];
}

export default function ProjectsPage() {
    const { data: projectsData, error: projectsError, isLoading: projectsLoading } = useSWR(
        "/api/azure/projects",
        fetcher
    );

    const { visibleProjects, visibleProjectsList, mounted } = useProjectVisibility();

    // Build the API URL with selected projects
    const projectsQueryParam = mounted && visibleProjectsList.length > 0
        ? `?projects=${visibleProjectsList.map(p => encodeURIComponent(p)).join(",")}&includeScans=true`
        : "?includeScans=true";

    const { data: pipelineData, isLoading: pipelineLoading } = useSWR(
        mounted ? `/api/azure/pipeline-runs${projectsQueryParam}` : null,
        fetcher
    );

    const allProjects = projectsData?.projects || [];
    const pipelineRuns = pipelineData?.runs || [];

    // Filter to only show visible projects
    const filteredProjects = mounted && visibleProjects.size > 0
        ? allProjects.filter((p: any) => visibleProjects.has(p.name))
        : allProjects;

    const isLoading = projectsLoading || pipelineLoading || !mounted;

    // Get build count for a project
    const getBuildCount = (projectName: string) => {
        return pipelineRuns.filter((run: any) =>
            run.projectName?.toLowerCase() === projectName.toLowerCase()
        ).length;
    };

    // Get latest run for a project
    const getLatestRun = (projectName: string) => {
        const runs = pipelineRuns.filter((run: any) =>
            run.projectName?.toLowerCase() === projectName.toLowerCase()
        );
        return runs.length > 0 ? runs[0] : null;
    };

    // Helper for scan result color
    const getScanColor = (res: any) => {
        if (!res) return "text-gray-300";
        return res.status === "succeeded" ? "text-emerald-500" : "text-red-500";
    };

    return (
        <main>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">Projects</h1>
                </div>
                {mounted && visibleProjects.size > 0 && visibleProjects.size < allProjects.length && (
                    <p className="text-sm text-tremor-content dark:text-dark-tremor-content">
                        {visibleProjects.size} of {allProjects.length}
                    </p>
                )}
            </div>

            <div className="mt-6">
                {isLoading ? (
                    <Card>
                        <div className="h-48 flex items-center justify-center">
                            <p className="text-tremor-content dark:text-dark-tremor-content">Loading projects...</p>
                        </div>
                    </Card>
                ) : projectsError ? (
                    <Card>
                        <div className="h-48 flex items-center justify-center flex-col">
                            <p className="text-amber-500">Azure DevOps not configured</p>
                            <p className="text-xs text-gray-400 mt-2">Set AZURE_DEVOPS_ORG and AZURE_DEVOPS_PAT env vars</p>
                        </div>
                    </Card>
                ) : filteredProjects.length === 0 ? (
                    <Card>
                        <div className="h-48 flex items-center justify-center flex-col">
                            <FolderGit2 className="h-8 w-8 text-gray-400 mb-3" />
                            <p className="text-tremor-content dark:text-dark-tremor-content">No relevant projects found.</p>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProjects.map((project: any) => {
                            const color = getProjectColor(project.name);
                            const latestRun = getLatestRun(project.name);

                            return (
                                <Link
                                    key={project.id}
                                    href={`/projects/${encodeURIComponent(project.name)}`}
                                >
                                    <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                                        <div className="flex items-center gap-6">
                                            {project.name === "Saral" ? (
                                                <div className="h-20 w-20 flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center p-2">
                                                    <img
                                                        src="/saral-logo-dark.svg"
                                                        alt="Saral"
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                            ) : (
                                                <div className={`h-20 w-20 flex-shrink-0 bg-${color}-100 dark:bg-${color}-900/50 rounded-xl flex items-center justify-center`}>
                                                    <FolderGit2 className={`h-12 w-12 text-${color}-600 dark:text-${color}-400`} />
                                                </div>
                                            )}
                                            <div className="min-w-0 overflow-hidden">
                                                <h3 className="text-xl font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                                    {project.name}
                                                </h3>
                                                <div className="mt-0.5 transform scale-75 origin-left">
                                                    {latestRun ? (
                                                        <Badge color={
                                                            latestRun.result === "succeeded" ? "emerald" :
                                                                latestRun.result === "failed" ? "red" :
                                                                    latestRun.state === "inProgress" ? "blue" : "gray"
                                                        }
                                                            className="px-2 py-0"
                                                        >
                                                            {latestRun.state === "inProgress" ? "Running" :
                                                                latestRun.result === "succeeded" ? "Passed" :
                                                                    latestRun.result === "failed" ? "Failed" : (latestRun.result || latestRun.state)}
                                                        </Badge>
                                                    ) : (
                                                        <Badge color="gray" className="px-2 py-0">No runs</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </main >
    );
}
