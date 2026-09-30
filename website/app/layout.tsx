import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mneme — Your course, made usable",
  description:
    "Mneme is a private desktop workspace for importing, organizing and working through course material."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
