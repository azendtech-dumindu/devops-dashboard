import { NextResponse } from "next/server";

// Azure DevOps API - Fetch all projects
// Requires AZURE_DEVOPS_ORG and AZURE_DEVOPS_PAT environment variables

export async function GET() {
    const org = process.env.AZURE_DEVOPS_ORG;
    const pat = process.env.AZURE_DEVOPS_PAT;

    if (!org || !pat) {
        return NextResponse.json(
            {
                error: "Azure DevOps credentials not configured",
                message: "Set AZURE_DEVOPS_ORG and AZURE_DEVOPS_PAT environment variables"
            },
            { status: 500 }
        );
    }

    try {
        const auth = Buffer.from(`:${pat}`).toString("base64");
        const headers = {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/json",
        };

        const projectsUrl = `https://dev.azure.com/${org}/_apis/projects?api-version=7.1`;
        const response = await fetch(projectsUrl, { headers });

        if (!response.ok) {
            console.error("Failed to fetch projects:", response.status);
            return NextResponse.json(
                { error: `Failed to fetch projects: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        const projects = (data.value || []).map((proj: any) => ({
            id: proj.id,
            name: proj.name,
            description: proj.description || "",
            url: proj.url,
            state: proj.state,
            visibility: proj.visibility,
            lastUpdateTime: proj.lastUpdateTime,
        }));

        return NextResponse.json({
            projects,
            count: projects.length,
        });
    } catch (error) {
        console.error("Error fetching projects:", error);
        return NextResponse.json(
            { error: "Failed to fetch projects" },
            { status: 500 }
        );
    }
}
