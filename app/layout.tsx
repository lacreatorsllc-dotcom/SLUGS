import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "SLUGS Experimental AI Native",
  description: "An isolated AI-native interface sandbox for SLUGS.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
