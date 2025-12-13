import { NextResponse } from "next/server";
import { DefaultAzureCredential } from "@azure/identity";
import { CostManagementClient } from "@azure/arm-costmanagement";

export const dynamic = 'force-dynamic';

let cache = {
    data: null as any,
    lastFetched: 0
};
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

export async function GET() {
    // Check cache
    if (cache.data && (Date.now() - cache.lastFetched < CACHE_DURATION)) {
        return NextResponse.json(cache.data);
    }

    try {
        const credential = new DefaultAzureCredential();
        const subscriptionId = "b2a80749-7cd2-4ef4-bb5b-fab5b010f275";
        const client = new CostManagementClient(credential);

        // Calculate dates: January 2025 to now
        const now = new Date();
        const endDate = new Date(now);
        const startDate = new Date("2025-01-01"); // Start from January 2025

        // Format for API (ISO string)
        // Note: Cost Management usually expects specific timeframe or custom range

        // Using query.usage with Custom timeframe
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
                    granularity: "Monthly",
                    aggregation: {
                        totalCost: {
                            name: "PreTaxCost",
                            function: "Sum",
                        },
                    },
                },
            }
        );

        // Transform result for Tremor (Array of { date: "Mon YY", Cost: 123 })
        // The result.rows format is usually [ [cost, currency, date (number/string)] ]
        // Need to verify column mapping via result.columns

        const columns = result.columns || [];
        console.log("DEBUG COLS HISTORY:", JSON.stringify(columns));
        if (result.rows && result.rows.length > 0) {
            console.log("DEBUG ROW[0] HISTORY:", JSON.stringify(result.rows[0]));
        }

        const costIndex = columns.findIndex(c => c.name === "PreTaxCost");
        const dateIndex = columns.findIndex(c => c.name === "BillingMonth" || c.name === "UsageDate");

        const history = (result.rows || []).map((row) => {
            const rawDate = new Date(row[dateIndex]);
            const monthStr = !isNaN(rawDate.getTime()) ? rawDate.toLocaleString('default', { month: 'short', year: '2-digit' }) : "Invalid";
            return {
                date: monthStr,
                rawDate: rawDate,
                Cost: row[costIndex],
                Forecast: null as number | null
            };
        });

        // Sort chronologically
        history.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

        // Calculate forecast for current month (Dec 25)
        const currentDate = new Date();
        const currentMonthStr = currentDate.toLocaleString('default', { month: 'short', year: '2-digit' });
        const dayOfMonth = currentDate.getDate();
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

        history.forEach(item => {
            if (item.date === currentMonthStr && dayOfMonth < daysInMonth) {
                // Calculate projected full month based on daily burn rate
                const dailyRate = item.Cost / dayOfMonth;
                item.Forecast = dailyRate * daysInMonth;
            }
        });

        // Remove rawDate before sending response
        const cleanHistory = history.map(({ rawDate, ...rest }) => rest);

        const responseData = { history: cleanHistory };
        cache.data = responseData;
        cache.lastFetched = Date.now();

        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error("AZURE API ERROR [History]:", JSON.stringify(error, null, 2));
        console.error("Message:", error.message);
        return NextResponse.json(
            { error: "Failed to fetch history", details: error.message },
            { status: 500 }
        );
    }
}
