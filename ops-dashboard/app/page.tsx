"use client";

import { Card, Grid, Metric, Text, Title, Flex, ProgressBar } from "@tremor/react";
import { useEffect, useState } from "react";
import Link from "next/link";

const initialKpiData = [
  {
    title: "Projects",
    metric: "12",
    progress: 100,
    target: "12",
    delta: "100%",
    deltaType: "moderate",
    href: "/task-allocations",
  },
  {
    title: "Cost",
    metric: "Loading...",
    progress: 0,
    target: "Loading...",
    delta: "--%",
    deltaType: "increase",
    href: "/cloud-spend",
  },
  {
    title: "Defense",
    metric: "85%",
    progress: 85,
    target: "100%",
    delta: "Target 90%",
    deltaType: "unchanged",
    href: "/azure",
  },
];

export default function Home() {
  const [kpiData, setKpiData] = useState(initialKpiData);

  useEffect(() => {
    async function fetchCost() {
      try {
        const res = await fetch("/api/azure/cost");
        if (res.ok) {
          const data = await res.json();
          const { actualCost, forecastCost } = data;

          setKpiData(prev => {
            const newData = [...prev];
            // Update Monthly Cloud Spend (Index 1)
            const progress = forecastCost > 0 ? Math.round((actualCost / forecastCost) * 100) : 0;
            newData[1] = {
              ...newData[1],
              metric: `$${actualCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              target: `$${forecastCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              progress: progress,
              delta: `${progress}%`,
              deltaType: "increase",
            };
            return newData;
          });
        }
      } catch (error) {
        console.error("Failed to fetch cost data", error);
      }
    }

    async function fetchProjects() {
      try {
        const res = await fetch("/api/jira/tasks");
        if (res.ok) {
          const data = await res.json();
          const tasks = data.tasks || [];

          // Extract unique projects from task summaries
          const projects = new Set<string>();
          tasks.forEach((task: any) => {
            if (task.summary.startsWith("[Saral]")) projects.add("Saral");
            else if (task.summary.startsWith("[DM]")) projects.add("Device Management");
            else if (task.summary.toLowerCase().includes("soliyana")) projects.add("Soliyana");
            else if (task.summary.startsWith("Bug") || task.summary.includes("Bug ")) projects.add("Bug Fixes");
            else projects.add("Other");
          });

          const projectCount = projects.size;
          const totalTasks = tasks.length;
          const completedTasks = tasks.filter((t: any) => t.statusCategory === "Done").length;
          const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          setKpiData(prev => {
            const newData = [...prev];
            newData[0] = {
              ...newData[0],
              metric: projectCount.toString(),
              target: `${totalTasks} tasks`,
              progress: completionPercent,
              delta: `${completionPercent}% complete`,
            };
            return newData;
          });
        }
      } catch (error) {
        console.error("Failed to fetch projects", error);
      }
    }

    async function fetchSecurityScore() {
      try {
        const res = await fetch("/api/azure/security-score");
        if (res.ok) {
          const data = await res.json();
          const score = data.scorePercentage || 0;
          const healthy = data.healthy || 0;
          const unhealthy = data.unhealthy || 0;

          setKpiData(prev => {
            const newData = [...prev];
            newData[2] = {
              ...newData[2],
              metric: `${score}%`,
              progress: score,
              target: `${healthy} healthy`,
              delta: `${unhealthy} unhealthy`,
            };
            return newData;
          });
        }
      } catch (error) {
        console.error("Failed to fetch security score", error);
      }
    }

    fetchCost();
    fetchProjects();
    fetchSecurityScore();
  }, []);

  return (
    <main>
      <Title>Executive Summary</Title>
      <Text>Weekly operational overview</Text>

      <Grid numItemsMd={2} numItemsLg={3} className="mt-6 gap-6">
        {kpiData.map((item) => {
          const CardContent = (
            <Card className={item.href ? "hover:bg-gray-50 transition-colors cursor-pointer dark:hover:bg-gray-900" : ""}>
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

          return item.href ? (
            <Link key={item.title} href={item.href}>
              {CardContent}
            </Link>
          ) : (
            <div key={item.title}>{CardContent}</div>
          );
        })}
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
