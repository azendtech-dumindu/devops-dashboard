import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "AzendTech DevOps Dashboard",
  description: "Operational visibility for AzendTech",
};

// Script to apply theme before React hydrates to prevent flash
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('ops-dashboard-theme') || 'system';
    var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning className="h-full bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-50 selection:bg-blue-500 selection:text-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
