import { DefaultAzureCredential } from "@azure/identity";
import { CostManagementClient } from "@azure/arm-costmanagement";
import { ResourceManagementClient } from "@azure/arm-resources";

async function main() {
    const credential = new DefaultAzureCredential();
    const subscriptionId = "b2a80749-7cd2-4ef4-bb5b-fab5b010f275";
    const costClient = new CostManagementClient(credential);
    const resourceClient = new ResourceManagementClient(credential, subscriptionId);

    // 1. Get tagged RGs
    const taggedRgs = new Set<string>();
    for await (const rg of resourceClient.resourceGroups.list()) {
        if (rg.tags && rg.tags.project) {
            taggedRgs.add(rg.name?.toLowerCase() || "");
        }
    }

    // 2. Define dates (Last month)
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // 3. Query Costs
    const result = await costClient.query.usage(
        `subscriptions/${subscriptionId}`,
        {
            type: "Usage",
            timeframe: "Custom",
            timePeriod: { from: startDate, to: endDate },
            dataset: {
                granularity: "None",
                aggregation: {
                    totalCost: { name: "PreTaxCost", function: "Sum" }
                },
                grouping: [{ type: "Dimension", name: "ResourceGroup" }]
            }
        }
    );

    const columns = result.columns || [];
    const costIndex = columns.findIndex(c => c.name === "PreTaxCost");
    const rgIndex = columns.findIndex(c => c.name === "ResourceGroup");

    const untaggedCosts = result.rows
        ?.map(row => ({
            name: row[rgIndex],
            cost: row[costIndex]
        }))
        .filter(item => !taggedRgs.has(item.name.toLowerCase()) && item.cost > 0.01)
        .sort((a, b) => b.cost - a.cost);

    console.log(JSON.stringify(untaggedCosts, null, 2));
}

main().catch(console.error);
