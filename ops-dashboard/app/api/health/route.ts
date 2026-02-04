import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const ENVIRONMENTS = [
    { name: "Aqua", url: "https://aqua.saral.digital", backendUrl: "https://api-aqua.saral.digital/health" },
    { name: "Aer", url: "https://aer.saral.digital", backendUrl: "https://api-aer.saral.digital/health" },
    { name: "Ignis", url: "https://ignis.saral.digital", backendUrl: "https://api-ignis.saral.digital/health" },
    { name: "Terra", url: "https://terra.saral.digital", backendUrl: "https://api-terra.saral.digital/health" },
];

export async function GET() {
    const healthChecks = await Promise.all(
        ENVIRONMENTS.map(async (env) => {
            const checkUrl = async (url: string) => {
                const start = Date.now();
                try {
                    const response = await fetch(url, {
                        method: 'GET',
                        cache: 'no-store',
                        signal: AbortSignal.timeout(5000),
                    });
                    return {
                        status: response.ok ? "healthy" : "unhealthy",
                        latency: Date.now() - start,
                    };
                } catch (error) {
                    return {
                        status: "unhealthy",
                        latency: null,
                    };
                }
            };

            const [frontend, backend] = await Promise.all([
                checkUrl(env.url),
                checkUrl(env.backendUrl)
            ]);

            return {
                name: env.name,
                url: env.url,
                status: frontend.status,
                responseTime: frontend.latency,
                backendStatus: backend.status,
                backendResponseTime: backend.latency,
            };
        })
    );

    return NextResponse.json({
        environments: healthChecks,
        timestamp: new Date().toISOString(),
    });
}
