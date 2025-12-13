export const costHistory = [
    { date: "Jan 24", Cost: 950, Forecast: 980 },
    { date: "Feb 24", Cost: 980, Forecast: 1000 },
    { date: "Mar 24", Cost: 1050, Forecast: 1020 },
    { date: "Apr 24", Cost: 1100, Forecast: 1100 },
    { date: "May 24", Cost: 1080, Forecast: 1150 },
    { date: "Jun 24", Cost: 1200, Forecast: 1180 },
    { date: "Jul 24", Cost: 1250, Forecast: 1250 },
    { date: "Aug 24", Cost: 1300, Forecast: 1300 },
    { date: "Sep 24", Cost: 1280, Forecast: 1350 },
    { date: "Oct 24", Cost: 1400, Forecast: 1380 },
    { date: "Nov 24", Cost: 1350, Forecast: 1400 },
    { date: "Dec 24", Cost: 502, Forecast: 1083 }, // Partial month
];

export const keyChanges = [
    {
        month: "Oct 24",
        change: "+$120",
        reason: "Added AKS Cluster for Production",
        impact: "High",
    },
    {
        month: "Jun 24",
        change: "+$100",
        reason: "Storage Account Tier Increase",
        impact: "Medium",
    },
    {
        month: "Mar 24",
        change: "+$70",
        reason: "New SQL Database Instance",
        impact: "Medium",
    },
];
