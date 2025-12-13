import { NextResponse } from "next/server";
import { DefaultAzureCredential } from "@azure/identity";
import { CostManagementClient } from "@azure/arm-costmanagement";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const credential = new DefaultAzureCredential();
        const subscriptionId = "b2a80749-7cd2-4ef4-bb5b-fab5b010f275";
        const client = new CostManagementClient(credential);

        // Query January 2025 specifically
        const startDate = new Date("2025-01-01");
        const endDate = new Date("2025-01-31");

        const result = await client.query.usage(
            `subscriptions/${subscriptionId}`,
            {
                type: "Usage",
                timeframe: "Custom",
                timePeriod: {
                    from: startDate,
                    to: endDate,
                },
                dataset: {
                    granularity: "None",
                    aggregation: {
                        totalCost: {
                            name: "PreTaxCost",
                            function: "Sum",
                        },
                    },
                    grouping: [
                        {
                            type: "Dimension",
                            name: "ServiceName",
                        },
                    ],
                },
            }
        );

        // Parse results
        const columns = result.columns || [];
        const costIndex = columns.findIndex(c => c.name === "PreTaxCost");
        const serviceIndex = columns.findIndex(c => c.name === "ServiceName");

        const services = (result.rows || []).map((row) => ({
            service: row[serviceIndex],
            cost: row[costIndex],
        })).sort((a: any, b: any) => b.cost - a.cost);

        return NextResponse.json({
            month: "January 2025",
            totalCost: services.reduce((acc: number, s: any) => acc + s.cost, 0),
            breakdown: services.slice(0, 10), // Top 10 services
        });

    } catch (error: any) {
        console.error("AZURE API ERROR [Jan25 Debug]:", error.message);
        return NextResponse.json(
            { error: "Failed to fetch breakdown", details: error.message },
            { status: 500 }
        );
    }
}
