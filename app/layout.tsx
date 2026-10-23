import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

const orbitHeading = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-orbit-heading" });
const orbitBody = Inter({ subsets: ["latin"], display: "swap", variable: "--font-orbit-body" });
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
      <body className={`${orbitHeading.variable} ${orbitBody.variable}`}>{children}</body>
    </html>
  );
}