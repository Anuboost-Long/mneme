import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mneme — Keep learning connected",
  description:
    "Mneme turns course material into a calm, connected learning workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
