import "./global.css";
import { themeScript } from "./lib/theme.mjs";
import { getCatalog } from "./lib/catalog.mjs";
import WorkspaceProvider from "./components/workspace-provider";
import AppShell from "./components/app-shell";

export const metadata = {
  title: "Clinical Reference | Tanzania Treatment Guidelines",
  description:
    "Browse and search Tanzania's Standard Treatment Guidelines and National Essential Medicines List, seventh edition 2026.",
};

export default async function RootLayout({ children }) {
  const catalog = await getCatalog();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="scroll-pt-24 motion-safe:scroll-smooth"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="m-0 bg-[#f7f9fb] font-sans text-sm text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-200 print:bg-white print:text-black">
        <WorkspaceProvider catalog={catalog}>
          <AppShell>{children}</AppShell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
