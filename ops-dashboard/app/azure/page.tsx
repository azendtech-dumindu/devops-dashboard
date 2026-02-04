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

interface Resource {
    id: string;
    name: string;
    type: string;
    fullType: string;
    location: string;
    resourceGroup: string;
}

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
});

// Helper to get status badge color based on resource type
function getTypeColor(type: string): "blue" | "emerald" | "violet" | "amber" | "rose" | "cyan" | "gray" {
    const typeColors: Record<string, "blue" | "emerald" | "violet" | "amber" | "rose" | "cyan" | "gray"> = {
        "storageAccounts": "blue",
        "virtualMachines": "emerald",
        "webApps": "violet",
        "containerApps": "amber",
        "databases": "rose",
        "vaults": "cyan",
    };
    return typeColors[type] || "gray";
}

// Format location to readable name
function formatLocation(location: string): string {
    const locationMap: Record<string, string> = {
        "westeurope": "West Europe",
        "eastus": "East US",
        "eastus2": "East US 2",
        "westus": "West US",
        "northeurope": "North Europe",
        "southeastasia": "Southeast Asia",
        "centralus": "Central US",
    };
    return locationMap[location.toLowerCase()] || location;
}

export default function AzurePage() {
    const { data: resourcesData, error: resourcesError, isLoading: resourcesLoading } = useSWR("/api/azure/resources", fetcher);
    const { data: securityData, isLoading: securityLoading } = useSWR("/api/azure/security-score", fetcher);
    const { data: pipelineData, error: pipelineError, isLoading: pipelineLoading } = useSWR("/api/azure/pipeline-runs", fetcher);

    const resources: Resource[] = resourcesData?.resources || [];
    const error = resourcesError ? "Failed to fetch resources" : null;

    const securityScore = {
        scorePercentage: securityData?.scorePercentage ?? null,
        healthy: securityData?.healthy || 0,
        unhealthy: securityData?.unhealthy || 0,
        loading: securityLoading,
    };

    const pipelineRuns = pipelineData?.runs || [];

    // Helper for pipeline result badge color
    function getResultColor(result: string): "emerald" | "red" | "amber" | "gray" {
        switch (result) {
            case "succeeded": return "emerald";
            case "failed": return "red";
            case "canceled": return "amber";
            default: return "gray";
        }
    }

    // Helper for pipeline state badge color
    function getStateColor(state: string): "blue" | "emerald" | "amber" | "gray" {
        switch (state) {
            case "inProgress": return "blue";
            case "completed": return "emerald";
            case "canceling": return "amber";
            default: return "gray";
        }
    }

    // Format date to relative time
    function formatRelativeTime(dateStr: string): string {
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

    // Group resources by type for summary
    const typeGroups = resources.reduce((acc: Record<string, number>, res) => {
        acc[res.type] = (acc[res.type] || 0) + 1;
        return acc;
    }, {});

    const sortedTypes = Object.entries(typeGroups)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // Top 8 types

    return (
        <main>
            <h1 className="text-2xl font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">Azure Resources</h1>
            <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">Real-time resource inventory from Azure</p>

            <div className="grid grid-cols-1 md:grid-cols-2 mt-6 gap-6">
                <Card>
                    <h3 className="text-lg font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">Resource Summary</h3>
                    {resourcesLoading ? (
                        <div className="h-48 flex items-center justify-center">
                            <p className="text-tremor-content">Loading...</p>
                        </div>
                    ) : (
                        <div className="mt-4">
                            <div className="text-center mb-4">
                                <p className="text-4xl font-bold text-tremor-brand-emphasis">{resources.length}</p>
                                <p className="mt-1 text-tremor-content">Total Resources</p>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {sortedTypes.map(([type, count]) => (
                                    <Badge key={type} color={getTypeColor(type)}>
                                        {type}: {count}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
                <Card>
                    <h3 className="text-lg font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">Security Score</h3>
                    {securityScore.loading ? (
                        <div className="h-48 flex items-center justify-center">
                            <p className="text-tremor-content">Calculating security score...</p>
                        </div>
                    ) : (
                        <div className="mt-4">
                            <div className="text-center mb-4">
                                <p className={`text-5xl font-bold ${securityScore.scorePercentage !== null ? (securityScore.scorePercentage >= 80 ? "text-emerald-600" : securityScore.scorePercentage >= 50 ? "text-yellow-600" : "text-rose-600") : "text-gray-400"}`}>
                                    {securityScore.scorePercentage !== null ? `${securityScore.scorePercentage}%` : "N/A"}
                                </p>
                                <p className="mt-1 text-tremor-content">Compliance Score</p>
                            </div>
                            <div className="flex justify-center gap-4 mt-4">
                                <div className="text-center">
                                    <Badge color="emerald" size="lg">{securityScore.healthy}</Badge>
                                    <p className="text-xs mt-1 text-tremor-content">Healthy</p>
                                </div>
                                <div className="text-center">
                                    <Badge color="rose" size="lg">{securityScore.unhealthy}</Badge>
                                    <p className="text-xs mt-1 text-tremor-content">Unhealthy</p>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Pipeline Runs */}
            <Card className="mt-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">Pipeline Runs</h3>
                    {!pipelineLoading && pipelineRuns.length > 0 && <Badge color="blue">{pipelineRuns.length} recent runs</Badge>}
                </div>
                {pipelineLoading ? (
                    <div className="h-48 flex items-center justify-center">
                        <p className="text-tremor-content dark:text-dark-tremor-content">Loading pipeline runs...</p>
                    </div>
                ) : pipelineError ? (
                    <div className="h-48 flex items-center justify-center flex-col">
                        <p className="text-amber-500">Azure DevOps not configured</p>
                        <p className="text-xs text-gray-400 mt-2">Set AZURE_DEVOPS_ORG and AZURE_DEVOPS_PAT env vars</p>
                    </div>
                ) : pipelineRuns.length === 0 ? (
                    <div className="h-48 flex items-center justify-center">
                        <p className="text-tremor-content dark:text-dark-tremor-content">No pipeline runs found</p>
                    </div>
                ) : (
                    <Table className="mt-5">
                        <TableHead>
                            <TableRow>
                                <TableHeaderCell>Pipeline</TableHeaderCell>
                                <TableHeaderCell>Status</TableHeaderCell>
                                <TableHeaderCell>Result</TableHeaderCell>
                                <TableHeaderCell>Started</TableHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pipelineRuns.slice(0, 10).map((run: any) => (
                                <TableRow key={run.id}>
                                    <TableCell>
                                        <a
                                            href={run.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong hover:text-blue-600 dark:hover:text-blue-400"
                                        >
                                            {run.pipelineName}
                                        </a>
                                        <p className="text-xs text-tremor-content dark:text-dark-tremor-content">{run.name}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge color={getStateColor(run.state)}>
                                            {run.state === "inProgress" ? "In Progress" : run.state}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {run.result ? (
                                            <Badge color={getResultColor(run.result)}>
                                                {run.result}
                                            </Badge>
                                        ) : (
                                            <span className="text-tremor-content dark:text-dark-tremor-content">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-tremor-content dark:text-dark-tremor-content">
                                            {formatRelativeTime(run.createdDate)}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            <Card className="mt-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">Resource Inventory</h3>
                    {!resourcesLoading && <Badge color="blue">{resources.length} resources</Badge>}
                </div>
                {resourcesLoading ? (
                    <div className="h-48 flex items-center justify-center">
                        <p className="text-tremor-content">Loading resources from Azure...</p>
                    </div>
                ) : error ? (
                    <div className="h-48 flex items-center justify-center">
                        <p className="text-red-500">{error}</p>
                    </div>
                ) : (
                    <Table className="mt-5">
                        <TableHead>
                            <TableRow>
                                <TableHeaderCell>Name</TableHeaderCell>
                                <TableHeaderCell>Type</TableHeaderCell>
                                <TableHeaderCell>Resource Group</TableHeaderCell>
                                <TableHeaderCell>Location</TableHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {resources.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <span className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">{item.name}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge color={getTypeColor(item.type)}>{item.type}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-tremor-content dark:text-dark-tremor-content">{item.resourceGroup}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-tremor-content dark:text-dark-tremor-content">{formatLocation(item.location)}</span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </main>
    );
}
