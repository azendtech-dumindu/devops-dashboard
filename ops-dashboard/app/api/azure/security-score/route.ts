import { NextResponse } from "next/server";
import { DefaultAzureCredential } from "@azure/identity";
import { SecurityCenter } from "@azure/arm-security";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const credential = new DefaultAzureCredential();
        const subscriptionId = "b2a80749-7cd2-4ef4-bb5b-fab5b010f275";
        const client = new SecurityCenter(credential, subscriptionId);

        // Fetch security assessments
        const assessments: any[] = [];
        const statusCounts = {
            Healthy: 0,
            Unhealthy: 0,
            NotApplicable: 0,
        };

        for await (const assessment of client.assessments.list(`subscriptions/${subscriptionId}`)) {
            const status = assessment.status?.code || "Unknown";
            if (status === "Healthy") statusCounts.Healthy++;
            else if (status === "Unhealthy") statusCounts.Unhealthy++;
            else if (status === "NotApplicable") statusCounts.NotApplicable++;

            assessments.push({
                name: assessment.displayName || assessment.name,
                status: status,
                description: assessment.status?.description,
            });
        }

        // Calculate score: Healthy / (Healthy + Unhealthy)
        const applicable = statusCounts.Healthy + statusCounts.Unhealthy;
        const scorePercentage = applicable > 0
            ? Math.round((statusCounts.Healthy / applicable) * 100)
            : 0;

        const responseData = {
            enabled: true,
            scorePercentage,
            healthy: statusCounts.Healthy,
            unhealthy: statusCounts.Unhealthy,
            notApplicable: statusCounts.NotApplicable,
            totalAssessments: assessments.length,
            assessments: assessments.filter(a => a.status === "Unhealthy").slice(0, 10), // Top 10 unhealthy
        };

        return NextResponse.json(responseData, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' // Cache for 1 hour
            }
        });

    } catch (error: any) {
        console.error("AZURE SECURITY API ERROR:", error.message);

        return NextResponse.json(
            {
                enabled: false,
                error: "Failed to fetch security score",
                details: error.message,
                scorePercentage: null,
            },
            { status: 500 }
        );
    }
}
