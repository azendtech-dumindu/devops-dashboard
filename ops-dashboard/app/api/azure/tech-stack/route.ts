import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Saral repos to scan
const REPOS = [
    { name: "SaralFrontend", type: "frontend" },
    { name: "SaralBackend", type: "backend" },
];

// Files to look for
const FILE_PATTERNS = {
    frontend: ["package.json"],
    backend: ["Dockerfile", "*.csproj"],
};

interface TechStackItem {
    category: string;
    name: string;
    version: string;
    type: "runtime" | "framework" | "dependency" | "image";
}

export async function GET() {
    const org = process.env.AZURE_DEVOPS_ORG;
    const pat = process.env.AZURE_DEVOPS_PAT;
    const project = "Saral";

    if (!org || !pat) {
        return NextResponse.json(
            { error: "Azure DevOps credentials not configured" },
            { status: 500 }
        );
    }

    const auth = Buffer.from(`:${pat}`).toString("base64");
    const headers = {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
    };

    const techStack: TechStackItem[] = [];

    try {
        for (const repo of REPOS) {
            // Get items in root of repo
            const itemsUrl = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo.name}/items?recursionLevel=OneLevel&api-version=7.1`;
            const itemsRes = await fetch(itemsUrl, { headers });

            if (!itemsRes.ok) {
                console.error(`Failed to fetch items from ${repo.name}:`, itemsRes.status);
                continue;
            }

            const itemsData = await itemsRes.json();
            const items = itemsData.value || [];

            // Process frontend repo - look for package.json
            if (repo.type === "frontend") {
                const packageJson = items.find((i: any) => i.path === "/package.json");
                if (packageJson) {
                    const content = await fetchFileContent(org, project, repo.name, "/package.json", headers);
                    if (content) {
                        const parsed = JSON.parse(content);

                        // Extract key dependencies
                        const deps = { ...parsed.dependencies, ...parsed.devDependencies };

                        // React
                        if (deps.react) {
                            techStack.push({ category: "Frontend", name: "React", version: deps.react, type: "framework" });
                        }
                        // Next.js
                        if (deps.next) {
                            techStack.push({ category: "Frontend", name: "Next.js", version: deps.next, type: "framework" });
                        }
                        // TypeScript
                        if (deps.typescript) {
                            techStack.push({ category: "Frontend", name: "TypeScript", version: deps.typescript, type: "runtime" });
                        }
                        // Vite
                        if (deps.vite) {
                            techStack.push({ category: "Frontend", name: "Vite", version: deps.vite, type: "framework" });
                        }
                        // Angular
                        if (deps["@angular/core"]) {
                            techStack.push({ category: "Frontend", name: "Angular", version: deps["@angular/core"], type: "framework" });
                        }
                        // Vue
                        if (deps.vue) {
                            techStack.push({ category: "Frontend", name: "Vue", version: deps.vue, type: "framework" });
                        }
                        // Node engine
                        if (parsed.engines?.node) {
                            techStack.push({ category: "Frontend", name: "Node.js", version: parsed.engines.node, type: "runtime" });
                        }
                    }
                }
            }

            // Process backend repo - look for Dockerfile and .csproj in full tree
            if (repo.type === "backend") {
                // Get full tree to find all files
                const fullTreeUrl = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo.name}/items?recursionLevel=Full&api-version=7.1`;
                const fullTreeRes = await fetch(fullTreeUrl, { headers });

                if (!fullTreeRes.ok) {
                    console.error(`Failed to fetch full tree from ${repo.name}:`, fullTreeRes.status);
                    continue;
                }

                const fullTreeData = await fullTreeRes.json();
                const allItems = fullTreeData.value || [];

                // Find Dockerfile
                const dockerfile = allItems.find((i: any) =>
                    i.path.endsWith("/Dockerfile") || i.path === "/Dockerfile"
                );
                if (dockerfile) {
                    const content = await fetchFileContent(org, project, repo.name, dockerfile.path, headers);
                    if (content) {
                        // Parse FROM lines
                        const fromLines = content.match(/^FROM\s+([^\s]+)/gm) || [];
                        for (const line of fromLines) {
                            const image = line.replace(/^FROM\s+/, "").trim();
                            // Skip build args like $DOTNET_SDK_VERSION
                            if (image.startsWith("$")) continue;
                            // Extract image name and version
                            const [imageName, version] = image.split(":");
                            const shortName = imageName.split("/").pop() || imageName;
                            techStack.push({
                                category: "Infrastructure",
                                name: shortName,
                                version: version || "latest",
                                type: "image"
                            });
                        }
                    }
                }

                // Check Directory.Build.props for TargetFramework (central config)
                const dirBuildProps = allItems.find((i: any) => i.path === "/Directory.Build.props");
                if (dirBuildProps) {
                    const content = await fetchFileContent(org, project, repo.name, "/Directory.Build.props", headers);
                    if (content) {
                        // Remove XML comments before matching
                        const contentNoComments = content.replace(/<!--[\s\S]*?-->/g, "");
                        const tfMatch = contentNoComments.match(/<TargetFramework>([^<]+)<\/TargetFramework>/);
                        if (tfMatch) {
                            techStack.push({
                                category: "Backend",
                                name: ".NET",
                                version: tfMatch[1],
                                type: "runtime"
                            });
                        }
                    }
                }

                // Check Directory.Packages.props for centralized package versions
                const dirPackagesProps = allItems.find((i: any) => i.path === "/Directory.Packages.props");
                if (dirPackagesProps) {
                    const content = await fetchFileContent(org, project, repo.name, "/Directory.Packages.props", headers);
                    if (content) {
                        // Extract PackageVersion entries
                        const packageVersions = content.matchAll(/<PackageVersion\s+Include="([^"]+)"\s+Version="([^"]+)"/g);
                        for (const match of packageVersions) {
                            const pkgName = match[1];
                            const pkgVersion = match[2];
                            // Only include essential packages (skip sub-packages like Design, Tools, etc.)
                            const essentialPackages = [
                                "Microsoft.EntityFrameworkCore",
                                "Npgsql.EntityFrameworkCore.PostgreSQL",
                                "Serilog",
                                "Swashbuckle.AspNetCore",
                            ];
                            if (essentialPackages.includes(pkgName)) {
                                // Use friendly names
                                const friendlyNames: Record<string, string> = {
                                    "Microsoft.EntityFrameworkCore": "EF Core",
                                    "Npgsql.EntityFrameworkCore.PostgreSQL": "PostgreSQL",
                                    "Serilog": "Serilog",
                                    "Swashbuckle.AspNetCore": "Swagger",
                                };
                                techStack.push({
                                    category: "Backend",
                                    name: friendlyNames[pkgName] || pkgName,
                                    version: pkgVersion,
                                    type: "dependency"
                                });
                            }
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            techStack,
            repos: REPOS.map(r => r.name),
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        console.error("Error fetching tech stack:", error);
        return NextResponse.json(
            { error: "Failed to fetch tech stack", details: error.message },
            { status: 500 }
        );
    }
}

async function fetchFileContent(
    org: string,
    project: string,
    repo: string,
    path: string,
    headers: Record<string, string>
): Promise<string | null> {
    try {
        const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/items?path=${encodeURIComponent(path)}&api-version=7.1`;
        const res = await fetch(url, { headers });
        if (!res.ok) return null;
        return await res.text();
    } catch {
        return null;
    }
}
