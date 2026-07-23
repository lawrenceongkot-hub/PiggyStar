import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import AppShell from "@/components/layout/app-shell";

export const metadata: Metadata = {
title: "PiggyStar",
description: "PiggyStar Online Gaming Platform",
};

export const viewport: Viewport = {
width: "device-width",
initialScale: 1,
maximumScale: 1,
viewportFit: "cover",
};

export default function RootLayout({
children,
}: {
children: React.ReactNode;
}) {
return (
<html lang="en">
<body className="bg-background text-text antialiased">
<AppShell>{children}</AppShell>
<Toaster richColors position="top-right" />
</body>
</html>
);
}
