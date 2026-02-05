"use client";

import { Card, ProgressBar } from "@tremor/react";
import Link from "next/link";
import useSWR from "swr";
import { useModuleVisibility } from "@/lib/useModuleVisibility";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const { data: costData, isLoading: costLoading } = useSWR("/api/azure/cost", fetcher);
  const { data: jiraData, isLoading: jiraLoading } = useSWR("/api/jira/tasks", fetcher);
  const { data: securityData, isLoading: securityLoading } = useSWR("/api/azure/security-score", fetcher);
  const { isHrefVisible, mounted } = useModuleVisibility();

  // --- Process Cost Data ---
  const { actualCost = 0, forecastCost = 0, lastMonthCost = 0 } = costData || {};
  const costProgress = forecastCost > 0 ? Math.round((actualCost / forecastCost) * 100) : 0;
  const costDiff = forecastCost - lastMonthCost;
  const costDiffFormatted = `${costDiff >= 0 ? '+' : ''}${costDiff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // --- Process Jira Data ---
  const tasks = jiraData?.tasks || [];
  const uniqueProjects = new Set(tasks.map((task: any) => {
    const summary = task.summary;
    if (summary.startsWith("[Saral]")) return "Saral";
    if (summary.startsWith("[DM]")) return "Device Management";
    if (summary.toLowerCase().includes("soliyana")) return "Soliyana";
    if (summary.startsWith("Bug") || summary.includes("Bug ")) return "Bug Fixes";
    return "Other";
  }));
  const projectCount = uniqueProjects.size;
  const completedTasks = tasks.filter((t: any) => t.statusCategory === "Done").length;
  const completionPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  // --- Process Security Data ---
  const securityScore = securityData?.scorePercentage || 0;
  const healthyCount = securityData?.healthy || 0;

  const allKpis = [
    {
      id: "spend",
      title: "Cost",
      metric: costLoading ? null : `$${forecastCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      comparison: costLoading ? null : costDiffFormatted,
      actual: costLoading ? null : `$${actualCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      bottomLabel: "Current",
      progress: costProgress,
      href: "/cloud-spend",
      loading: costLoading,
    },
    {
      id: "azure",
      title: "Defense",
      metric: securityLoading ? null : `${securityScore}%`,
      progress: securityScore,
      target: `${healthyCount} healthy`,
      bottomLabel: "Defense",
      href: "/azure",
      loading: securityLoading,
    },
  ];

  // Filter KPIs based on module visibility
  const kpis = mounted ? allKpis.filter(kpi => isHrefVisible(kpi.href)) : allKpis;

  // Show loading state until mounted
  if (!mounted) {
    return (
      <main>
        <h1 className="text-2xl font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">Executive Summary</h1>
        <div className="mt-6 flex items-center justify-center h-40">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <h1 className="text-2xl font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">Executive Summary</h1>

      {kpis.length === 0 ? (
        <div className="mt-6">
          <Card>
            <div className="py-12 text-center">
              <p className="text-tremor-content text-gray-500">No modules enabled.</p>
              <p className="text-sm text-gray-400 mt-2">Use Settings to enable modules.</p>
            </div>
          </Card>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${kpis.length === 1 ? '' : kpis.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} mt-6 gap-6`}>
          {kpis.map((item) => (
            item.href ? (
              <Link key={item.id} href={item.href} className="block">
                <KpiCard item={item} />
              </Link>
            ) : (
              <div key={item.id}>
                <KpiCard item={item} />
              </div>
            )
          ))}
        </div>
      )}
    </main>
  );
}

function KpiCard({ item }: { item: any }) {
  if (item.loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-12"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="h-2 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </Card>
    );
  }

  const isCost = item.id === "spend";

  return (
    <Card className="hover:bg-gray-50 transition-colors cursor-pointer dark:hover:bg-gray-900 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div className="truncate">
            {item.title && <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">{item.title}</p>}
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
                {item.metric}
              </p>
              {item.comparison && (
                <span className={`text-sm font-medium ${item.comparison.startsWith('+')
                  ? "text-red-500"
                  : item.comparison.startsWith('-')
                    ? "text-emerald-500"
                    : "text-gray-500"
                  }`}>
                  {item.comparison}
                </span>
              )}
            </div>
          </div>
          {item.topRightLabel && (
            <span className="text-tremor-default text-tremor-content dark:text-dark-tremor-content font-medium">
              {item.topRightLabel}
            </span>
          )}
        </div>

      </div>

      <div className="mt-6">
        <div className="flex justify-between items-end mb-1">
          <p className="text-xs font-medium text-tremor-content dark:text-dark-tremor-content uppercase tracking-wider">
            {item.bottomLabel || "Status"}
          </p>
          <p className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
            {isCost ? item.actual : item.target}
          </p>
        </div>
        <ProgressBar value={item.progress} className="mt-1" color={isCost ? "blue" : "emerald"} />
      </div>
    </Card>
  );
}
