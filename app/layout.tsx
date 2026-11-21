import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Cletus Tech Workspace",
    template: "%s · Cletus Tech Workspace"
  },
  description: "A professional creative production workspace for planning, generating, and assembling AI-powered media.",
  applicationName: "Cletus Tech Workspace",
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  themeColor: "#090d16",
  colorScheme: "dark"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}