import { NextResponse } from "next/server";
import { DefaultAzureCredential } from "@azure/identity";
import { CostManagementClient } from "@azure/arm-costmanagement";

export const dynamic = 'force-dynamic';

// In-memory cache to prevent rate limiting
let costCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
    try {
        // Return cached data if still valid
        if (costCache && Date.now() - costCache.timestamp < CACHE_TTL_MS) {
            return NextResponse.json(costCache.data, {
                headers: { 'X-Cache': 'HIT' }
            });
        }

        const credential = new DefaultAzureCredential();
        // Use the specific subscription ID found earlier or env var
        const subscriptionId = "b2a80749-7cd2-4ef4-bb5b-fab5b010f275";

        // Initialize client
        const client = new CostManagementClient(credential);

        // Calculate billing period (Month to Date)
        const now = new Date();
        const today = new Date();

        // Query for Current Month (Actual)
        const currentResult = await client.query.usage(
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

        // Calculate Last Month range
        const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfLastMonth = new Date(firstDayOfCurrentMonth);
        lastDayOfLastMonth.setDate(0); // Last day of previous month
        const firstDayOfLastMonth = new Date(lastDayOfLastMonth.getFullYear(), lastDayOfLastMonth.getMonth(), 1);

        // Query for Last Month (Actual) - using Custom timeframe
        const lastMonthResult = await client.query.usage(
            `subscriptions/${subscriptionId}`,
            {
                type: "Usage",
                timeframe: "Custom",
                timePeriod: {
                    from: firstDayOfLastMonth,
                    to: lastDayOfLastMonth
                },
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

        const actualCost = currentResult.rows?.[0]?.[0] || 0;
        const lastMonthCost = lastMonthResult.rows?.[0]?.[0] || 0;

        // Simple Linear Forecast
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysPassed = today.getDate();
        const runRate = daysPassed > 0 ? actualCost / daysPassed : 0;
        const forecastCost = runRate * daysInMonth;

        const responseData = {
            actualCost,
            forecastCost,
            lastMonthCost,
            currency: currentResult.columns?.[0]?.name || "USD",
        };

        // Store in cache
        costCache = { data: responseData, timestamp: Date.now() };

        return NextResponse.json(responseData, {
            headers: { 'X-Cache': 'MISS' }
        });

    } catch (error: any) {
        console.error("Error fetching Azure costs:", error);
        return NextResponse.json(
            { error: "Failed to fetch cost data", details: error.message },
            { status: 500 }
        );
    }
}
