import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Align — Find work that fits you",
  description:
    "Explore a transparent job discovery prototype. Sample opportunities, thoughtful preferences, and a little more direction.",
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
