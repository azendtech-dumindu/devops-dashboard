import { NextRequest, NextResponse } from "next/server";

// Azure DevOps API requires a PAT (Personal Access Token)
// Set these environment variables:
// - AZURE_DEVOPS_ORG: Your organization name
// - AZURE_DEVOPS_PAT: Personal Access Token with Build (Read) permissions

export async function GET(request: NextRequest) {
    const org = process.env.AZURE_DEVOPS_ORG;
    const pat = process.env.AZURE_DEVOPS_PAT;

    // Get projects from query params (comma-separated)
    const searchParams = request.nextUrl.searchParams;
    const projectsParam = searchParams.get("projects");
    const includeScans = searchParams.get("includeScans") === "true";
    const selectedProjects = projectsParam ? projectsParam.split(",").map(p => p.trim()) : [];

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
        // Base64 encode the PAT for Basic Auth (format is :PAT)
        const auth = Buffer.from(`:${pat}`).toString("base64");
        const headers = {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/json",
        };

        let allBuilds: any[] = [];
        let projectsToFetch: string[] = selectedProjects;

        // If no specific projects provided, fetch all projects first
        if (projectsToFetch.length === 0) {
            const projectsUrl = `https://dev.azure.com/${org}/_apis/projects?api-version=7.1`;
            const projectsResponse = await fetch(projectsUrl, { headers });

            if (!projectsResponse.ok) {
                console.error("Failed to fetch projects:", projectsResponse.status);
                return NextResponse.json(
                    { error: `Failed to fetch projects: ${projectsResponse.status}` },
                    { status: projectsResponse.status }
                );
            }

            const projectsData = await projectsResponse.json();
            projectsToFetch = (projectsData.value || []).map((p: any) => p.name);
        }

        // Fetch builds from selected projects in parallel
        const buildPromises = projectsToFetch.map((projectName: string) =>
            fetchBuildsForProject(org, projectName, headers).catch(() => [])
        );

        const allBuildArrays = await Promise.all(buildPromises);
        for (const builds of allBuildArrays) {
            allBuilds.push(...builds);
        }

        // Sort by start time (most recent first)
        allBuilds.sort((a, b) => new Date(b.startTime || b.queueTime).getTime() - new Date(a.startTime || a.queueTime).getTime());

        // Limit total builds. If scans included, be more conservative with parallel calls.
        const limitCount = includeScans ? 20 : 100;
        const recentBuilds = allBuilds.slice(0, limitCount);

        // Fetch scan results if requested
        let scanResults: Record<number, any> = {};
        if (includeScans) {
            const timelinePromises = recentBuilds.map(build =>
                fetchScanResults(org, build.project.name, build.id, headers).catch(() => null)
            );
            const results = await Promise.all(timelinePromises);
            results.forEach((res, index) => {
                if (res) scanResults[recentBuilds[index].id] = res;
            });
        }

        // Transform the data for the frontend
        const formattedRuns = recentBuilds.map((build: any) => ({
            id: build.id,
            name: build.buildNumber || `Build #${build.id}`,
            pipelineName: build.definition?.name || "Unknown Pipeline",
            pipelineId: build.definition?.id,
            projectName: build.project?.name || "Unknown Project",
            state: build.status, // notStarted, inProgress, completed, cancelling, postponed, notSet
            result: build.result, // succeeded, failed, canceled, partiallySucceeded, none
            createdDate: build.queueTime,
            startedDate: build.startTime,
            finishedDate: build.finishTime,
            url: build._links?.web?.href || `https://dev.azure.com/${org}/${build.project?.name}/_build/results?buildId=${build.id}`,
            sourceBranch: build.sourceBranch?.replace("refs/heads/", ""),
            requestedBy: build.requestedBy?.displayName || build.requestedFor?.displayName,
            scans: scanResults[build.id] || null
        }));

        return NextResponse.json({
            runs: formattedRuns,
            count: formattedRuns.length,
        });
    } catch (error) {
        console.error("Error fetching pipeline runs:", error);
        return NextResponse.json(
            { error: "Failed to fetch pipeline runs" },
            { status: 500 }
        );
    }
}

async function fetchBuildsForProject(org: string, projectName: string, headers: Record<string, string>): Promise<any[]> {
    const buildsUrl = `https://dev.azure.com/${org}/${encodeURIComponent(projectName)}/_apis/build/builds?api-version=7.1&$top=100`;

    const response = await fetch(buildsUrl, { headers });

    if (!response.ok) {
        throw new Error(`Failed to fetch builds: ${response.status}`);
    }

    const data = await response.json();
    return data.value || [];
}

async function fetchScanResults(org: string, project: string, buildId: number, headers: Record<string, string>) {
    const timelineUrl = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/build/builds/${buildId}/timeline?api-version=7.1`;
    const response = await fetch(timelineUrl, { headers });

    if (!response.ok) return null;

    const data = await response.json();
    const records = data.records || [];

    // Find Sonar and Trivy tasks
    const sonarTask = records.find((r: any) => r.name?.includes("SonarCloud Analysis") || r.name?.includes("SonarQube Analysis"));
    const trivyTask = records.find((r: any) => r.name?.includes("Trivy Container Scan") || r.name?.includes("Trivy Scan"));

    return {
        sonar: sonarTask ? {
            status: sonarTask.result || sonarTask.state,
            name: sonarTask.name
        } : null,
        trivy: trivyTask ? {
            status: trivyTask.result || trivyTask.state,
            name: trivyTask.name
        } : null
    };
}
