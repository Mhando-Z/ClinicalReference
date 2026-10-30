"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Info,
  Link2,
  Minus,
  Plus,
  Printer,
  Table2,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import SourceContent from "./source-content";
import {
  button,
  chapterHref,
  eyebrow,
  iconButton,
  number,
  panel,
  readingTime,
  sectionHref,
} from "../lib/ui.mjs";

export default function SectionReader({ section }) {
  const { catalog, bookmarks, ready, markRecent, toggleBookmark } =
    useWorkspace();
  const entry = catalog.sections.find((item) => item.id === section.id);
  const chapter = catalog.chapters.find((item) => item.id === entry.chapterId);
  const siblings = catalog.sections.filter(
    (item) => item.chapterId === entry.chapterId,
  );
  const position = siblings.findIndex((item) => item.id === entry.id);
  const previous = siblings[position - 1];
  const next = siblings[position + 1];
  const saved = bookmarks.includes(entry.id);
  const [fontSize, setFontSize] = useState(1);
  const [query, setQuery] = useState("");
  const [backHref, setBackHref] = useState(chapterHref(chapter.id));
  const [backLabel, setBackLabel] = useState("Back to chapter");
  const [copyStatus, setCopyStatus] = useState("");
  const headings = section.blocks.filter(
    (block, index) => block.type === "heading" && index > 0,
  );
  useEffect(() => {
    if (ready) markRecent(entry.id);
  }, [entry.id, ready, markRecent]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const search = params.get("q") || "";
    setQuery(search);
    const from = params.get("from");
    if (from) {
      try {
        const target = new URL(from, window.location.origin);
        if (
          target.origin === window.location.origin &&
          [
            "/",
            "/saved/",
            "/recent/",
            ...catalog.chapters.map((item) => chapterHref(item.id)),
          ].includes(target.pathname)
        ) {
          setBackHref(`${target.pathname}${target.search}`);
          setBackLabel(
            search
              ? "Back to search results"
              : target.pathname === "/saved/"
                ? "Back to saved sections"
                : target.pathname === "/recent/"
                  ? "Back to recently viewed"
                  : target.pathname === "/"
                    ? "Back to library"
                    : "Back to chapter",
          );
        }
      } catch {
        /* Ignore malformed return URLs and keep the chapter link. */
      }
    } else if (search) {
      setBackHref(`/?q=${encodeURIComponent(search)}`);
      setBackLabel("Back to search results");
    }
    try {
      const value = Number(localStorage.getItem("clinical-reader-size"));
      if (
        [0, 1, 2].includes(value) &&
        localStorage.getItem("clinical-reader-size") !== null
      )
        setFontSize(value);
    } catch {}
  }, [entry.id]);
  useEffect(() => {
    if (!copyStatus) return;
    const timeout = setTimeout(() => setCopyStatus(""), 3000);
    return () => clearTimeout(timeout);
  }, [copyStatus]);
  function changeFont(value) {
    setFontSize(value);
    try {
      localStorage.setItem("clinical-reader-size", String(value));
    } catch {}
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("Link copied");
    } catch {
      setCopyStatus("Copy the address from your browser");
    }
  }
  const outline = (
    <nav
      aria-label="On this page"
      className="mt-4 max-h-[60vh] space-y-1 overflow-y-auto"
    >
      {headings.length ? (
        headings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            className="block rounded-lg border-l-2 border-transparent px-3 py-2 text-xs leading-5 text-slate-500 transition hover:border-teal-600 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-400 dark:hover:bg-teal-950 dark:hover:text-teal-300"
          >
            {heading.text}
          </a>
        ))
      ) : (
        <p className="text-xs leading-6 text-slate-400">
          Read this section in its original order.
        </p>
      )}
    </nav>
  );
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-teal-700 dark:text-slate-400"
        >
          <ArrowLeft size={15} />
          {backLabel}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={iconButton}
            aria-label="Print section"
            title="Print section"
            onClick={() => window.print()}
          >
            <Printer size={17} />
          </button>
          <button className={button} onClick={copyLink}>
            {copyStatus === "Link copied" ? (
              <Check size={15} />
            ) : (
              <Link2 size={15} />
            )}
            Copy link
          </button>
          <button
            disabled={!ready}
            className={`${button} ${saved ? "border-teal-200! bg-teal-50! text-teal-800! dark:border-teal-800! dark:bg-teal-950! dark:text-teal-300!" : ""}`}
            onClick={() => toggleBookmark(entry.id)}
            aria-pressed={saved}
          >
            <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved" : "Save section"}
          </button>
        </div>
      </div>
      {copyStatus && (
        <p
          role="status"
          className="mb-4 text-xs text-teal-700 dark:text-teal-300"
        >
          {copyStatus}
        </p>
      )}
      <div className="grid min-w-0 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_210px] print:block">
        <article
          className={`${panel} min-w-0 px-5 py-7 sm:px-9 sm:py-9 print:border-0 print:bg-white print:p-0 print:text-black`}
        >
          <header className="border-b border-slate-200 pb-6 dark:border-slate-700">
            <div className={`${eyebrow} flex items-center gap-2`}>
              <Link
                href={chapterHref(chapter.id)}
                className="text-teal-700 hover:underline dark:text-teal-400"
              >
                {chapter.label}
              </Link>
              <ChevronRight size={12} />
              <span>Source text</span>
            </div>
            <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl dark:text-slate-50 print:text-black">
              {entry.title}
            </h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {chapter.title}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock3 size={13} />
                {readingTime(entry.wordCount)}
              </span>
              <span className="flex items-center gap-1.5">
                <FileText size={13} />
                {number(entry.wordCount)} words
              </span>
              {entry.tableCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <Table2 size={13} />
                  {entry.tableCount} tables
                </span>
              )}
              <span>2026 edition</span>
            </div>
          </header>
          <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-amber-50/80 p-3.5 text-[11px] leading-5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 print:hidden">
            <Info size={15} className="mt-0.5 shrink-0" />
            <p>
              Extracted source text. Clinical and layout review pending.{" "}
              <a
                href={catalog.metadata.sourceUrl}
                download
                className="font-semibold underline underline-offset-2"
              >
                Check the original document
              </a>
              .
            </p>
          </div>
          <div className="my-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <span className="text-[11px] text-slate-400">
              {query ? (
                <>
                  Matches for{" "}
                  <strong className="font-medium text-slate-600 dark:text-slate-300">
                    “{query}”
                  </strong>{" "}
                  are highlighted
                </>
              ) : (
                "Original section order"
              )}
            </span>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
              <button
                aria-label="Decrease text size"
                className={`${iconButton} size-7! disabled:opacity-30`}
                disabled={fontSize === 0}
                onClick={() => changeFont(fontSize - 1)}
              >
                <Minus size={13} />
              </button>
              <span className="min-w-10 text-center text-[10px] text-slate-500">
                {["Small", "Default", "Large"][fontSize]}
              </span>
              <button
                aria-label="Increase text size"
                className={`${iconButton} size-7! disabled:opacity-30`}
                disabled={fontSize === 2}
                onClick={() => changeFont(fontSize + 1)}
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
          {headings.length > 0 && (
            <details className="mb-6 rounded-lg border border-slate-200 px-4 py-3 xl:hidden dark:border-slate-700 print:hidden">
              <summary className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
                On this page
              </summary>
              {outline}
            </details>
          )}
          <div
            data-testid="source-content"
            className={`min-w-0 text-slate-600 dark:text-slate-300 print:text-black [&_strong]:font-semibold [&_strong]:text-slate-800 dark:[&_strong]:text-slate-100 print:[&_strong]:text-black ${["text-sm", "text-[15px]", "text-[17px]"][fontSize]}`}
          >
            <SourceContent
              blocks={section.blocks}
              query={query}
              title={entry.title}
            />
          </div>
          <footer className="mt-10 flex items-start gap-3 border-t border-slate-200 pt-6 text-slate-400 dark:border-slate-700">
            <FileText size={17} className="mt-0.5 shrink-0" />
            <div>
              <strong className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Traceable to the original
              </strong>
              <p className="mt-1 text-[10px] leading-5">
                {catalog.metadata.sourceFile} · {entry.sourceStart} —{" "}
                {entry.sourceEnd}
              </p>
            </div>
          </footer>
        </article>
        <aside className="sticky top-26 hidden xl:block print:hidden">
          <h2 className={eyebrow}>On this page</h2>
          {outline}
          <a
            href={catalog.metadata.sourceUrl}
            download
            className="mt-6 flex items-center gap-2 border-t border-slate-200 pt-5 text-xs text-teal-700 dark:border-slate-800 dark:text-teal-400"
          >
            <ArrowDownToLine size={14} /> Original document
          </a>
          <Link
            href="/source/"
            className="mt-3 block text-[11px] text-slate-400 hover:text-teal-700"
          >
            About this source
          </Link>
        </aside>
      </div>
      <nav
        aria-label="Adjacent sections"
        className="mt-6 xl:w-280 grid gap-3 sm:grid-cols-2 print:hidden"
      >
        {previous ? (
          <Link
            href={sectionHref(previous.id)}
            className={`${panel} group flex items-center gap-3 p-5 transition hover:border-teal-300`}
          >
            <ArrowLeft
              size={16}
              className="shrink-0 text-slate-400 group-hover:text-teal-700"
            />
            <span>
              <span className={eyebrow}>Previous section</span>
              <strong className="mt-1 block text-xs font-medium">
                {previous.title}
              </strong>
            </span>
          </Link>
        ) : (
          <span className="hidden sm:block" />
        )}
        {next && (
          <Link
            href={sectionHref(next.id)}
            className={`${panel} group flex items-center justify-between gap-3 p-5 transition hover:border-teal-300`}
          >
            <span>
              <span className={eyebrow}>Next section</span>
              <strong className="mt-1 block text-xs font-medium">
                {next.title}
              </strong>
            </span>
            <ArrowRight
              size={16}
              className="shrink-0 text-slate-400 group-hover:text-teal-700"
            />
          </Link>
        )}
      </nav>
    </>
  );
}
