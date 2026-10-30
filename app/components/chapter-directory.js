"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, FileText, Search, X } from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { chapterHref, eyebrow, iconButton, panel } from "../lib/ui.mjs";
import { normalize } from "../lib/search.mjs";
import Highlight from "./highlight";

export default function ChapterDirectory() {
  const { catalog } = useWorkspace();
  const [query, setQuery] = useState("");
  const chapters = catalog.chapters.filter(
    (chapter) =>
      chapter.id !== "reference" &&
      normalize(`${chapter.title} ${chapter.label}`).includes(normalize(query)),
  );
  return (
    <>
      <header className="mb-8">
        <p className={`${eyebrow} mb-3`}>THE COMPLETE LIBRARY</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Find your specialty.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Browse all 27 chapters, from emergency care to neonatal conditions.
        </p>
      </header>
      <div
        className={`${panel} mb-6 flex max-w-xl items-center gap-3 px-4 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-600/10`}
      >
        <Search
          size={19}
          className="shrink-0 text-teal-700 dark:text-teal-400"
        />
        <input
          type="search"
          aria-label="Find a chapter"
          placeholder="Find a chapter or specialty…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-13 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            aria-label="Clear chapter search"
            className={iconButton}
            onClick={() => setQuery("")}
          >
            <X size={15} />
          </button>
        )}
      </div>
      <p role="status" className="mb-5 text-xs text-slate-400">
        {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}
        {query ? ` matching “${query}”` : " to explore"}
      </p>
      {chapters.length ? (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {chapters.map((chapter) => {
            const entries = catalog.sections.filter(
              (entry) => entry.chapterId === chapter.id,
            );
            const index = catalog.chapters.findIndex(
              (item) => item.id === chapter.id,
            );
            return (
              <Link
                key={chapter.id}
                href={chapterHref(chapter.id)}
                className={`${panel} group flex gap-4 p-5 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-teal-600 motion-reduce:transform-none`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 font-mono text-xs font-medium text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                  {String(index).padStart(2, "0")}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="mb-1 text-[10px] text-slate-400">
                    {chapter.label}
                  </span>
                  <strong className="text-sm leading-6 font-semibold text-slate-800 group-hover:text-teal-700 dark:text-slate-100 dark:group-hover:text-teal-300">
                    <Highlight text={chapter.title} query={query} />
                  </strong>
                  <span className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <FileText size={12} />
                      {entries.length} sections
                    </span>
                    <ArrowRight
                      size={14}
                      className="text-teal-700 dark:text-teal-400"
                    />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={`${panel} p-12 text-center`}>
          <Search size={26} className="mx-auto mb-4 text-slate-400" />
          <h2 className="text-lg font-semibold">No matching chapters</h2>
          <button
            onClick={() => setQuery("")}
            className="mt-3 text-sm text-teal-700 hover:underline dark:text-teal-400"
          >
            Show all chapters
          </button>
        </div>
      )}
      <Link
        href={chapterHref("reference")}
        className={`${panel} mt-7 flex items-center gap-4 p-5 transition hover:border-teal-300`}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <BookOpen size={21} />
        </span>
        <span>
          <strong className="text-sm font-semibold">
            Introduction & essential medicines
          </strong>
          <span className="mt-1 block text-xs text-slate-400">
            Document background, acknowledgements, and the national medicines
            list.
          </span>
        </span>
        <ArrowRight size={17} className="ml-auto shrink-0 text-slate-400" />
      </Link>
    </>
  );
}
