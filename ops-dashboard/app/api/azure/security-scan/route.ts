import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Cache for security scan results (1 hour TTL)
interface CacheEntry {
    data: any;
    timestamp: number;
}
let scanCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Package ecosystem mapping for OSV.dev
const ECOSYSTEM_MAP: Record<string, string> = {
    // Frontend (npm)
    "React": "npm",
    "TypeScript": "npm",
    "Vite": "npm",
    "Node.js": "npm",
    "Next.js": "npm",
    "Vue": "npm",
    "Angular": "npm",
    // Backend (NuGet)
    ".NET": "NuGet",
    "EF Core": "NuGet",
    "PostgreSQL": "NuGet",
    "Serilog": "NuGet",
    "Swagger": "NuGet",
};

// Package name mapping for OSV queries
const PACKAGE_NAME_MAP: Record<string, string> = {
    "React": "react",
    "TypeScript": "typescript",
    "Vite": "vite",
    "Node.js": "node",
    "Next.js": "next",
    ".NET": "Microsoft.NETCore.App",
    "EF Core": "Microsoft.EntityFrameworkCore",
    "PostgreSQL": "Npgsql.EntityFrameworkCore.PostgreSQL",
    "Serilog": "Serilog",
    "Swagger": "Swashbuckle.AspNetCore",
};

interface VulnResult {
    package: string;
    version: string;
    ecosystem: string;
    vulnerabilities: {
        id: string;
        severity: string;
        summary: string;
        fixed?: string;
    }[];
    status: "safe" | "warning" | "critical" | "unknown";
}

export async function GET() {
    // Check cache first
    if (scanCache && (Date.now() - scanCache.timestamp) < CACHE_TTL_MS) {
        return NextResponse.json({
            ...scanCache.data,
            cached: true,
        });
    }

    try {
        // Fetch tech stack from existing endpoint
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

        const techStackRes = await fetch(`${baseUrl}/api/azure/tech-stack`);
        if (!techStackRes.ok) {
            throw new Error("Failed to fetch tech stack");
        }

        const techStackData = await techStackRes.json();
        const packages = techStackData.techStack || [];

        // Query OSV for each package
        const results: VulnResult[] = [];

        // Find .NET SDK version from Docker images for proper vulnerability checking
        const sdkImage = packages.find((p: any) =>
            p.category === "Infrastructure" && p.name === "sdk"
        );
        const dotnetSdkVersion = sdkImage?.version?.replace(/-alpine|-bullseye|-jammy/g, "").trim();

        for (const pkg of packages) {
            // Skip Docker images in the scan (they're just for context)
            if (pkg.category === "Infrastructure") {
                continue;
            }

            const ecosystem = ECOSYSTEM_MAP[pkg.name];
            let packageName = PACKAGE_NAME_MAP[pkg.name] || pkg.name;

            if (!ecosystem) {
                results.push({
                    package: pkg.name,
                    version: pkg.version,
                    ecosystem: "unknown",
                    vulnerabilities: [],
                    status: "unknown",
                });
                continue;
            }

            // Clean version string (remove ^, >=, etc.)
            let cleanVersion = pkg.version.replace(/[\^~>=<]/g, "").trim();

            // Handle .NET runtime version - use SDK version from Dockerfile if available
            if (pkg.name === ".NET") {
                if (cleanVersion.startsWith("net")) {
                    // Convert net9.0 -> 9.0.0 format for OSV query
                    const majorMinor = cleanVersion.replace("net", "");
                    cleanVersion = dotnetSdkVersion || `${majorMinor}.0`;
                }
                // Query as Microsoft.NETCore.App.Runtime.linux-x64 for better results
                packageName = "Microsoft.NETCore.App";
            }

            try {
                const vulns = await queryOSV(packageName, cleanVersion, ecosystem);
                const status = getStatus(vulns);

                results.push({
                    package: pkg.name,
                    version: pkg.version + (pkg.name === ".NET" && dotnetSdkVersion ? ` (SDK ${dotnetSdkVersion})` : ""),
                    ecosystem,
                    vulnerabilities: vulns,
                    status,
                });
            } catch (error) {
                console.error(`Error querying OSV for ${pkg.name}:`, error);
                results.push({
                    package: pkg.name,
                    version: pkg.version,
                    ecosystem,
                    vulnerabilities: [],
                    status: "unknown",
                });
            }
        }

        // Calculate summary
        const summary = {
            total: results.length,
            critical: results.filter(r => r.status === "critical").length,
            warning: results.filter(r => r.status === "warning").length,
            safe: results.filter(r => r.status === "safe").length,
            unknown: results.filter(r => r.status === "unknown").length,
        };

        const responseData = {
            results,
            summary,
            timestamp: new Date().toISOString(),
        };

        // Update cache
        scanCache = {
            data: responseData,
            timestamp: Date.now(),
        };

        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error("Security scan error:", error);
        return NextResponse.json(
            { error: "Security scan failed", details: error.message },
            { status: 500 }
        );
    }
}

async function queryOSV(
    packageName: string,
    version: string,
    ecosystem: string
): Promise<{ id: string; severity: string; summary: string; fixed?: string }[]> {
    const response = await fetch("https://api.osv.dev/v1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            package: { name: packageName, ecosystem },
            version,
        }),
    });

    if (!response.ok) {
        throw new Error(`OSV API error: ${response.status}`);
    }

    const data = await response.json();
    const vulns = data.vulns || [];

    return vulns.map((v: any) => {
        // Determine severity from database_specific or severity array
        let severity = "unknown";
        if (v.severity && v.severity.length > 0) {
            const score = v.severity[0].score;
            if (score >= 9.0) severity = "critical";
            else if (score >= 7.0) severity = "high";
            else if (score >= 4.0) severity = "medium";
            else severity = "low";
        } else if (v.database_specific?.severity) {
            severity = v.database_specific.severity.toLowerCase();
        }

        // Find fixed version
        let fixed: string | undefined;
        if (v.affected && v.affected.length > 0) {
            const ranges = v.affected[0].ranges || [];
            for (const range of ranges) {
                const fixedEvent = range.events?.find((e: any) => e.fixed);
                if (fixedEvent) {
                    fixed = fixedEvent.fixed;
                    break;
                }
            }
        }

        return {
            id: v.id,
            severity,
            summary: v.summary || v.details?.substring(0, 100) || "No description",
            fixed,
        };
    });
}

function getStatus(vulns: { severity: string }[]): "safe" | "warning" | "critical" {
    if (vulns.length === 0) return "safe";
    if (vulns.some(v => v.severity === "critical" || v.severity === "high")) {
        return "critical";
    }
    return "warning";
}
