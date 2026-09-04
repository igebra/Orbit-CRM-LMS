import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}