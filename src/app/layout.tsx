import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "CronJobManager",
  description: "Configure and run scheduled jobs.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
