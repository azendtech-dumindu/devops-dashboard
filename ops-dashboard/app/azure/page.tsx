"use client";

import {
    Card,
    Title,
    Text,
    Grid,
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

    const resources: Resource[] = resourcesData?.resources || [];
    const error = resourcesError ? "Failed to fetch resources" : null;

    const securityScore = {
        scorePercentage: securityData?.scorePercentage ?? null,
        healthy: securityData?.healthy || 0,
        unhealthy: securityData?.unhealthy || 0,
        loading: securityLoading,
    };

    // Group resources by type for summary
    const typeGroups = resources.reduce((acc: Record<string, number>, res) => {
        acc[res.type] = (acc[res.type] || 0) + 1;
        return acc;
    }, {});

    const sortedTypes = Object.entries(typeGroups)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // Top 8 types

    // Security score color
    const getScoreColor = (score: number | null) => {
        if (score === null) return "gray";
        if (score >= 80) return "emerald";
        if (score >= 50) return "yellow";
        return "rose";
    };

    return (
        <main>
            <Title>Azure Resources</Title>
            <Text>Real-time resource inventory from Azure</Text>

            <Grid numItemsMd={2} className="mt-6 gap-6">
                <Card>
                    <Title>Resource Summary</Title>
                    {resourcesLoading ? (
                        <div className="h-48 flex items-center justify-center">
                            <Text>Loading...</Text>
                        </div>
                    ) : (
                        <div className="mt-4">
                            <div className="text-center mb-4">
                                <Text className="text-4xl font-bold text-tremor-brand-emphasis">{resources.length}</Text>
                                <Text className="mt-1">Total Resources</Text>
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
                    <Title>Security Score</Title>
                    {securityScore.loading ? (
                        <div className="h-48 flex items-center justify-center">
                            <Text>Calculating security score...</Text>
                        </div>
                    ) : (
                        <div className="mt-4">
                            <div className="text-center mb-4">
                                <Text className={`text-5xl font-bold ${securityScore.scorePercentage !== null ? (securityScore.scorePercentage >= 80 ? "text-emerald-600" : securityScore.scorePercentage >= 50 ? "text-yellow-600" : "text-rose-600") : "text-gray-400"}`}>
                                    {securityScore.scorePercentage !== null ? `${securityScore.scorePercentage}%` : "N/A"}
                                </Text>
                                <Text className="mt-1">Compliance Score</Text>
                            </div>
                            <div className="flex justify-center gap-4 mt-4">
                                <div className="text-center">
                                    <Badge color="emerald" size="lg">{securityScore.healthy}</Badge>
                                    <Text className="text-xs mt-1">Healthy</Text>
                                </div>
                                <div className="text-center">
                                    <Badge color="rose" size="lg">{securityScore.unhealthy}</Badge>
                                    <Text className="text-xs mt-1">Unhealthy</Text>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </Grid>

            <Card className="mt-6">
                <div className="flex justify-between items-center">
                    <Title>Resource Inventory</Title>
                    {!resourcesLoading && <Badge color="blue">{resources.length} resources</Badge>}
                </div>
                {resourcesLoading ? (
                    <div className="h-48 flex items-center justify-center">
                        <Text>Loading resources from Azure...</Text>
                    </div>
                ) : error ? (
                    <div className="h-48 flex items-center justify-center">
                        <Text className="text-red-500">{error}</Text>
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
                                        <Text className="font-medium">{item.name}</Text>
                                    </TableCell>
                                    <TableCell>
                                        <Badge color={getTypeColor(item.type)}>{item.type}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Text className="text-sm">{item.resourceGroup}</Text>
                                    </TableCell>
                                    <TableCell>
                                        <Text>{formatLocation(item.location)}</Text>
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
