"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Markdown from "react-markdown";
import ThemeToggle from "./theme-toggle";
import TreatmentConnector from "./treatment-connector";
import { sourceMarkdown, supportsMarkdown } from "../lib/source-markdown.mjs";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  HeartPulse,
  Info,
  Library,
  Menu,
  Pill,
  Search,
  SlidersHorizontal,
  Table2,
  X,
} from "lucide-react";

const PAGE_SIZE = 24;
const number = (n) => n.toLocaleString("en");
const clean = (s) => s.toLowerCase().normalize("NFKC").replace(/\s+/g, " ");

function Highlight({ text, query }) {
  if (!query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .split(new RegExp(`(${escaped})`, "ig"))
    .map((part, index) =>
      part.toLowerCase() === query.trim().toLowerCase() ? (
        <mark key={index}>{part}</mark>
      ) : (
        part
      ),
    );
}

function RichText({ block, query }) {
  if (!block.runs?.length)
    return <Highlight text={block.text || ""} query={query} />;
  return block.runs.map((run, i) => {
    let content = <Highlight text={run.text} query={query} />;
    if (run.bold) content = <strong>{content}</strong>;
    if (run.italic) content = <em>{content}</em>;
    if (run.vertical === "superscript") content = <sup>{content}</sup>;
    if (run.vertical === "subscript") content = <sub>{content}</sub>;
    return <span key={i}>{content}</span>;
  });
}

function highlightMarkdown(children, query) {
  return Children.map(children, (child) => {
    if (typeof child === "string")
      return <Highlight text={child} query={query} />;
    if (isValidElement(child) && child.props.children)
      return cloneElement(
        child,
        {},
        highlightMarkdown(child.props.children, query),
      );
    return child;
  });
}

function SourceBlocks({ blocks, query, firstId, inTable = false }) {
  const groups = [];
  for (const block of blocks) {
    const isList =
      block.type === "paragraph" && block.list && !block.conjunction;
    const previous = groups.at(-1);
    if (
      isList &&
      previous?.list &&
      previous.level === block.list.level &&
      previous.numberingId === block.list.numberingId
    ) {
      previous.blocks.push(block);
    } else
      groups.push({
        list: isList,
        level: block.list?.level || 0,
        numberingId: block.list?.numberingId,
        blocks: [block],
      });
  }
  return groups.map((group) =>
    group.list ? (
      <ul
        key={group.blocks[0].id}
        className="source-bullet-list"
        style={{ marginLeft: `${Math.min(group.level, 5) * 16}px` }}
      >
        {group.blocks.map((block) => (
          <li key={block.id}>
            <SourceBlock
              block={block}
              query={query}
              inTable={inTable}
              listItem
            />
          </li>
        ))}
      </ul>
    ) : (
      <SourceBlock
        key={group.blocks[0].id}
        block={group.blocks[0]}
        query={query}
        firstId={firstId}
        inTable={inTable}
      />
    ),
  );
}

function SourceBlock({
  block,
  query,
  firstId,
  inTable = false,
  listItem = false,
}) {
  if (block.type === "table") {
    return (
      <div
        className="source-table-wrap"
        id={block.id}
        tabIndex={0}
        role="region"
        aria-label={`Source table ${block.id}`}
      >
        <table className="source-table">
          <caption>Source table · {block.id}</caption>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i}>
                {row.cells.map((cell, j) => {
                  const Tag = row.header ? "th" : "td";
                  return (
                    <Tag key={j} colSpan={cell.colspan} rowSpan={cell.rowspan}>
                      <SourceBlocks
                        blocks={cell.blocks}
                        query={query}
                        inTable
                      />
                    </Tag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  // if (block.conjunction && !block.images?.length) {
  //   return (
  //     <TreatmentConnector block={block}>
  //       <Highlight text={block.text} query={query} />
  //     </TreatmentConnector>
  //   );
  // }
  const isHeading = block.type === "heading";
  const Tag = isHeading ? (block.level <= 2 ? "h2" : "h3") : "p";
  const useMarkdown = !inTable && supportsMarkdown(block);
  return (
    <div
      id={block.id}
      className={`${block.id === firstId && isHeading ? "opening-source-heading" : ""}`}
    >
      {block.text &&
        (useMarkdown ? (
          <Markdown
            skipHtml
            allowedElements={["p", "h2", "h3", "strong", "em", "br"]}
            unwrapDisallowed
            components={{
              p: ({ children }) => (
                <p className={block.conjunction ? "conjunction" : undefined}>
                  {highlightMarkdown(children, query)}
                </p>
              ),
              h2: ({ children }) => (
                <h2>{highlightMarkdown(children, query)}</h2>
              ),
              h3: ({ children }) => (
                <h3>{highlightMarkdown(children, query)}</h3>
              ),
            }}
          >
            {sourceMarkdown(block)}
          </Markdown>
        ) : (
          <Tag
            className={`${block.list && !listItem ? "source-list" : ""} ${block.conjunction ? "conjunction" : ""}`}
            style={
              block.list && !listItem
                ? {
                    paddingLeft: `${Math.min(block.list.level, 5) * 16 + 20}px`,
                  }
                : undefined
            }
          >
            <RichText block={block} query={query} />
          </Tag>
        ))}
      {block.images?.map((image, i) => (
        <figure key={i}>
          <a
            href={image.src}
            target="_blank"
            rel="noreferrer"
            title="Open full-size figure"
          >
            <img
              src={image.src}
              alt={image.alt || "Figure from the source document"}
              loading="lazy"
            />
          </a>
          <figcaption>
            Original document figure ·{" "}
            <a href={image.src} target="_blank" rel="noreferrer">
              Open full size ↗
            </a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function SectionReader({
  entry,
  chapter,
  bookmarked,
  toggleBookmark,
  onBack,
  query,
  metadata,
}) {
  const [section, setSection] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setSection(null);
    setError("");
    fetch(`/data/sections/${entry.id}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load this section.");
        return response.json();
      })
      .then(setSection)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [entry.id, retry]);
  const headings =
    section?.blocks.filter(
      (b) => b.type === "heading" && b.id !== section.blocks[0]?.id,
    ) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="reader-toolbar">
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={16} /> Back to library
        </button>
        <button
          className={`button secondary ${bookmarked ? "saved-button" : ""}`}
          onClick={() => toggleBookmark(entry.id)}
        >
          <Bookmark size={16} fill={bookmarked ? "currentColor" : "none"} />
          {bookmarked ? "Saved" : "Save section"}
        </button>
      </div>
      <div className="reader-layout">
        <article className="reader-article">
          <header className="article-header">
            <div className="eyebrow">
              {chapter.label} <span>/</span> SOURCE TEXT
            </div>
            <h1>{entry.title}</h1>
            <p className="article-chapter">{chapter.title}</p>
            <div className="article-meta">
              <span>
                <FileText size={14} /> {number(entry.wordCount)} words
              </span>
              {entry.tableCount > 0 && (
                <span>
                  <Table2 size={14} /> {entry.tableCount} tables
                </span>
              )}
              <span>2026 edition</span>
            </div>
          </header>
          <div className="source-note">
            <Info size={16} />
            <p>
              Extracted from the original document. Clinical and layout review
              pending.{" "}
              <a href={metadata.sourceUrl} download>
                View the source DOCX
              </a>
            </p>
          </div>
          {error ? (
            <div role="alert" className="empty-state">
              <Info size={28} />
              <h2>Section could not load</h2>
              <p>{error}</p>
              <button
                className="button primary"
                onClick={() => setRetry((n) => n + 1)}
              >
                Try again
              </button>
            </div>
          ) : !section ? (
            <div className="reader-loading" role="status">
              Loading source content…
              <div />
              <div />
              <div />
            </div>
          ) : (
            <div className="source-content">
              <SourceBlocks
                blocks={section.blocks}
                query={query}
                firstId={section.blocks[0]?.id}
              />
            </div>
          )}
          <footer className="source-footer">
            <FileText size={17} />
            <div>
              <strong>Traceable to the original</strong>
              <p>
                {metadata.sourceFile} · {entry.sourceStart} — {entry.sourceEnd}
              </p>
            </div>
          </footer>
        </article>
        <aside className="article-outline">
          <div className="eyebrow">ON THIS PAGE</div>
          {headings.length ? (
            headings.slice(0, 60).map((b) => (
              <a key={b.id} href={`#${entry.id}/${b.id}`}>
                {b.text}
              </a>
            ))
          ) : (
            <p>Read this section in its original order.</p>
          )}
          <a className="outline-source" href={metadata.sourceUrl} download>
            <ArrowDownToLine size={15} /> Original document
          </a>
        </aside>
      </div>
    </motion.div>
  );
}

export default function ClinicalLibrary({ catalog }) {
  const { metadata, chapters, sections } = catalog;
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [chapterId, setChapterId] = useState("all");
  const [view, setView] = useState("library");
  const [bookmarks, setBookmarks] = useState([]);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [searchIndex, setSearchIndex] = useState(null);
  const [searchError, setSearchError] = useState(false);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [selected, setSelected] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [details, setDetails] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const searchRef = useRef(null);
  const dialogRef = useRef(null);
  const detailsTrigger = useRef(null);
  const documentKey = `clinical-bookmarks-${metadata.sha256.slice(0, 12)}`;
  const chapterMap = useMemo(
    () => Object.fromEntries(chapters.map((c) => [c.id, c])),
    [chapters],
  );
  const chapterCounts = useMemo(
    () =>
      Object.fromEntries(
        chapters.map((c) => [
          c.id,
          sections.filter((s) => s.chapterId === c.id).length,
        ]),
      ),
    [chapters, sections],
  );

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(documentKey) || "[]");
      if (Array.isArray(stored))
        setBookmarks(stored.filter((id) => sections.some((s) => s.id === id)));
    } catch {
      setStorageError(
        "Saved sections are unavailable in this browser session.",
      );
    }
    setStorageReady(true);
  }, [documentKey, sections]);
  useEffect(() => {
    if (storageReady) {
      try {
        localStorage.setItem(documentKey, JSON.stringify(bookmarks));
      } catch {
        setStorageError("Your saved sections will only last for this visit.");
      }
    }
  }, [bookmarks, documentKey, storageReady]);
  useEffect(() => {
    const readHash = () => {
      const [id, blockId] = window.location.hash.slice(1).split("/");
      const entry = sections.find((s) => s.id === id);
      setSelected(entry || null);
      if (blockId) {
        // The reader may still be fetching; wait for its target to mount.
        const observer = new MutationObserver(() => {
          const element = document.getElementById(blockId);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
            observer.disconnect();
          }
        });
        const existing = document.getElementById(blockId);
        if (existing)
          existing.scrollIntoView({ behavior: "smooth", block: "start" });
        else {
          observer.observe(document.body, { childList: true, subtree: true });
          setTimeout(() => observer.disconnect(), 15000);
        }
      } else window.scrollTo({ top: 0, behavior: "instant" });
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [sections]);
  useEffect(() => {
    const handler = (event) => {
      if (
        event.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName,
        ) &&
        !details
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [details]);
  useEffect(() => {
    if (!deferredQuery.trim() || searchIndex) return;
    const controller = new AbortController();
    setSearchError(false);
    fetch("/data/search-index.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((items) =>
        setSearchIndex(
          Object.fromEntries(
            items.map((item) => [
              item.id,
              { text: item.text, normalized: clean(item.text) },
            ]),
          ),
        ),
      )
      .catch((e) => {
        if (e.name !== "AbortError") setSearchError(true);
      });
    return () => controller.abort();
  }, [Boolean(deferredQuery.trim()), searchAttempt, searchIndex]);
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [deferredQuery, chapterId, view]);
  useEffect(() => {
    if (details) dialogRef.current?.showModal();
    else if (dialogRef.current?.open) dialogRef.current.close();
  }, [details]);

  const tokens = clean(deferredQuery).trim().split(" ").filter(Boolean);
  const results = useMemo(() => {
    const terms = clean(deferredQuery).trim().split(" ").filter(Boolean);
    return sections
      .filter(
        (s) =>
          (chapterId === "all" || s.chapterId === chapterId) &&
          (view !== "saved" || bookmarks.includes(s.id)),
      )
      .map((s) => {
        const title = clean(s.title);
        const content = `${title} ${clean(chapterMap[s.chapterId].title)} ${searchIndex?.[s.id]?.normalized || clean(s.excerpt)}`;
        return {
          ...s,
          score: terms.reduce(
            (score, term) => score + (title.includes(term) ? 5 : 0),
            0,
          ),
          matches: terms.every((term) => content.includes(term)),
        };
      })
      .filter((s) => s.matches)
      .sort(
        (a, b) =>
          b.score - a.score ||
          Number(a.chapterId === "reference") -
            Number(b.chapterId === "reference"),
      );
  }, [
    sections,
    chapterId,
    view,
    bookmarks,
    deferredQuery,
    searchIndex,
    chapterMap,
  ]);

  const toggleBookmark = (id) =>
    setBookmarks((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  const exitReader = () => {
    window.location.hash = "";
    setSelected(null);
  };
  const navigate = (nextView, nextChapter = "all") => {
    setView(nextView);
    setChapterId(nextChapter);
    setQuery("");
    setMobileMenu(false);
    exitReader();
  };
  const openSection = (entry) => {
    window.location.hash = entry.id;
    setSelected(entry);
    window.scrollTo({ top: 0 });
  };
  const setSearch = (text) => {
    setQuery(text);
    if (selected) exitReader();
  };
  const showDetails = (event) => {
    detailsTrigger.current = event.currentTarget;
    setDetails(true);
  };
  const closeDetails = () => {
    setDetails(false);
    detailsTrigger.current?.focus();
  };
  const visibleResults = results.slice(0, limit);
  const isOverview = chapterId === "all" && view === "library" && !query;

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="app-shell">
        {mobileMenu && (
          <button
            className="sidebar-overlay"
            aria-label="Close navigation"
            onClick={() => setMobileMenu(false)}
          />
        )}
        <aside className={`sidebar ${mobileMenu ? "is-open" : ""}`}>
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("library");
            }}
          >
            <span>
              Clinical<span className="brand-light">Reference</span>
            </span>
          </a>

          <nav aria-label="Main navigation" className="main-nav mt-10">
            <button
              className={view === "library" ? "active" : ""}
              onClick={() => navigate("library")}
            >
              <Library size={18} /> Guideline library{" "}
              <ChevronRight size={15} className="nav-arrow" />
            </button>
            <button
              className={view === "saved" ? "active" : ""}
              onClick={() => navigate("saved")}
            >
              <Bookmark size={18} /> Saved sections{" "}
              <span className="nav-count">{bookmarks.length}</span>
            </button>
            <button onClick={showDetails}>
              <ClipboardList size={18} /> About this source
            </button>
          </nav>
          <div className="chapters-label">
            BROWSE BY CHAPTER <span>{metadata.stats.chapters}</span>
          </div>
          <nav className="chapter-nav" aria-label="Chapters">
            <button
              className={chapterId === "all" ? "selected" : ""}
              onClick={() => navigate("library")}
            >
              <span>All chapters</span>
              <span>{sections.length}</span>
            </button>
            {chapters.map((chapter, index) => (
              <button
                key={chapter.id}
                className={chapterId === chapter.id ? "selected" : ""}
                onClick={() => navigate("library", chapter.id)}
              >
                <span className="chapter-number">
                  {index === 0 ? "—" : String(index).padStart(2, "0")}
                </span>
                <span className="chapter-name">{chapter.title}</span>
                <span className="chapter-topic-count">
                  {chapterCounts[chapter.id]}
                </span>
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <span className="source-icon">
              <BookOpen size={18} />
            </span>
            <div>
              <strong>National treatment guidelines</strong>
              <span>Seventh edition · 2026</span>
            </div>
          </div>
        </aside>

        <div className="main-shell">
          <header className="topbar">
            <div className="topbar-location">
              <button
                className="icon-button mobile-toggle"
                aria-label="Open navigation"
                aria-expanded={mobileMenu}
                onClick={() => setMobileMenu(!mobileMenu)}
              >
                <Menu size={21} />
              </button>
              <span className="topbar-label">Workspace</span>
              <ChevronRight size={14} />
              <span>
                {view === "saved" ? "Saved sections" : "Guideline library"}
              </span>
            </div>
            <div className="topbar-right">
              <ThemeToggle />
              <button
                className="icon-button"
                title="About the source"
                aria-label="About the source"
                onClick={showDetails}
              >
                <Info size={19} />
              </button>
            </div>
          </header>
          <main id="main-content" className="main-content" tabIndex={-1}>
            {!selected && (
              <motion.section
                className="library-header"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="heading-eyebrow">
                  <span /> YOUR EVERYDAY CLINICAL COMPANION
                </div>
                <div className="title-row">
                  <div>
                    <h1>
                      {view === "saved" ? (
                        "Your saved sections."
                      ) : chapterId !== "all" ? (
                        chapterMap[chapterId].title
                      ) : (
                        <>
                          Guidelines, made accessible
                          <span className="title-period">.</span>
                        </>
                      )}
                    </h1>
                    <p>
                      {view === "saved"
                        ? "Keep the references you return to, together in one place."
                        : chapterId !== "all"
                          ? `${chapterMap[chapterId].label} · Browse the extracted source sections below.`
                          : "Less time navigating documents. More time finding what you need."}
                    </p>
                  </div>
                  <a
                    className="button secondary download-button"
                    href={metadata.sourceUrl}
                    download
                  >
                    <ArrowDownToLine size={16} /> Original document
                  </a>
                </div>
                {isOverview && (
                  <div className="stats-row">
                    <span>
                      <BookOpen size={17} />
                      <strong>{metadata.stats.chapters}</strong> chapters
                    </span>
                    <span>
                      <FileText size={17} />
                      <strong>{sections.length}</strong> sections
                    </span>
                    <span>
                      <Table2 size={17} />
                      <strong>{metadata.stats.tables}</strong> tables
                    </span>
                    <span className="stats-source">
                      <span className="mini-dot" /> From the Ministry of Health
                    </span>
                  </div>
                )}
              </motion.section>
            )}

            <div className="search-area">
              <div className="search-field">
                <Search size={21} />
                <input
                  ref={searchRef}
                  id="library-search"
                  aria-label="Search guidelines by condition, medicine, or keyword"
                  placeholder="Search a condition, medicine, or keyword…"
                  value={query}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {query ? (
                  <button
                    className="icon-button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <X size={17} />
                  </button>
                ) : (
                  <kbd>/</kbd>
                )}
              </div>
              <label className="chapter-filter">
                <SlidersHorizontal size={17} />
                <select
                  aria-label="Filter by chapter"
                  value={chapterId}
                  onChange={(e) => {
                    setChapterId(e.target.value);
                    if (selected) exitReader();
                  }}
                >
                  <option value="all">All chapters</option>
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </label>
            </div>
            {storageError && (
              <p className="status-message" role="status">
                {storageError}
              </p>
            )}

            {selected ? (
              <SectionReader
                key={selected.id}
                entry={selected}
                chapter={chapterMap[selected.chapterId]}
                bookmarked={bookmarks.includes(selected.id)}
                toggleBookmark={toggleBookmark}
                onBack={exitReader}
                query={deferredQuery}
                metadata={metadata}
              />
            ) : (
              <>
                <AnimatePresence>
                  {isOverview && (
                    <motion.div
                      className="featured-grid"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <button
                        className="featured-card emergency-card"
                        onClick={() => navigate("library", "chapter-one")}
                      >
                        <span className="feature-icon">
                          <Activity size={22} />
                        </span>
                        <span className="feature-text">
                          <span className="eyebrow">
                            START WITH THE ESSENTIALS
                          </span>
                          <strong>Emergency conditions</strong>
                          <span>Assessment, triage & emergency management</span>
                        </span>
                        <ArrowRight size={20} />
                      </button>
                      <button
                        className="featured-card medicines-card"
                        onClick={() => {
                          const entry = sections.find((s) =>
                            /national essential medicines list 2026/i.test(
                              s.title,
                            ),
                          );
                          if (entry) openSection(entry);
                          else navigate("library", "reference");
                        }}
                      >
                        <span className="feature-icon">
                          <Pill size={22} />
                        </span>
                        <span className="feature-text">
                          <span className="eyebrow">
                            THE MEDICINES REFERENCE
                          </span>
                          <strong>Essential medicines list</strong>
                          <span>Explore the national medicines reference</span>
                        </span>
                        <ArrowRight size={20} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="results-header">
                  <div>
                    <h2>
                      {query
                        ? "Search results"
                        : view === "saved"
                          ? "Saved for later"
                          : chapterId === "all"
                            ? "Explore the guidelines"
                            : "Sections in this chapter"}
                    </h2>
                    <span role="status">
                      {query && !searchIndex && !searchError
                        ? "Searching titles while full-text search loads…"
                        : `${number(results.length)} ${results.length === 1 ? "section" : "sections"}${query ? ` matching “${deferredQuery}”` : " in your library"}`}
                    </span>
                  </div>
                  <span className="source-label">
                    <FileText size={13} /> ORIGINAL SOURCE TEXT
                  </span>
                </div>
                {searchError && (
                  <div className="search-error" role="alert">
                    Full-text search could not load. Showing title and excerpt
                    matches.{" "}
                    <button onClick={() => setSearchAttempt((n) => n + 1)}>
                      Retry full-text search
                    </button>
                  </div>
                )}
                {visibleResults.length ? (
                  <div className="section-grid">
                    {visibleResults.map((section, index) => {
                      const chapter = chapterMap[section.chapterId];
                      let excerpt = section.excerpt;
                      if (tokens.length && searchIndex?.[section.id]) {
                        const source = searchIndex[section.id].text;
                        const pos = source.toLowerCase().indexOf(tokens[0]);
                        if (pos >= 0)
                          excerpt = `${pos > 65 ? "…" : ""}${source.slice(Math.max(0, pos - 65), pos + 170)}…`;
                      }
                      return (
                        <motion.article
                          className="section-card"
                          key={section.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.2,
                            delay: Math.min(index, 7) * 0.025,
                          }}
                        >
                          <div className="card-top">
                            <span
                              className={`chapter-tag ${section.chapterId === "reference" ? "reference-tag" : ""}`}
                            >
                              {chapter.label}
                            </span>
                            <button
                              className={`bookmark-button ${bookmarks.includes(section.id) ? "is-saved" : ""}`}
                              aria-label={`${bookmarks.includes(section.id) ? "Unsave" : "Save"} ${section.title}`}
                              aria-pressed={bookmarks.includes(section.id)}
                              onClick={() => toggleBookmark(section.id)}
                            >
                              <Bookmark
                                size={17}
                                fill={
                                  bookmarks.includes(section.id)
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </button>
                          </div>
                          <button
                            className="card-open"
                            onClick={() => openSection(section)}
                          >
                            <h3>
                              <Highlight
                                text={section.title}
                                query={deferredQuery}
                              />
                            </h3>
                            <p>
                              <Highlight text={excerpt} query={deferredQuery} />
                            </p>
                            <span className="card-bottom">
                              <span>
                                {number(section.wordCount)} words
                                {section.tableCount > 0 && (
                                  <>
                                    {" "}
                                    <span className="meta-dot">·</span>{" "}
                                    {section.tableCount}{" "}
                                    {section.tableCount === 1
                                      ? "table"
                                      : "tables"}
                                  </>
                                )}
                              </span>
                              <span className="read-link">
                                Read section <ArrowRight size={15} />
                              </span>
                            </span>
                          </button>
                        </motion.article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    {view === "saved" && !query ? (
                      <BookMarked size={34} />
                    ) : (
                      <Search size={34} />
                    )}
                    <h2>
                      {view === "saved" && !query
                        ? "A place for your go-to references"
                        : "No matching sections"}
                    </h2>
                    <p>
                      {view === "saved" && !query
                        ? "Use the bookmark icon on any section to save it in this browser."
                        : "Try another keyword or search across all chapters."}
                    </p>
                    <button
                      className="button primary"
                      onClick={() => navigate("library")}
                    >
                      Browse all guidelines <ArrowRight size={16} />
                    </button>
                  </div>
                )}
                {results.length > limit && (
                  <div className="load-more">
                    <button
                      className="button secondary"
                      onClick={() => setLimit((n) => n + PAGE_SIZE)}
                    >
                      Show more sections <ChevronDown size={16} />
                    </button>
                    <span>
                      Showing {Math.min(limit, results.length)} of{" "}
                      {results.length} sections
                    </span>
                  </div>
                )}
                <footer className="library-footer">
                  <div>
                    <span className="footer-cross">+</span>
                    <span>
                      Tanzania Standard Treatment Guidelines{" "}
                      <span className="footer-divider">/</span> Seventh edition,
                      2026
                    </span>
                  </div>
                  <button onClick={showDetails}>
                    Source & extraction details <ArrowRight size={13} />
                  </button>
                </footer>
              </>
            )}
          </main>
        </div>
      </div>
      <dialog
        ref={dialogRef}
        className="source-dialog"
        onCancel={(e) => {
          e.preventDefault();
          closeDetails();
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeDetails();
        }}
        aria-labelledby="source-dialog-title"
      >
        <div className="dialog-content">
          <button
            className="icon-button dialog-close"
            aria-label="Close source details"
            onClick={closeDetails}
          >
            <X size={20} />
          </button>
          <span className="dialog-icon">
            <BookOpen size={28} />
          </span>
          <div className="eyebrow">ABOUT THE SOURCE</div>
          <h2 id="source-dialog-title">
            One document.
            <br />A more accessible reference.
          </h2>
          <p>{metadata.title}</p>
          <dl>
            <div>
              <dt>Published by</dt>
              <dd>{metadata.publisher}</dd>
            </div>
            <div>
              <dt>Edition</dt>
              <dd>{metadata.edition}</dd>
            </div>
            <div>
              <dt>Coverage</dt>
              <dd>
                {metadata.stats.chapters} chapters · {sections.length} sections
                · {metadata.stats.tables} tables ·{" "}
                {metadata.stats.embeddedImages} image assets
              </dd>
            </div>
            <div>
              <dt>Review status</dt>
              <dd>{metadata.reviewStatus}</dd>
            </div>
          </dl>
          <p className="dialog-footnote">
            Source wording is retained. Document layout and automatic list
            numbering may differ; headers, footers, and footnotes are recorded
            in the extraction report. Saved sections stay in this browser.
          </p>
          <div className="dialog-actions">
            <a className="button primary" href={metadata.sourceUrl} download>
              <ArrowDownToLine size={16} /> Download original
            </a>
            <a
              className="button secondary"
              href="/data/extraction-report.json"
              download
            >
              Extraction report
            </a>
          </div>
        </div>
      </dialog>
    </MotionConfig>
  );
}
