import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;
    const domain = process.env.JIRA_DOMAIN;
    const projectKey = process.env.JIRA_PROJECT_KEY;

    if (!email || !apiToken || !domain) {
        return NextResponse.json(
            { error: "Jira credentials not configured" },
            { status: 500 }
        );
    }

    try {
        // Fetch issues from the DT project using new API
        const jql = encodeURIComponent(`project = ${projectKey} ORDER BY created DESC`);
        const url = `https://${domain}/rest/api/3/search/jql?jql=${jql}&maxResults=50&fields=summary,status,assignee,priority,created,updated`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`,
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Jira API Error:", errorText);
            return NextResponse.json(
                { error: "Failed to fetch from Jira", details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Transform to simpler format
        const tasks = data.issues.map((issue: any) => ({
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status?.name || "Unknown",
            statusCategory: issue.fields.status?.statusCategory?.name || "Unknown",
            assignee: issue.fields.assignee?.displayName || "Unassigned",
            priority: issue.fields.priority?.name || "None",
            created: issue.fields.created,
            updated: issue.fields.updated
        }));

        return NextResponse.json({
            total: data.total,
            tasks
        });

    } catch (error: any) {
        console.error("Jira API Error:", error.message);
        return NextResponse.json(
            { error: "Failed to fetch Jira tasks", details: error.message },
            { status: 500 }
        );
    }
}
