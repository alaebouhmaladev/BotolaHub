import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BotolaHub — Administration Console",
  description: "Admin portal for BotolaHub fantasy football platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
