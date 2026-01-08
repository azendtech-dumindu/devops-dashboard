"use client";

import { Card, Title, Text, List, ListItem, Grid } from "@tremor/react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell, LabelList } from 'recharts';
import useSWR from "swr";
import { RotateCw } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
});

const customTooltip = (props: any) => {
    const { payload, active } = props;
    if (!active || !payload) return null;
    return (
        <div className="w-56 rounded-tremor-default text-tremor-default bg-tremor-background p-2 shadow-tremor-dropdown border border-tremor-border dark:bg-dark-tremor-background dark:border-dark-tremor-border">
            {payload.map((category: any, idx: number) => (
                <div key={idx} className="flex flex-1 space-x-2.5">
                    <div className={`w-1 flex flex-col bg-${category.color}-500 rounded`} />
                    <div className="space-y-1">
                        <p className="text-tremor-content">{category.dataKey}</p>
                        <p className="font-medium text-tremor-content-emphasis">{category.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

const valueFormatter = (number: number) => `$${Math.round(number).toLocaleString()}`;

export default function CloudSpendPage() {
    const { data: historyData, isLoading: loadingHistory, mutate: mutateHistory, isValidating: validatingHistory } = useSWR("/api/azure/cost-history", fetcher);
    const { data: varianceData, isLoading: loadingVariance, mutate: mutateVariance, isValidating: validatingVariance } = useSWR("/api/azure/cost-variance", fetcher);
    const { data: rgData, isLoading: loadingRg, mutate: mutateRg, isValidating: validatingRg } = useSWR("/api/azure/cost-by-rg", fetcher);



    // Process History Data
    const rawHistory = historyData?.history || [];
    const forecastIndex = rawHistory.findIndex((item: any) => item.Forecast !== null);

    const processedHistory = rawHistory.map((item: any, index: number) => {
        if (item.Forecast !== null) {
            return { ...item, Cost: null, Forecast: item.Forecast };
        }
        if (forecastIndex > 0 && index === forecastIndex - 1) {
            return { ...item, Forecast: item.Cost };
        }
        return item;
    });

    // Process Variance Data
    const varianceList = varianceData?.changes || [];

    // Calculate min/max for Y-axis (excluding forecast and partial months)
    const actualCosts = processedHistory
        .filter((item: any) =>
            item.Cost !== null &&
            item.Cost !== undefined &&
            item.date !== "Jan 25" &&
            item.date !== "Jan 26"
        )
        .map((item: any) => item.Cost);
    const minCost = 1448; // Rounded from Dec 25: $1,447.79
    const maxCost = 2060; // Rounded from Sep 25: $2,059.54

    // Process RG Breakdown (top 10) with percentage
    const totalActualCost = rgData?.totalActual || 0;
    const rgBreakdown = (rgData?.breakdown || []).slice(0, 10).map((item: any) => {
        const percentage = totalActualCost > 0 ? ((item.actual / totalActualCost) * 100).toFixed(1) : 0;
        const displayName = item.name.length > 25 ? item.name.slice(0, 22) + "..." : item.name;
        return {
            name: displayName.toUpperCase(),
            Actual: Math.round(item.actual * 100) / 100,
            Projected: Math.round(item.projected * 100) / 100,
            Percentage: `${percentage}%`,
        };
    });

    return (
        <main className="p-4 md:p-10 mx-auto max-w-7xl">
            <div>
                <Title>Cloud Spend Analysis</Title>
                <Text>Year-over-year cost patterns and key variance drivers</Text>
            </div>

            {/* Cost Trend Chart - Full Width */}
            <Card className="mt-6">
                <div className="flex items-center justify-between">
                    <Title>Cost Trend</Title>
                    <button
                        onClick={() => mutateHistory()}
                        disabled={validatingHistory}
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700 text-gray-500"
                        title="Refresh cost trend"
                    >
                        <RotateCw className={`h-4 w-4 ${validatingHistory ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                {loadingHistory ? (
                    <div className="h-72 mt-4 flex items-center justify-center">
                        <Text>Loading live data from Azure...</Text>
                    </div>
                ) : (
                    <div className="h-72 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={processedHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    className="text-xs text-gray-600 dark:text-gray-400"
                                    tick={{ fill: 'currentColor' }}
                                    tickFormatter={(value) => value.replace(/ \d{2}$/, '')}
                                />
                                <YAxis
                                    domain={[minCost, maxCost]}
                                    ticks={[minCost, maxCost]}
                                    className="text-xs text-gray-600 dark:text-gray-400"
                                    tick={{ fill: 'currentColor' }}
                                    tickFormatter={(value) => `$${Math.round(value).toLocaleString()}`}
                                    width={80}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgb(var(--tremor-background-muted))',
                                        border: '1px solid rgb(var(--tremor-border))',
                                        borderRadius: '0.5rem'
                                    }}
                                    formatter={(value: any) => [`$${Math.round(value).toLocaleString()}`, '']}
                                />

                                <Line
                                    type="monotone"
                                    dataKey="Cost"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    dot={{ fill: '#6366f1', r: 2 }}
                                    connectNulls
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Forecast"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ fill: '#3b82f6', r: 2 }}
                                    connectNulls
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </Card>


            {/* Key Changes */}
            <Card className="mt-6">
                <Title>Key Changes</Title>
                {loadingVariance ? (
                    <div className="h-72 mt-4 flex items-center justify-center">
                        <Text>Analyzing variance...</Text>
                    </div>
                ) : (
                    varianceList.length === 0 ? (
                        <div className="h-72 mt-4 flex items-center justify-center flex-col">
                            <Text>No significant changes detected</Text>
                            <Text className="text-xs text-gray-400 mt-2">Threshold: &gt;$100 change</Text>
                        </div>
                    ) : (
                        <List className="mt-4 h-72 overflow-y-auto">
                            {varianceList.map((item: any) => (
                                <ListItem key={item.reason + item.change}>
                                    <Text className="font-medium">{item.reason}</Text>
                                    <div className="flex items-center space-x-2">
                                        <Text className="text-xs text-gray-500">{item.month}</Text>
                                        <Text className={`font-semibold ${item.rawDiff > 0 ? 'text-red-500' : 'text-green-500'}`}>{item.change}</Text>
                                    </div>
                                </ListItem>
                            ))}
                        </List>
                    )
                )}
            </Card>

            {/* Projects */}
            <Card className="mt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Title>Projects (Previous Month)</Title>
                    </div>
                    <button
                        onClick={() => mutateRg()}
                        disabled={validatingRg}
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700 text-gray-500"
                        title="Refresh project breakdown"
                    >
                        <RotateCw className={`h-4 w-4 ${validatingRg ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                {loadingRg ? (
                    <div className="h-72 mt-4 flex items-center justify-center">
                        <Text>Loading breakdown...</Text>
                    </div>
                ) : (
                    <div className="h-72 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={rgBreakdown}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" horizontal={false} />
                                <XAxis
                                    type="number"
                                    className="text-xs text-gray-600 dark:text-gray-400"
                                    tick={{ fill: 'currentColor' }}
                                    tickFormatter={(value) => `$${Math.round(value).toLocaleString()}`}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={100}
                                    className="text-xs text-gray-600 dark:text-gray-400"
                                    tick={{ fill: 'currentColor' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgb(var(--tremor-background-muted))',
                                        border: '1px solid rgb(var(--tremor-border))',
                                        borderRadius: '0.5rem'
                                    }}
                                    formatter={(value: any, name: any) => {
                                        if (value === 0) return [null, null]; // Hide if 0
                                        return [`$${Math.round(value).toLocaleString()}`, name];
                                    }}
                                />
                                <Bar dataKey="Actual" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </Card>
        </main>
    );
}

