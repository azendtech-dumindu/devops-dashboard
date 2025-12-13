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

    // Date Logic: Fetch from January 2025 to now
    const now = new Date();
    const fromDate = new Date("2025-01-01"); // Start from January 2025

    let debugInfo: any = {};
    try {
        debugInfo = {
            now: now.toISOString(),
            fromDate: fromDate.toISOString(),
            valid: {
                start: !isNaN(fromDate.getTime()),
                end: !isNaN(now.getTime())
            }
        };
        console.log("DEBUG DATES VARIANCE:", debugInfo);
    } catch (e) {
        debugInfo = { error: "Failed to parse dates", raw: e };
    }

    try {
        const credential = new DefaultAzureCredential();
        const subscriptionId = "b2a80749-7cd2-4ef4-bb5b-fab5b010f275";
        const client = new CostManagementClient(credential);

        const result = await client.query.usage(
            `subscriptions/${subscriptionId}`,
            {
                type: "Usage",
                timeframe: "Custom",
                timePeriod: {
                    from: fromDate,
                    to: now,
                },
                dataset: {
                    granularity: "Monthly",
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
                        }
                    ],
                },
            }
        );

        // Process Data
        const columns = result.columns || [];
        console.log("DEBUG VARIANCE COLS:", JSON.stringify(columns));
        if (result.rows && result.rows.length > 0) {
            console.log("DEBUG VARIANCE ROW[0]:", JSON.stringify(result.rows[0]));
        }

        const costIndex = columns.findIndex(c => c.name === "PreTaxCost");
        const dateIndex = columns.findIndex(c => c.name === "BillingMonth" || c.name === "UsageDate");
        const serviceIndex = columns.findIndex(c => c.name === "ServiceName");

        console.log("DEBUG INDICES:", { costIndex, dateIndex, serviceIndex });

        const serviceCosts: Record<string, { [key: string]: number }> = {};
        const months = new Set<string>();

        const currentMonthStr = now.toISOString().slice(0, 7); // Exclude current partial month

        (result.rows || []).forEach((row) => {
            const cost = row[costIndex];
            const rowDate = new Date(row[dateIndex]);
            const dateStr = !isNaN(rowDate.getTime()) ? rowDate.toISOString().slice(0, 7) : "Invalid";

            if (dateStr === "Invalid" || dateStr === currentMonthStr) return;

            const service = row[serviceIndex];
            months.add(dateStr);

            if (!serviceCosts[service]) serviceCosts[service] = {};
            serviceCosts[service][dateStr] = (serviceCosts[service][dateStr] || 0) + cost;
        });

        console.log("DEBUG MONTHS FOUND:", Array.from(months).sort());

        const sortedMonths = Array.from(months).sort();
        if (sortedMonths.length < 2) {
            console.log("DEBUG: Less than 2 months, returning empty");
            return NextResponse.json({ changes: [] });
        }

        // Rolling Window Variance
        // Calculate diff for each service for each consecutive pair of months
        let allChanges: any[] = [];

        for (let i = 1; i < sortedMonths.length; i++) {
            const prevMonth = sortedMonths[i - 1];
            const currMonth = sortedMonths[i];

            Object.entries(serviceCosts).forEach(([service, costs]) => {
                const prev = costs[prevMonth] || 0;
                const current = costs[currMonth] || 0;
                const diff = current - prev;

                // Threshold: Only care if change > $100
                if (Math.abs(diff) > 100) {
                    allChanges.push({
                        month: currMonth,
                        service,
                        diff,
                        prev,
                        current,
                        percentChange: prev > 0 ? ((diff / prev) * 100) : (current > 0 ? 100 : 0)
                    });
                }
            });
        }

        // Sort by date, then by absolute diff for same month
        const changes = allChanges
            .sort((a, b) => {
                if (a.month !== b.month) {
                    return a.month.localeCompare(b.month); // Chronological order
                }
                return Math.abs(b.diff) - Math.abs(a.diff); // Within same month, biggest first
            });

        const formattedChanges = changes.map(c => {
            const isIncrease = c.diff > 0;
            const impact = Math.abs(c.diff) > 100 ? "High" : (Math.abs(c.diff) > 50 ? "Medium" : "Low");
            // Nicer date format
            const [y, m] = c.month.split('-');
            const dateObj = new Date(parseInt(y), parseInt(m) - 1);
            const monthName = dateObj.toLocaleString('default', { month: 'short', year: '2-digit' });

            return {
                month: monthName,
                monthRaw: c.month, // Keep raw for sorting
                change: `${isIncrease ? '+' : '-'}$${Math.abs(c.diff).toFixed(2)}`,
                reason: `${c.service} ${isIncrease ? 'Increased' : 'Decreased'}`,
                impact: impact,
                rawDiff: c.diff
            };
        });

        const responseData = { changes: formattedChanges };
        cache.data = responseData;
        cache.lastFetched = Date.now();

        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error("AZURE API ERROR [Variance]:", JSON.stringify(error, null, 2));
        console.error("Message:", error.message);
        return NextResponse.json(
            { error: "Failed to fetch variance", details: error.message },
            { status: 500 }
        );
    }
}
