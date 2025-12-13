import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "AzendTech DevOps Dashboard",
  description: "Operational visibility for AzendTech",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased bg-gray-50">
      <body className="h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
