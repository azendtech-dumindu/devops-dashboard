import { NextResponse } from "next/server";
import { DefaultAzureCredential } from "@azure/identity";
import { CostManagementClient } from "@azure/arm-costmanagement";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const credential = new DefaultAzureCredential();
        // Use the specific subscription ID found earlier or env var
        const subscriptionId = "b2a80749-7cd2-4ef4-bb5b-fab5b010f275";

        // Initialize client
        const client = new CostManagementClient(credential);

        // Calculate billing period (Month to Date)
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const today = new Date();

        // Azure Cost Management Query
        // Querying for PreTaxCost aggregated over time
        const result = await client.query.usage(
            `subscriptions/${subscriptionId}`,
            {
                type: "Usage",
                timeframe: "MonthToDate",
                dataset: {
                    granularity: "None",
                    aggregation: {
                        totalCost: {
                            name: "PreTaxCost",
                            function: "Sum",
                        },
                    },
                },
            }
        );

        const actualCost = result.rows?.[0]?.[0] || 0;

        // Simple Linear Forecast
        // (Current Cost / Days Passed) * Total Days in Month
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysPassed = today.getDate();
        const runRate = daysPassed > 0 ? actualCost / daysPassed : 0;
        const forecastCost = runRate * daysInMonth;

        return NextResponse.json({
            actualCost,
            forecastCost,
            currency: result.columns?.[0]?.name || "USD", // Usually derived from column metadata
        });

    } catch (error: any) {
        console.error("Error fetching Azure costs:", error);
        return NextResponse.json(
            { error: "Failed to fetch cost data", details: error.message },
            { status: 500 }
        );
    }
}
