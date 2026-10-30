"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
  HeartPulse,
  Library,
  Menu,
  Pill,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import ThemeToggle from "./theme-toggle";
import { useWorkspace } from "./workspace-provider";
import { chapterHref, eyebrow, iconButton, sectionHref } from "../lib/ui.mjs";

const shortcuts = [
  ["chapter-one", "Emergency conditions", HeartPulse],
  ["chapter-five", "Malaria", Activity],
  ["chapter-nine", "Respiratory conditions", Activity],
  ["chapter-eleven", "Obstetrics & gynaecology", HeartPulse],
  ["chapter-twenty", "Cardiovascular conditions", HeartPulse],
  ["reference", "Essential medicines", Pill],
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { catalog, bookmarks, storageError } = useWorkspace();
  const menuRef = useRef(null);
  const menuTrigger = useRef(null);
  useEffect(() => {
    menuRef.current?.close();
  }, [pathname]);
  // Keep links from the original hash-based reader usable.
  useEffect(() => {
    const [id, block] = window.location.hash.slice(1).split("/");
    if (pathname === "/" && catalog.sections.some((entry) => entry.id === id)) {
      router.replace(
        `${sectionHref(id)}${block ? `#${encodeURIComponent(block)}` : ""}`,
      );
    }
  }, [pathname, catalog, router]);
  const links = [
    ["/", "Guideline library", Library],
    ["/chapters/", "All chapters", FolderOpen],
    ["/saved/", "Saved sections", Bookmark],
    ["/recent/", "Recently viewed", Clock3],
    ["/source/", "About the source", FileText],
  ];
  const chapter = catalog.chapters.find(
    (item) => pathname === chapterHref(item.id),
  );
  const entry = catalog.sections.find(
    (item) => pathname === sectionHref(item.id),
  );
  const title =
    chapter?.title ||
    entry?.title ||
    links.find(([href]) => href === pathname)?.[1] ||
    "Clinical Reference";
  function Navigation() {
    return (
      <div className="flex h-full flex-col">
        <Link
          href="/"
          className="flex items-center gap-3 px-2 py-1 focus-visible:outline-2 focus-visible:outline-teal-500"
        >
          {/* <span className="flex size-10 items-center justify-center rounded-xl bg-teal-700 text-white">
            <BookOpen size={22} strokeWidth={1.8} />
          </span> */}
          <span className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-white">
            Clinical
            <span className="font-normal text-slate-500 dark:text-slate-400">
              Reference
            </span>
            <span className="mt-0.5 block text-[10px] font-medium tracking-[0.14em] text-slate-400">
              TANZANIA TREATMENT GUIDELINES
            </span>
          </span>
        </Link>
        <div className="mt-8 mb-3 px-3">
          <span className={eyebrow}>Workspace</span>
        </div>
        <nav aria-label="Main navigation" className="space-y-1">
          {links.map(([href, label, Icon]) => {
            const active =
              href === "/chapters/"
                ? pathname.startsWith("/chapters/")
                : pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition focus-visible:outline-2 focus-visible:outline-teal-600 ${active ? "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"}`}
              >
                <Icon size={18} strokeWidth={1.8} />
                {label}
                {href === "/saved/" && (
                  <span className="ml-auto rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {bookmarks.length}
                  </span>
                )}
                {active && href !== "/saved/" && (
                  <ChevronRight size={14} className="ml-auto" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 mb-3 flex items-center justify-between px-3">
          <span className={eyebrow}>Quick access</span>
          <span className="text-[10px] text-slate-400">CHAPTERS</span>
        </div>
        <nav aria-label="Quick access chapters" className="space-y-1">
          {shortcuts.map(([id, label, Icon]) => (
            <Link
              key={id}
              href={chapterHref(id)}
              aria-current={pathname === chapterHref(id) ? "page" : undefined}
              className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-xs transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-600 dark:hover:bg-slate-800 ${pathname === chapterHref(id) ? "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300" : "text-slate-500 dark:text-slate-400"}`}
            >
              <Icon size={16} className="shrink-0 opacity-70" />
              {label}
            </Link>
          ))}
          <Link
            href="/chapters/"
            className="mt-2 flex items-center gap-2 px-3 py-2 text-xs font-medium text-teal-700 hover:text-teal-900 dark:text-teal-400"
          >
            View all 27 chapters <ArrowUpRight size={14} />
          </Link>
        </nav>
        <div className="mt-auto hidden pt-8">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <ShieldCheck
                size={16}
                className="text-teal-700 dark:text-teal-400"
              />{" "}
              Your source, within reach
            </div>
            <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
              Standard Treatment Guidelines
              <br />
              Seventh edition · 2026
            </p>
            <a
              href={catalog.metadata.sourceUrl}
              download
              className="mt-3 flex items-center gap-2 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              <ArrowDownToLine size={14} /> Download original
            </a>
          </div>
          <div className="px-2 pt-4 text-[10px] text-slate-400">
            Ministry of Health · Tanzania Mainland
          </div>
        </div>
      </div>
    );
  }
  return (
    <>
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-100 -translate-y-24 rounded-lg bg-teal-700 px-5 py-3 text-white focus:translate-y-0"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 overflow-y-auto border-r border-slate-200/80 bg-white px-4 py-7 lg:block dark:border-slate-800 dark:bg-slate-900 print:hidden">
        <Navigation />
      </aside>
      <dialog
        ref={menuRef}
        aria-label="Navigation"
        onClick={(event) => {
          if (event.target === menuRef.current) menuRef.current.close();
        }}
        onClose={() => menuTrigger.current?.focus()}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-76 max-w-[90vw] border-0 bg-white px-4 py-6 text-slate-700 backdrop:bg-slate-950/50 dark:bg-slate-900 dark:text-slate-200 print:hidden"
      >
        <button
          className={`${iconButton} absolute top-2 right-2`}
          aria-label="Close navigation"
          onClick={() => menuRef.current.close()}
        >
          <X size={18} />
        </button>
        <Navigation />
      </dialog>
      <div className="min-h-dvh lg:ml-64 print:ml-0">
        <header className="sticky top-0 z-20 flex h-18 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-5 backdrop-blur-md sm:px-8 lg:px-10 dark:border-slate-800 dark:bg-slate-950/95 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={menuTrigger}
              className={`${iconButton} -ml-2 lg:hidden`}
              aria-label="Open navigation"
              aria-haspopup="dialog"
              onClick={() => menuRef.current.showModal()}
            >
              <Menu size={21} />
            </button>
            <Link
              href="/"
              className="hidden text-xs text-slate-400 hover:text-teal-700 sm:block"
            >
              Workspace
            </Link>
            <ChevronRight
              size={13}
              className="hidden shrink-0 text-slate-300 sm:block"
            />
            <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
              {title}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* <span className="mr-2 hidden rounded-md border border-teal-100 bg-teal-50 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-teal-700 sm:block dark:border-teal-900 dark:bg-teal-950 dark:text-teal-300">
              2026 EDITION
            </span> */}
            <Link
              href="/#library-search"
              aria-label="Go to search"
              className={iconButton}
            >
              <Search size={18} />
            </Link>
            <ThemeToggle />
            <span className="ml-2 hidden size-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500 sm:flex dark:border-slate-700 dark:bg-slate-800">
              TZ
            </span>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-360 px-5 py-8 outline-none sm:px-8 lg:px-10 lg:py-10 print:max-w-none print:p-0"
        >
          {storageError && (
            <p
              role="status"
              className="mb-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200 print:hidden"
            >
              {storageError}
            </p>
          )}
          {children}
          <footer className="mt-12 hidden flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-6 text-[11px] leading-5 text-slate-400 dark:border-slate-800 print:hidden">
            <span>
              Tanzania Standard Treatment Guidelines{" "}
              <span className="mx-2 text-slate-300">/</span> Seventh edition,
              2026
            </span>
            <Link
              href="/source/"
              className="flex items-center gap-1.5 hover:text-teal-700 dark:hover:text-teal-300"
            >
              Source & extraction details <ArrowUpRight size={13} />
            </Link>
          </footer>
        </main>
      </div>
    </>
  );
}
