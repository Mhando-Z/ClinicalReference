import "./globals.css";
import { themeScript } from "./lib/theme.mjs";

export const metadata = {
  title: "Clinical Reference | Tanzania Treatment Guidelines",
  description:
    "Browse and search Tanzania's Standard Treatment Guidelines and National Essential Medicines List, seventh edition 2026.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
