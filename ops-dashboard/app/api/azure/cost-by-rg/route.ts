import { NextResponse } from "next/server";
import { DefaultAzureCredential } from "@azure/identity";
import { CostManagementClient } from "@azure/arm-costmanagement";
import { ResourceManagementClient } from "@azure/arm-resources";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const credential = new DefaultAzureCredential();
        const subscriptionId = "b2a80749-7cd2-4ef4-bb5b-fab5b010f275";
        const costClient = new CostManagementClient(credential);
        const resourceClient = new ResourceManagementClient(credential, subscriptionId);

        // Get mapping of RG names to project tag values
        const rgToProjectMap: Record<string, string> = {};
        for await (const rg of resourceClient.resourceGroups.list()) {
            if (rg.tags && rg.tags.project) {
                rgToProjectMap[rg.name?.toLowerCase() || ''] = rg.tags.project;
            }
        }

        // Calculate dates
        const now = new Date();
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // 1. Fetch Actual Costs (Last Month)
        const actualResult = await costClient.query.usage(`subscriptions/${subscriptionId}`, {
            type: "Usage",
            timeframe: "Custom",
            timePeriod: { from: firstDayLastMonth, to: lastDayLastMonth },
            dataset: {
                granularity: "None",
                aggregation: { totalCost: { name: "PreTaxCost", function: "Sum" } },
                grouping: [{ type: "Dimension", name: "ResourceGroup" }]
            }
        });

        // 2. Fetch Projected Costs (Current Month)
        const forecastResult = await costClient.forecast.usage(`subscriptions/${subscriptionId}`, {
            type: "Usage",
            timeframe: "Custom",
            timePeriod: { from: firstDayThisMonth, to: lastDayThisMonth },
            dataset: {
                granularity: "Daily",
                aggregation: { totalCost: { name: "PreTaxCost", function: "Sum" } },
                grouping: [{ type: "Dimension", name: "ResourceGroup" }]
            } as any
        });

        const processResults = (result: any) => {
            const columns = result.columns || [];

            const costIdx = columns.findIndex((c: any) => c.name === "PreTaxCost" || c.name === "Cost");
            const rgIdx = columns.findIndex((c: any) => c.name === "ResourceGroup");
            const map: Record<string, number> = {};
            (result.rows || []).forEach((row: any) => {
                let rgValue = row[rgIdx] || "Unknown";
                // If the value is a full resource ID, extract the name portion
                const rgName = (rgValue.includes('/') ? rgValue.split('/').pop() : rgValue).toLowerCase();
                map[rgName] = row[costIdx] || 0;
            });
            return map;
        };

        const actualMap = processResults(actualResult);
        const forecastMap = processResults(forecastResult);

        // Aggregate by Project Tag
        const projectData: Record<string, { actual: number, projected: number }> = {};
        let otherActual = 0;
        let otherProjected = 0;

        // Combine all unique RGs from both actual and forecast
        const allRgs = new Set([...Object.keys(actualMap), ...Object.keys(forecastMap)]);

        allRgs.forEach(rgName => {
            const projectName = rgToProjectMap[rgName];
            const actual = actualMap[rgName] || 0;
            const projected = forecastMap[rgName] || 0;

            if (projectName) {
                if (!projectData[projectName]) projectData[projectName] = { actual: 0, projected: 0 };
                projectData[projectName].actual += actual;
                projectData[projectName].projected += projected;
            } else {
                otherActual += actual;
                otherProjected += projected;
            }
        });

        const breakdown = Object.entries(projectData)
            .map(([name, data]) => ({
                name,
                actual: data.actual,
                projected: data.projected
            }))
            .filter(item => item.actual > 1 || item.projected > 1)
            .sort((a, b) => a.name.localeCompare(b.name));

        if (otherActual > 1 || otherProjected > 1) {
            breakdown.push({ name: "Other", actual: otherActual, projected: otherProjected });
        }

        return NextResponse.json({
            breakdown,
            totalActual: breakdown.reduce((sum, item) => sum + item.actual, 0),
            totalProjected: breakdown.reduce((sum, item) => sum + item.projected, 0),
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600'
            }
        });

    } catch (error: any) {
        console.error("AZURE API ERROR [Cost by RG]:", error.message);
        return NextResponse.json(
            { error: "Failed to fetch cost breakdown", details: error.message },
            { status: 500 }
        );
    }
}
