"use client";

import {
    Card,
    Badge,
    Table,
    TableHead,
    TableRow,
    TableHeaderCell,
    TableBody,
    TableCell,
} from "@tremor/react";
import useSWR from "swr";
import { ArrowLeft, GitBranch, Clock, ExternalLink, ChevronDown, ChevronUp, ShieldCheck, Search, Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
});

// Helper for pipeline result badge color
function getResultColor(result: string): "emerald" | "red" | "amber" | "gray" {
    switch (result) {
        case "succeeded": return "emerald";
        case "failed": return "red";
        case "canceled":
        case "partiallySucceeded": return "amber";
        default: return "gray";
    }
}

// Helper for pipeline state badge color
function getStateColor(state: string): "blue" | "emerald" | "amber" | "gray" {
    switch (state) {
        case "inProgress": return "blue";
        case "completed": return "emerald";
        case "cancelling": return "amber";
        default: return "gray";
    }
}

// Helper for scan result color
function getScanResultColor(result: string): "emerald" | "red" | "gray" {
    if (!result) return "gray";
    const r = result.toLowerCase();
    if (r === "succeeded") return "emerald";
    if (r === "failed") return "red";
    return "gray";
}

// Format duration
function formatDuration(start: string, end: string): string {
    if (!start || !end) return "—";
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffMs = endTime - startTime;
    const diffSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(diffSecs / 60);
    const secs = diffSecs % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
}

