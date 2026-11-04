import type { Metadata } from "next";
import "../src/style.css";
export const metadata: Metadata = {
  title: "Attune — Listening practice",
  description:
    "Generate conversations and practice focused multi-speaker listening.",
  icons: { icon: "/logo.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
