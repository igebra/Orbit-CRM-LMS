import type { Metadata } from "next";
import "./globals.css";
import CrmBoundaryGuard from "./components/CrmBoundaryGuard";

export const metadata: Metadata = {
  title: "Orbit by igebra.ai",
  description: "Orbit - iGebra CRM, LMS and Operations Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><CrmBoundaryGuard>{children}</CrmBoundaryGuard></body>
    </html>
  );
}