// Format date to relative time
function formatRelativeTime(dateStr: string): string {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

type FilterType = "all" | "succeeded" | "failed" | "inProgress";

export default function ProjectPage({ params }: { params: Promise<{ projectName: string }> }) {
    const { projectName } = use(params);
    const decodedName = decodeURIComponent(projectName);

    const [filter, setFilter] = useState<FilterType>("all");
    const [isExpanded, setIsExpanded] = useState(false);

    // Fetch only this project's pipeline runs
    const { data: pipelineData, error: pipelineError, isLoading: pipelineLoading } = useSWR(
        `/api/azure/pipeline-runs?projects=${encodeURIComponent(decodedName)}&includeScans=true`,
        fetcher
    );

    const projectRuns = pipelineData?.runs || [];

    // Filter runs from last week for the details table
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const lastWeekRuns = projectRuns.filter((r: any) =>
        new Date(r.createdDate) >= oneWeekAgo
    );

    // Get stats from THIS WEEK's runs
    const successCount = lastWeekRuns.filter((r: any) => r.result === "succeeded").length;
    const failedCount = lastWeekRuns.filter((r: any) => r.result === "failed").length;
    const inProgressCount = lastWeekRuns.filter((r: any) => r.state === "inProgress").length;

    // Apply filter to last week runs
    const filteredRuns = lastWeekRuns.filter((run: any) => {
        if (filter === "all") return true;
        if (filter === "succeeded") return run.result === "succeeded";
        if (filter === "failed") return run.result === "failed";
        if (filter === "inProgress") return run.state === "inProgress";
        return true;
    });

    const handleFilterClick = (newFilter: FilterType) => {
        if (filter === newFilter) {
            setFilter("all");
        } else {
            setFilter(newFilter);
            setIsExpanded(true);
        }
    };

    return (
        <main>
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/projects"
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                        {decodedName}
                    </h1>
                </div>
            </div>

            {/* Environment Health Section - Only for Saral */}
            {decodedName === "Saral" && (
                <div className="mb-8">
                    <p className="text-sm font-medium text-tremor-content dark:text-dark-tremor-content mb-4">
                        Environment Health
                    </p>
                    <EnvironmentHealth />
                </div>
            )}

            <p className="text-sm font-medium text-tremor-content dark:text-dark-tremor-content mb-4">
                Pipeline runs
            </p>

            {/* Stats Cards - Clickable for filtering */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card
                    className={`p-4 cursor-pointer transition-all ${filter === "all" ? "ring-2 ring-blue-500" : "hover:shadow-md"}`}
                    onClick={() => handleFilterClick("all")}
                >
                    <p className="text-sm text-tremor-content dark:text-dark-tremor-content">Total</p>
                    <p className="text-2xl font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                        {lastWeekRuns.length}
                    </p>
                </Card>
                <Card
                    className={`p-4 cursor-pointer transition-all ${filter === "succeeded" ? "ring-2 ring-emerald-500" : "hover:shadow-md"}`}
                    onClick={() => handleFilterClick("succeeded")}
                >
                    <p className="text-sm text-tremor-content dark:text-dark-tremor-content">Succeeded</p>
                    <p className="text-2xl font-bold text-emerald-600">{successCount}</p>
                </Card>
                <Card
                    className={`p-4 cursor-pointer transition-all ${filter === "failed" ? "ring-2 ring-red-500" : "hover:shadow-md"}`}
                    onClick={() => handleFilterClick("failed")}
                >
                    <p className="text-sm text-tremor-content dark:text-dark-tremor-content">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{failedCount}</p>
                </Card>
                <Card
                    className={`p-4 cursor-pointer transition-all ${filter === "inProgress" ? "ring-2 ring-blue-500" : "hover:shadow-md"}`}
                    onClick={() => handleFilterClick("inProgress")}
                >
                    <p className="text-sm text-tremor-content dark:text-dark-tremor-content">In Progress</p>
                    <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
                </Card>
            </div>

            {/* Pipeline Runs Table - Collapsible */}
            <Card>
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                            Runs
                        </h3>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                </div>

                {isExpanded && (
                    <div className="mt-4">
                        {pipelineLoading ? (
                            <div className="h-48 flex items-center justify-center">
                                <p className="text-tremor-content dark:text-dark-tremor-content">Loading pipeline runs...</p>
                            </div>
                        ) : pipelineError ? (
                            <div className="h-48 flex items-center justify-center flex-col">
                                <p className="text-amber-500">Failed to load pipeline runs</p>
                            </div>
                        ) : filteredRuns.length === 0 ? (
                            <div className="h-32 flex items-center justify-center">
                                <p className="text-tremor-content dark:text-dark-tremor-content">
                                    {filter === "all" ? "No runs in the last 7 days" : `No ${filter} runs this week`}
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableHeaderCell>Pipeline / Run</TableHeaderCell>
                                        <TableHeaderCell>Sonar</TableHeaderCell>
                                        <TableHeaderCell>Trivy</TableHeaderCell>
                                        <TableHeaderCell>Result</TableHeaderCell>
                                        <TableHeaderCell>Time</TableHeaderCell>
                                        <TableHeaderCell>Action</TableHeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredRuns.map((run: any) => (
                                        <TableRow key={run.id}>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
                                                        {run.pipelineName}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-tremor-content dark:text-dark-tremor-content">
                                                            {run.name}
                                                        </span>
                                                        <div className="flex items-center gap-1 text-gray-400">
                                                            <GitBranch className="h-3 w-3" />
                                                            <span className="text-xs">
                                                                {run.sourceBranch || "—"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {run.scans?.sonar ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Sonar</span>
                                                        <Badge
                                                            color={getScanResultColor(run.scans.sonar.status)}
                                                        >
                                                            {run.scans.sonar.status === "succeeded" ? "Passed" : "Failed"}
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {run.scans?.trivy ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Trivy</span>
                                                        <Badge
                                                            color={getScanResultColor(run.scans.trivy.status)}
                                                        >
                                                            {run.scans.trivy.status === "succeeded" ? "Clean" : "Vulnerable"}
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {run.result ? (
                                                    <Badge color={getResultColor(run.result)}>{run.result}</Badge>
                                                ) : (
                                                    <Badge color={getStateColor(run.state)}>{run.state}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1 text-tremor-content-strong dark:text-dark-tremor-content-strong">
                                                        <Clock className="h-3 w-3 text-gray-400" />
                                                        <span className="text-sm">
                                                            {formatRelativeTime(run.createdDate)}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-tremor-content dark:text-dark-tremor-content mt-0.5">
                                                        {formatDuration(run.startedDate, run.finishedDate)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <a
                                                    href={run.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors inline-flex"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ExternalLink className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                                                </a>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                )}
            </Card>
        </main>
    );
}

function EnvironmentHealth() {
    const { data, isLoading, error } = useSWR("/api/health", fetcher, {
        refreshInterval: 30000, // Refresh every 30s
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="animate-pulse bg-gray-50 dark:bg-gray-900 border-none shadow-none">
                        <div className="h-16 flex items-center justify-center">
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    if (error || !data) return null;

    const environments = data.environments || [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {environments.map((env: any) => (
                <Card key={env.name} className="p-4 bg-gray-50 dark:bg-gray-900 border-none shadow-none">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                            {env.name}
                        </p>
                    </div>

                    <div className="space-y-2">
                        {/* Frontend Status */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-tremor-content dark:text-dark-tremor-content">App</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400">{env.responseTime ? `${env.responseTime}ms` : '-'}</span>
                                <Badge color={env.status === "healthy" ? "emerald" : "red"} size="xs">
                                    {env.status === "healthy" ? "Online" : "Offline"}
                                </Badge>
                            </div>
                        </div>

                        {/* Backend Status */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-tremor-content dark:text-dark-tremor-content">API</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400">{env.backendResponseTime ? `${env.backendResponseTime}ms` : '-'}</span>
                                <Badge color={env.backendStatus === "healthy" ? "emerald" : "red"} size="xs">
                                    {env.backendStatus === "healthy" ? "Online" : "Offline"}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
