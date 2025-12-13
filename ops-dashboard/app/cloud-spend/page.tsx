"use client";

import { Card, Title, Text, LineChart, List, ListItem, Badge, Grid, Color } from "@tremor/react";
import { useEffect, useState } from "react";

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

const valueFormatter = (number: number) => `$${Intl.NumberFormat("us").format(number).toString()}`;

export default function CloudSpendPage() {
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [varianceData, setVarianceData] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [loadingVariance, setLoadingVariance] = useState(true);

    useEffect(() => {
        // Fetch History
        async function fetchHistory() {
            try {
                const res = await fetch("/api/azure/cost-history");
                if (res.ok) {
                    const data = await res.json();
                    const history = data.history || [];

                    // Find the forecast month (Dec 25) and previous month (Nov 25)
                    const forecastIndex = history.findIndex((item: any) => item.Forecast !== null);

                    const processedHistory = history.map((item: any, index: number) => {
                        // If this is the forecast month, use forecast for the line
                        if (item.Forecast !== null) {
                            return {
                                ...item,
                                Cost: null, // Don't connect indigo line to Dec
                                Forecast: item.Forecast // Green line will end here
                            };
                        }
                        // If this is the month before forecast, start the green line here
                        if (forecastIndex > 0 && index === forecastIndex - 1) {
                            return {
                                ...item,
                                Forecast: item.Cost // Green line starts from Nov's actual cost
                            };
                        }
                        return item;
                    });

                    setHistoryData(processedHistory);
                }
            } catch (error) {
                console.error("Failed to fetch cost history", error);
            } finally {
                setLoadingHistory(false);
            }
        }
        fetchHistory();

        // Fetch Variance (Key Changes)
        async function fetchVariance() {
            try {
                const res = await fetch("/api/azure/cost-variance");
                if (res.ok) {
                    const data = await res.json();
                    setVarianceData(data.changes || []);
                }
            } catch (error) {
                console.error("Failed to fetch variance", error);
            } finally {
                setLoadingVariance(false);
            }
        }
        fetchVariance();
    }, []);

    return (
        <main className="p-4 md:p-10 mx-auto max-w-7xl">
            <Title>Cloud Spend Analysis</Title>
            <Text>Year-over-year cost patterns and key variance drivers</Text>

            {/* Cost Trend Chart - Full Width */}
            <Card className="mt-6">
                <Title>12-Month Cost Trend (Real-Time)</Title>
                {loadingHistory ? (
                    <div className="h-72 mt-4 flex items-center justify-center">
                        <Text>Loading live data from Azure...</Text>
                    </div>
                ) : (
                    <LineChart
                        className="h-72 mt-4"
                        data={historyData}
                        index="date"
                        categories={["Cost", "Forecast"]}
                        colors={["indigo", "emerald"]}
                        valueFormatter={valueFormatter}
                        customTooltip={customTooltip}
                        yAxisWidth={60}
                        connectNulls={true}
                        intervalType="preserveStartEnd"
                        startEndOnly={false}
                    />
                )}
            </Card>

            {/* Key Changes - Below Chart */}
            <Card className="mt-6">
                <Title>Key Changes (Jan 25 - Now)</Title>
                {loadingVariance ? (
                    <div className="h-32 mt-4 flex items-center justify-center">
                        <Text>Analyzing variance...</Text>
                    </div>
                ) : (
                    varianceData.length === 0 ? (
                        <div className="h-32 mt-4 flex items-center justify-center flex-col">
                            <Text>No significant changes detected</Text>
                            <Text className="text-xs text-gray-400 mt-2">Threshold: &gt;$10 change</Text>
                        </div>
                    ) : (
                        <List className="mt-4">
                            {varianceData.map((item) => (
                                <ListItem key={item.reason + item.change}>
                                    <Text className="font-medium">{item.reason}</Text>
                                    <div className="flex items-center space-x-2">
                                        <Text className="text-xs text-gray-500">{item.month}</Text>
                                        <Text className={`font-semibold ${item.rawDiff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{item.change}</Text>
                                    </div>
                                </ListItem>
                            ))}
                        </List>
                    )
                )}
            </Card>
        </main>
    );
}
