import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "USD vs G10 Carry Monitor",
  description: "A dashboard for carry attractiveness, positioning stress, volatility pressure, and unwind risk.",
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
