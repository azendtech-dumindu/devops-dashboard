"use client";

import {
    Card,
    Table,
    TableHead,
    TableRow,
    TableHeaderCell,
    TableBody,
    TableCell,
    Badge,
    DonutChart,
} from "@tremor/react";
import { useState } from "react";
import useSWR from "swr";

interface Task {
    key: string;
    summary: string;
    status: string;
    statusCategory: string;
    assignee: string;
    priority: string;
}

type FilterType = "all" | "In Progress" | "Done" | "To Do";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Helper to extract project from task summary
function extractProject(summary: string): string {
    if (summary.startsWith("[Saral]")) return "Saral";
    if (summary.startsWith("[DM]")) return "Device Management";
    if (summary.toLowerCase().includes("soliyana")) return "Soliyana";
    if (summary.startsWith("Bug") || summary.includes("Bug ")) return "Bug Fixes";
    return "Other";
}

// Helper to get status badge color
function getStatusColor(statusCategory: string): "emerald" | "yellow" | "gray" | "blue" {
    switch (statusCategory) {
        case "Done": return "emerald";
        case "In Progress": return "yellow";
        case "To Do": return "gray";
        default: return "blue";
    }
}

export default function AllocationsPage() {
    const { data: taskData, isLoading: loading } = useSWR("/api/jira/tasks", fetcher);
    const [filter, setFilter] = useState<FilterType>("all");

    const tasks: Task[] = taskData?.tasks || [];

    // Group tasks by project
    const projectGroups = tasks.reduce((acc: Record<string, Task[]>, task) => {
        const project = extractProject(task.summary);
        if (!acc[project]) acc[project] = [];
        acc[project].push(task);
        return acc;
    }, {});

    // Calculate project summary for donut chart
    const projectSummary = Object.entries(projectGroups).map(([name, taskList]) => ({
        name,
        value: taskList.length,
    }));

    // Calculate summary (merged - all tasks)
    const summary = {
        total: tasks.length,
        inProgress: tasks.filter(t => t.statusCategory === "In Progress").length,
        done: tasks.filter(t => t.statusCategory === "Done").length,
        toDo: tasks.filter(t => t.statusCategory === "To Do").length,
    };

    // Filter tasks based on current filter
    const filteredTasks = filter === "all"
        ? tasks
        : tasks.filter(t => t.statusCategory === filter);

    const isActive = (f: FilterType) => filter === f;

    return (
        <main>
            <h1 className="text-2xl font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">Task Allocations</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 mt-6 gap-6">
                <Card>
                    <h3 className="text-lg font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">Project-wise</h3>
                    {loading ? (
                        <div className="h-48 flex items-center justify-center">
                            <p className="text-tremor-content">Loading...</p>
                        </div>
                    ) : (
                        <DonutChart
                            className="mt-6"
                            data={projectSummary}
                            category="value"
                            index="name"
                            colors={["indigo", "violet", "rose", "amber", "cyan", "emerald"]}
                        />
                    )}
                </Card>
                <Card>
                    <h3 className="text-lg font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">Summary</h3>
                    {loading ? (
                        <div className="h-48 flex items-center justify-center">
                            <p className="text-tremor-content">Loading...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <button
                                onClick={() => setFilter("all")}
                                className={`p-4 rounded-lg text-center transition-all border-2 ${isActive("all") ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300 bg-white"}`}
                            >
                                <span className="text-sm text-gray-500">Total</span>
                                <div className="text-3xl font-bold text-blue-600 mt-1">{summary.total}</div>
                            </button>
                            <button
                                onClick={() => setFilter("To Do")}
                                className={`p-4 rounded-lg text-center transition-all border-2 ${isActive("To Do") ? "border-gray-500 bg-gray-50" : "border-gray-200 hover:border-gray-400 bg-white"}`}
                            >
                                <span className="text-sm text-gray-500">To Do</span>
                                <div className="text-3xl font-bold text-gray-600 mt-1">{summary.toDo}</div>
                            </button>
                            <button
                                onClick={() => setFilter("In Progress")}
                                className={`p-4 rounded-lg text-center transition-all border-2 ${isActive("In Progress") ? "border-yellow-500 bg-yellow-50" : "border-gray-200 hover:border-yellow-300 bg-white"}`}
                            >
                                <span className="text-sm text-gray-500">In Progress</span>
                                <div className="text-3xl font-bold text-yellow-600 mt-1">{summary.inProgress}</div>
                            </button>
                            <button
                                onClick={() => setFilter("Done")}
                                className={`p-4 rounded-lg text-center transition-all border-2 ${isActive("Done") ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-300 bg-white"}`}
                            >
                                <span className="text-sm text-gray-500">Done</span>
                                <div className="text-3xl font-bold text-emerald-600 mt-1">{summary.done}</div>
                            </button>
                        </div>
                    )}
                </Card>
            </div>

            <Card className="mt-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                        {filter === "all" ? "All" : filter}
                    </h3>
                    {filter !== "all" && (
                        <button
                            onClick={() => setFilter("all")}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Clear filter
                        </button>
                    )}
                </div>
                {loading ? (
                    <div className="h-48 flex items-center justify-center">
                        <p className="text-tremor-content">Loading from Jira...</p>
                    </div>
                ) : (
                    <Table className="mt-5">
                        <TableHead>
                            <TableRow>
                                <TableHeaderCell>Key</TableHeaderCell>
                                <TableHeaderCell>Summary</TableHeaderCell>
                                <TableHeaderCell>Project</TableHeaderCell>
                                <TableHeaderCell>Assignee</TableHeaderCell>
                                <TableHeaderCell>Status</TableHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTasks.map((task) => (
                                <TableRow key={task.key}>
                                    <TableCell>
                                        <span className="font-mono font-medium text-tremor-content-strong">{task.key}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="truncate max-w-xs text-tremor-content">{task.summary}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge color="indigo">{extractProject(task.summary)}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-tremor-content">{task.assignee}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge color={getStatusColor(task.statusCategory)}>{task.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </main>
    );
}
