import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Party Together",
  description: "Every occasion deserves a little magic.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
