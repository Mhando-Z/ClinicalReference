"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Grid2X2,
  HeartPulse,
  ImageIcon,
  List,
  LoaderCircle,
  Pill,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Table2,
  X,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import Highlight from "./highlight";
import { findSections, searchExcerpt, searchSuggestions } from "../lib/search.mjs";
import { articleBreadcrumb, specialtyFor } from "../lib/taxonomy.mjs";
import {
  button,
  chapterHref,
  eyebrow,
  iconButton,
  number,
  panel,
  primaryButton,
  readingTime,
  sectionHref,
} from "../lib/ui.mjs";

const PAGE_SIZE = 12;
const selectClass =
  "min-h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 pr-7 text-xs text-slate-600 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

export default function ClinicalLibrary({
  chapterId = "all",
  view = "library",
}) {
  const { catalog, bookmarks, recent, ready, toggleBookmark, clearRecent } =
    useWorkspace();
  const { chapters, sections, metadata } = catalog;
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [chapter, setChapter] = useState(chapterId);
  const [content, setContent] = useState("all");
  const [sort, setSort] = useState(view === "recent" ? "recent" : "relevance");
  const [layout, setLayout] = useState("grid");
  const [page, setPage] = useState(1);
  const [urlReady, setUrlReady] = useState(false);
  const [index, setIndex] = useState(null);
  const [searchError, setSearchError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const chapterMap = useMemo(
    () => Object.fromEntries(chapters.map((item) => [item.id, item])),
    [chapters],
  );
  const activeChapter = chapterId !== "all" ? chapterMap[chapterId] : null;
  const activeSpecialty = specialtyFor(activeChapter);
  const hasQuery = Boolean(deferredQuery.trim());
  const suggestions = useMemo(
    () => searchSuggestions({ sections, chapters, query }),
    [sections, chapters, query],
  );

  useEffect(() => {
    function readUrl() {
      const params = new URLSearchParams(window.location.search);
      setQuery(params.get("q") || "");
      const selectedChapter = params.get("chapter");
      setChapter(
        chapterId !== "all"
          ? chapterId
          : chapters.some((item) => item.id === selectedChapter)
            ? selectedChapter
            : "all",
      );
      setContent(
        ["tables", "figures"].includes(params.get("content"))
          ? params.get("content")
          : "all",
      );
      setSort(
        [
          "relevance",
          "source",
          "title",
          "shortest",
          ...(view === "recent" ? ["recent"] : []),
        ].includes(params.get("sort"))
          ? params.get("sort")
          : view === "recent"
            ? "recent"
            : "relevance",
      );
      setPage(Math.max(1, Number.parseInt(params.get("page"), 10) || 1));
      setUrlReady(true);
    }
    readUrl();
    window.addEventListener("popstate", readUrl);
    if (window.location.hash === "#library-search") inputRef.current?.focus();
    return () => window.removeEventListener("popstate", readUrl);
  }, [chapterId, chapters, view]);
  useEffect(() => {
    if (!urlReady) return;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (chapter !== "all" && chapterId === "all")
        params.set("chapter", chapter);
      if (content !== "all") params.set("content", content);
      if (sort !== (view === "recent" ? "recent" : "relevance"))
        params.set("sort", sort);
      if (page > 1) params.set("page", String(page));
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${params.size ? `?${params}` : ""}`,
      );
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, chapter, chapterId, content, sort, page, urlReady, view]);
  useEffect(() => {
    const handler = (event) => {
      const editing =
        ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) ||
        event.target.isContentEditable;
      if (
        (!editing && event.key === "/") ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape" && event.target === inputRef.current) {
        setQuery("");
        setPage(1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (!hasQuery || index) return;
    const controller = new AbortController();
    setSearchError(false);
    fetch("/data/search-index.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Search index unavailable");
        return response.json();
      })
      .then((items) =>
        setIndex(Object.fromEntries(items.map((item) => [item.id, item.text]))),
      )
      .catch((error) => {
        if (error.name !== "AbortError") setSearchError(true);
      });
    return () => controller.abort();
  }, [hasQuery, index, attempt]);

  const results = useMemo(
    () =>
      findSections({
        sections,
        chapters,
        index,
        query: deferredQuery,
        chapter,
        content,
        sort,
        ids:
          view === "saved" ? bookmarks : view === "recent" ? recent : undefined,
      }),
    [
      sections,
      chapters,
      index,
      deferredQuery,
      chapter,
      content,
      sort,
      view,
      bookmarks,
      recent,
    ],
  );
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = results.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const searching = hasQuery && !index && !searchError;
  const loading = (view !== "library" && !ready) || !urlReady;
  const overview =
    view === "library" &&
    chapterId === "all" &&
    !query &&
    chapter === "all" &&
    content === "all";
  const filtered = Boolean(
    query || content !== "all" || (chapter !== "all" && chapterId === "all"),
  );
  const title =
    view === "saved"
      ? "Your everyday essentials."
      : view === "recent"
        ? "Pick up where you left off."
        : activeChapter
          ? activeChapter.title
          : "Guidelines, made accessible.";
  function updateQuery(value) {
    setQuery(value);
    setPage(1);
    setActiveSuggestion(-1);
  }
  function chooseSuggestion(suggestion) {
    updateQuery(suggestion.entry.title);
    setSearchFocused(false);
    inputRef.current?.focus();
  }
  function reset() {
    setQuery("");
    setChapter(chapterId);
    setContent("all");
    setSort(view === "recent" ? "recent" : "relevance");
    setPage(1);
  }
  function changePage(value) {
    setPage(value);
    resultsRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  const returnParams = new URLSearchParams();
  if (query.trim()) returnParams.set("q", query.trim());
  if (chapter !== "all" && chapterId === "all")
    returnParams.set("chapter", chapter);
  if (content !== "all") returnParams.set("content", content);
  if (sort !== (view === "recent" ? "recent" : "relevance"))
    returnParams.set("sort", sort);
  if (currentPage > 1) returnParams.set("page", String(currentPage));
  const libraryPath =
    chapterId !== "all"
      ? chapterHref(chapterId)
      : view === "saved"
        ? "/saved/"
        : view === "recent"
          ? "/recent/"
          : "/";
  const returnHref = `${libraryPath}${returnParams.size ? `?${returnParams}` : ""}`;
  const readerParams = new URLSearchParams({ from: returnHref });
  if (query.trim()) readerParams.set("q", query.trim());
  const readerQuery = `?${readerParams}`;

  return (
    <>
      <header className="mb-7">
        {activeChapter ? (
          <nav
            aria-label="Clinical breadcrumb"
            className="mb-5 flex flex-wrap items-center gap-2 text-xs text-slate-500"
          >
            <Link href="/chapters/" className="hover:text-teal-700">
              All specialties
            </Link>
            <ChevronRight size={13} className="text-slate-300" />
            <span className="font-medium text-teal-700 dark:text-teal-400">
              {activeSpecialty}
            </span>
            <ChevronRight size={13} className="text-slate-300" />
            <span className="text-slate-400">{activeChapter.label}</span>
          </nav>
        ) : (
          <div className={`${eyebrow} mb-3 flex items-center gap-2.5`}>
            <span className="size-1.5 rounded-full bg-teal-600" />
            {view === "saved"
              ? "YOUR PERSONAL LIBRARY"
              : view === "recent"
                ? "YOUR READING HISTORY"
                : "YOUR EVERYDAY CLINICAL COMPANION"}
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <h1 className="text-3xl leading-tight font-semibold tracking-[-0.035em] text-slate-900 sm:text-4xl dark:text-slate-50">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {view === "saved"
                ? "The references you return to, together in one place. Saved in this browser."
                : view === "recent"
                  ? "Your last 20 sections, with the most recent first. Stored in this browser."
                  : activeChapter
                    ? `${activeChapter.label} · Original source sections, tables, and figures.`
                    : "Less time searching documents. More time finding what you need."}
            </p>
          </div>
          {view === "recent" && recent.length > 0 ? (
            <button className={button} onClick={clearRecent}>
              <RotateCcw size={15} /> Clear history
            </button>
          ) : (
            view === "library" && (
              <a
                className={`${button} max-xl:hidden`}
                href={metadata.sourceUrl}
                download
              >
                <ArrowDownToLine size={15} /> Original document
              </a>
            )
          )}
        </div>
        {view === "library" && !activeChapter && (
          <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs text-slate-500 dark:text-slate-400">
            {[
              [BookOpen, metadata.stats.chapters, "chapters"],
              [FileText, sections.length, "sections"],
              [Table2, metadata.stats.tables, "source tables"],
            ].map(([Icon, count, label]) => (
              <span key={label} className="flex items-center gap-2">
                <Icon size={15} className="text-teal-700 dark:text-teal-400" />
                <strong className="font-semibold text-slate-800 dark:text-slate-200">
                  {number(count)}
                </strong>
                {label}
              </span>
            ))}
            <span className="hidden items-center gap-2 text-[11px] text-slate-400 2xl:flex">
              <span className="size-1 rounded-full bg-slate-400" /> Ministry of
              Health, Tanzania
            </span>
          </div>
        )}
      </header>

      <section
        aria-label="Search and filters"
        className={`${panel} mb-7 overflow-hidden shadow-xs focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-600/10`}
      >
        <div className="relative">
          <div className="flex items-center gap-3 px-4 sm:gap-4 sm:px-5">
          <Search
            size={22}
            className="shrink-0 text-teal-700 dark:text-teal-400"
          />
          <input
            ref={inputRef}
            type="search"
            id="library-search"
            aria-label="Search guidelines by condition, medicine, or keyword"
            aria-describedby="search-help"
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={searchFocused && suggestions.length > 0}
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 100)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && suggestions.length) {
                event.preventDefault();
                setActiveSuggestion((value) =>
                  value < suggestions.length - 1 ? value + 1 : 0,
                );
              }
              if (event.key === "ArrowUp" && suggestions.length) {
                event.preventDefault();
                setActiveSuggestion((value) =>
                  value > 0 ? value - 1 : suggestions.length - 1,
                );
              }
              if (event.key === "Enter" && activeSuggestion >= 0) {
                event.preventDefault();
                chooseSuggestion(suggestions[activeSuggestion]);
              }
            }}
            placeholder={
              view === "saved"
                ? "Search your saved sections…"
                : "Search a condition, medicine, or keyword…"
            }
            className="h-17 w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:text-[15px] dark:text-slate-100 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? (
            <button
              className={iconButton}
              aria-label="Clear search"
              onClick={() => {
                updateQuery("");
                inputRef.current?.focus();
              }}
            >
              <X size={17} />
            </button>
          ) : (
            <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-2 py-1 font-sans text-[11px] text-slate-400 sm:block dark:border-slate-700 dark:bg-slate-800">
              /
            </kbd>
          )}
          </div>
          {searchFocused && suggestions.length > 0 && (
            <div
              id="search-suggestions"
              role="listbox"
              aria-label="Search suggestions"
              className="absolute top-full right-0 left-0 z-10 mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.entry.id}
                  type="button"
                  role="option"
                  aria-selected={activeSuggestion === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseSuggestion(suggestion)}
                  className={`block w-full rounded-md px-3 py-2 text-left text-xs ${activeSuggestion === index ? "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                >
                  <span className="block truncate font-medium">{suggestion.entry.title}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-400">{suggestion.chapter?.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5 dark:border-slate-800 dark:bg-slate-800/30">
          <SlidersHorizontal size={14} className="mr-1 text-slate-400" />
          {chapterId === "all" && (
            <select
              aria-label="Filter by chapter"
              value={chapter}
              onChange={(event) => {
                setChapter(event.target.value);
                setPage(1);
              }}
              className={`${selectClass} max-w-full flex-1 sm:max-w-64 sm:flex-none`}
            >
              <option value="all">All chapters</option>
              {chapters.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="Filter by content"
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="all">All content</option>
            <option value="tables">With tables</option>
            <option value="figures">With figures</option>
          </select>
          {filtered && (
            <button
              className="flex min-h-10 items-center gap-1 px-2 text-xs text-slate-500 hover:text-teal-700 dark:text-slate-400"
              onClick={reset}
            >
              <X size={13} /> Reset filters
            </button>
          )}
          <p
            id="search-help"
            className="basis-full text-[11px] text-slate-400 sm:ml-auto sm:basis-auto"
          >
            Searches the full text, including tables
          </p>
        </div>
      </section>
      {searchError && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 p-4 text-xs leading-5 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          Full-text search could not load. Showing matches from titles and
          previews.
          <button
            className="font-semibold underline"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry full-text search
          </button>
        </div>
      )}
      {!query && view === "library" && (
        <div className="mb-7 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="mr-1 text-slate-400">Try searching</span>
          {["Malaria", "Hypertension", "Diabetes", "Asthma"].map((term) => (
            <button
              key={term}
              onClick={() => updateQuery(term)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-500 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-teal-300"
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {overview && (
        <section
          aria-label="Quick references"
          className="mb-9 grid gap-3 xl:grid-cols-3"
        >
          {[
            [
              chapterHref("chapter-one"),
              HeartPulse,
              "START HERE",
              "Emergency conditions",
              "Assessment & immediate management",
              "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
            ],
            [
              sectionHref("section-body-00415"),
              Pill,
              "QUICK REFERENCE",
              "Essential medicines list",
              "Medicines, formulations & strengths",
              "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
            ],
            [
              "/chapters/",
              BookOpen,
              "EXPLORE THE LIBRARY",
              "Browse all chapters",
              "27 specialties. One accessible library.",
              "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300",
            ],
          ].map(([href, Icon, label, heading, description, color]) => (
            <Link
              key={href}
              href={href}
              className={`${panel} group flex items-center gap-3 p-5 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-teal-600 motion-reduce:transform-none`}
            >
              <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${color}`}
              >
                <Icon size={21} strokeWidth={1.7} />
              </span>
              <span className="min-w-0">
                <span className="text-[9px] font-semibold tracking-widest text-slate-400">
                  {label}
                </span>
                <strong className="mt-1 block text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {heading}
                </strong>
                <span className="mt-1 block text-[10px] leading-4 text-slate-400">
                  {description}
                </span>
              </span>
              <ArrowUpRight
                size={16}
                className="ml-auto shrink-0 text-slate-300 group-hover:text-teal-700"
              />
            </Link>
          ))}
        </section>
      )}

      <section
        ref={resultsRef}
        aria-label="Guideline sections"
        className="scroll-mt-24"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {hasQuery
                ? "Search results"
                : view === "saved"
                  ? "Saved sections"
                  : view === "recent"
                    ? "Recently viewed"
                    : activeChapter
                      ? "Sections in this chapter"
                      : "Explore the guidelines"}
            </h2>
            <p
              role="status"
              aria-live="polite"
              className="mt-1 text-xs text-slate-400"
            >
              {loading
                ? "Loading your library…"
                : searching
                  ? "Searching the full source…"
                  : `${number(results.length)} ${hasQuery ? "matching " : ""}section${results.length === 1 ? "" : "s"}${hasQuery ? ` for “${deferredQuery.trim()}”` : activeChapter ? " in this chapter" : " available"}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <span className="hidden sm:inline">Sort by</span>
              <select
                aria-label="Sort sections"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
                className={selectClass}
              >
                {view === "recent" && (
                  <option value="recent">Recently viewed</option>
                )}
                <option value="relevance">Relevance</option>
                <option value="source">Document order</option>
                <option value="title">Title A–Z</option>
                <option value="shortest">Shortest read</option>
              </select>
            </label>
            <div className="flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              {[
                ["grid", Grid2X2, "Grid view"],
                ["list", List, "List view"],
              ].map(([value, Icon, label]) => (
                <button
                  key={value}
                  aria-label={label}
                  aria-pressed={layout === value}
                  onClick={() => setLayout(value)}
                  className={`flex size-8 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-teal-600 ${layout === value ? "bg-slate-100 text-teal-700 dark:bg-slate-800 dark:text-teal-300" : "text-slate-400 hover:text-teal-700"}`}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
        {loading || searching ? (
          <div
            className={`${panel} flex items-center justify-center gap-3 p-16 text-slate-400`}
          >
            <LoaderCircle
              size={20}
              className="animate-spin motion-reduce:animate-none"
            />
            <span>
              {searching
                ? "Searching all source sections…"
                : "Loading sections…"}
            </span>
          </div>
        ) : !results.length ? (
          <div className={`${panel} px-5 py-16 text-center`}>
            <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              {view === "saved" && !filtered ? (
                <Bookmark size={25} />
              ) : view === "recent" && !filtered ? (
                <Clock3 size={25} />
              ) : (
                <Search size={25} />
              )}
            </span>
            <h3 className="text-lg font-semibold">
              {filtered
                ? "No matching sections"
                : view === "saved"
                  ? "A place for your go-to references"
                  : view === "recent"
                    ? "Your reading journey starts here"
                    : "No sections available"}
            </h3>
            <p className="mx-auto mt-2 mb-6 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              {filtered
                ? "Try a different keyword or remove a filter to broaden your search."
                : view === "saved"
                  ? "Use the bookmark on any section to keep it here for easy access."
                  : "Open a section in the library and find it here next time."}
            </p>
            {filtered ? (
              <button onClick={reset} className={primaryButton}>
                Reset search & filters
              </button>
            ) : (
              <Link href="/" className={primaryButton}>
                Browse all guidelines <ArrowRight size={15} />
              </Link>
            )}
          </div>
        ) : (
          <>
            <div
              className={
                layout === "grid"
                  ? "grid gap-4 md:grid-cols-2 2xl:grid-cols-3"
                  : "grid gap-3"
              }
            >
              {visible.map((entry) => {
                const saved = bookmarks.includes(entry.id);
                const chapterEntry = chapterMap[entry.chapterId];
                return (
                    <article
                    key={entry.id}
                    data-testid="section-card"
                    className={`${panel} group relative flex min-w-0 flex-col transition hover:border-teal-300 hover:shadow-sm ${layout === "list" ? "sm:flex-row sm:items-center" : ""}`}
                  >
                    <Link
                      href={`${sectionHref(entry.id)}${readerQuery}`}
                      className={`block min-w-0 flex-1 p-5 pb-4 focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-teal-600 ${layout === "list" ? "sm:py-5" : ""}`}
                    >
                      <nav
                        aria-label={`${specialtyFor(chapterEntry)} breadcrumb`}
                        className="mb-3 flex min-w-0 items-center gap-2 pr-8 text-[10px]"
                      >
                        {articleBreadcrumb(entry, chapterEntry).map(
                          (label, index, path) => (
                            <span
                              key={`${entry.id}-${label}-${index}`}
                              className="flex min-w-0 items-center gap-2"
                            >
                              {index > 0 && (
                                <ChevronRight
                                  size={12}
                                  className="shrink-0 text-slate-300"
                                />
                              )}
                              <span
                                className={`truncate ${index === 0 ? "font-semibold text-teal-700 dark:text-teal-400" : index === path.length - 1 ? "text-slate-600 dark:text-slate-300" : "text-slate-400"}`}
                              >
                                {label}
                              </span>
                            </span>
                          ),
                        )}
                      </nav>
                      <h3 className="pr-3 text-[15px] leading-6 font-semibold tracking-tight text-slate-800 group-hover:text-teal-800 dark:text-slate-100 dark:group-hover:text-teal-300">
                        <Highlight text={entry.title} query={deferredQuery} />
                      </h3>
                      <p
                        className={`mt-2 text-xs leading-[1.8] text-slate-500 dark:text-slate-400 ${layout === "grid" ? "line-clamp-2" : "line-clamp-1"}`}
                      >
                        <Highlight
                          text={searchExcerpt(entry, deferredQuery, index)}
                          query={deferredQuery}
                        />
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} />
                          {chapterEntry.label} · {chapterEntry.title}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock3 size={12} />
                          {readingTime(entry.wordCount)}
                        </span>
                        {entry.tableCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Table2 size={12} />
                            {entry.tableCount}{" "}
                            {entry.tableCount === 1 ? "table" : "tables"}
                          </span>
                        )}
                        {entry.imageCount > 0 && (
                          <span className="flex items-center gap-1">
                            <ImageIcon size={12} />
                            {entry.imageCount}{" "}
                            {entry.imageCount === 1 ? "figure" : "figures"}
                          </span>
                        )}
                      </div>
                    </Link>
                    <button
                      disabled={!ready}
                      aria-label={`${saved ? "Unsave" : "Save"} ${entry.title}`}
                      aria-pressed={saved}
                      className={`${iconButton} absolute top-3 right-3 ${saved ? "text-teal-700 dark:text-teal-300" : ""}`}
                      onClick={() => toggleBookmark(entry.id)}
                    >
                      <Bookmark
                        size={16}
                        fill={saved ? "currentColor" : "none"}
                      />
                    </button>
                    <Link
                      href={`${sectionHref(entry.id)}${readerQuery}`}
                      tabIndex={-1}
                      aria-hidden="true"
                      className={`flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[11px] font-medium text-teal-700 dark:border-slate-800 dark:text-teal-400 ${layout === "list" ? "sm:border-t-0 sm:pr-6" : "mt-auto"}`}
                    >
                      Read section{" "}
                      <ArrowRight
                        size={14}
                        className="transition group-hover:translate-x-1 motion-reduce:transform-none"
                      />
                    </Link>
                  </article>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, results.length)} of{" "}
                {number(results.length)} sections
              </span>
              {pages > 1 && (
                <nav
                  aria-label="Results pagination"
                  className="flex items-center gap-2"
                >
                  <button
                    className={button}
                    disabled={currentPage === 1}
                    onClick={() => changePage(currentPage - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="px-2">
                    Page{" "}
                    <strong className="font-medium text-slate-600 dark:text-slate-200">
                      {currentPage}
                    </strong>{" "}
                    of {pages}
                  </span>
                  <button
                    className={button}
                    disabled={currentPage === pages}
                    onClick={() => changePage(currentPage + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight size={15} />
                  </button>
                </nav>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}
