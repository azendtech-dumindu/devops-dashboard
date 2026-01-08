"use client";

import { Card, Grid, Metric, Text, Title, Flex, ProgressBar } from "@tremor/react";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const { data: costData, isLoading: costLoading } = useSWR("/api/azure/cost", fetcher);
  const { data: jiraData, isLoading: jiraLoading } = useSWR("/api/jira/tasks", fetcher);
  const { data: securityData, isLoading: securityLoading } = useSWR("/api/azure/security-score", fetcher);

  // --- Process Cost Data ---
  const { actualCost = 0, forecastCost = 0 } = costData || {};
  const costProgress = forecastCost > 0 ? Math.round((actualCost / forecastCost) * 100) : 0;

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
  const unhealthyCount = securityData?.unhealthy || 0;

  const kpis = [
    {
      title: "Projects",
      metric: jiraLoading ? null : projectCount.toString(),
      progress: completionPercent,
      target: `${tasks.length} tasks`,
      href: "/task-allocations",
      loading: jiraLoading,
    },
    {
      title: "Cost",
      metric: costLoading ? null : `$${actualCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      progress: costProgress,
      target: `$${forecastCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      href: "/cloud-spend",
      loading: costLoading,
    },
    {
      title: "Defense",
      metric: securityLoading ? null : `${securityScore}%`,
      progress: securityScore,
      target: `${healthyCount} healthy`,
      href: "/azure",
      loading: securityLoading,
    },
  ];

  return (
    <main>
      <Title>Executive Summary</Title>
      <Text>Weekly operational overview</Text>

      <Grid numItemsMd={2} numItemsLg={3} className="mt-6 gap-6">
        {kpis.map((item) => (
          item.href ? (
            <Link key={item.title} href={item.href} className="block">
              <KpiCard item={item} />
            </Link>
          ) : (
            <div key={item.title}>
              <KpiCard item={item} />
            </div>
          )
        ))}
      </Grid>

      <div className="mt-6">
        <Card>
          <div className="h-80 flex items-center justify-center border-dashed border-2 border-gray-200 rounded">
            <Text>Trend Chart Placeholder (Coming Soon)</Text>
          </div>
        </Card>
      </div>
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

  return (
    <Card className="hover:bg-gray-50 transition-colors cursor-pointer dark:hover:bg-gray-900 h-full">
      <Flex alignItems="start">
        <div className="truncate">
          <Text>{item.title}</Text>
          <Metric className="truncate">{item.metric}</Metric>
        </div>
      </Flex>
      <Flex className="mt-4 space-x-2">
        <Text className="truncate">{`${item.progress}%`}</Text>
        <Text>{item.target}</Text>
      </Flex>
      <ProgressBar value={item.progress} className="mt-2" />
    </Card>
  );
}
