import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CashPilot", template: "%s | CashPilot" },
  description: "Simple cash flow tracking and forecasts for small businesses.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
