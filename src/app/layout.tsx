import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Runbook Flow",
  description: "Transform complex runbooks into interactive decision flowcharts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

