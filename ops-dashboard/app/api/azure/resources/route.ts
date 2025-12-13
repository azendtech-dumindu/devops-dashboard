import { NextResponse } from "next/server";
import { DefaultAzureCredential } from "@azure/identity";
import { ResourceManagementClient } from "@azure/arm-resources";

export const dynamic = 'force-dynamic';

let cache = {
    data: null as any,
    lastFetched: 0
};
const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes

export async function GET() {
    // Check cache
    if (cache.data && (Date.now() - cache.lastFetched < CACHE_DURATION)) {
        return NextResponse.json(cache.data);
    }

    try {
        const credential = new DefaultAzureCredential();
        const subscriptionId = "b2a80749-7cd2-4ef4-bb5b-fab5b010f275";
        const client = new ResourceManagementClient(credential, subscriptionId);

        const resources: any[] = [];

        // Fetch all resources in the subscription
        for await (const resource of client.resources.list()) {
            resources.push({
                id: resource.id,
                name: resource.name,
                type: resource.type?.split('/').pop() || resource.type, // Get just the resource type name
                fullType: resource.type,
                location: resource.location,
                resourceGroup: resource.id?.split('/')[4] || "Unknown",
                tags: resource.tags || {},
            });
        }

        // Sort by type then by name
        resources.sort((a, b) => {
            if (a.type !== b.type) return a.type.localeCompare(b.type);
            return a.name.localeCompare(b.name);
        });

        const responseData = {
            total: resources.length,
            resources
        };

        cache.data = responseData;
        cache.lastFetched = Date.now();

        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error("AZURE API ERROR [Resources]:", error.message);
        return NextResponse.json(
            { error: "Failed to fetch resources", details: error.message },
            { status: 500 }
        );
    }
}
