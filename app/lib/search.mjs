export const normalize = (text = "") =>
  text.toLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();
export const searchTerms = (query) => [
  ...new Set(normalize(query).split(" ").filter(Boolean)),
];

export function searchSuggestions({ sections, chapters, query, limit = 6 }) {
  const terms = searchTerms(query);
  if (!terms.length) return [];
  const chapterMap = Object.fromEntries(
    chapters.map((item) => [item.id, item]),
  );
  return sections
    .map((entry, order) => {
      const chapter = chapterMap[entry.chapterId];
      const title = normalize(entry.title);
      const text = normalize(`${entry.title} ${chapter?.title || ""}`);
      if (!terms.every((term) => text.includes(term))) return null;
      const score =
        (title === normalize(query) ? 100 : 0) +
        terms.reduce(
          (total, term) =>
            total + (title.startsWith(term) ? 20 : 0) +
            (title.includes(term) ? 10 : 0),
          0,
        );
      return { entry, chapter, score, order };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit);
}

export function findSections({
  sections,
  chapters,
  index,
  query = "",
  chapter = "all",
  content = "all",
  sort = "relevance",
  ids,
}) {
  const terms = searchTerms(query);
  const chapterMap = Object.fromEntries(
    chapters.map((item) => [item.id, item.title]),
  );
  return sections
    .flatMap((entry, order) => {
      if (chapter !== "all" && entry.chapterId !== chapter) return [];
      if (ids && !ids.includes(entry.id)) return [];
      if (content === "tables" && !entry.tableCount) return [];
      if (content === "figures" && !entry.imageCount) return [];
      const title = normalize(entry.title);
      const text = normalize(
        `${entry.title} ${chapterMap[entry.chapterId]} ${index?.[entry.id] || entry.excerpt}`,
      );
      if (!terms.every((term) => text.includes(term))) return [];
      const score =
        (title === normalize(query) && terms.length ? 100 : 0) +
        terms.reduce(
          (total, term) =>
            total +
            (title.includes(term) ? 10 : 0) +
            (title.startsWith(term) ? 5 : 0),
          0,
        );
      return [{ ...entry, score, order }];
    })
    .sort((a, b) => {
      if (sort === "title")
        return a.title.localeCompare(b.title, "en", { numeric: true });
      if (sort === "shortest")
        return a.wordCount - b.wordCount || a.order - b.order;
      if (sort === "recent" && ids)
        return ids.indexOf(a.id) - ids.indexOf(b.id);
      if (sort === "relevance" && terms.length)
        return b.score - a.score || a.order - b.order;
      return (
        Number(a.chapterId === "reference") -
          Number(b.chapterId === "reference") || a.order - b.order
      );
    });
}

export function searchExcerpt(entry, query, index) {
  const terms = searchTerms(query);
  if (!terms.length || !index?.[entry.id]) return entry.excerpt;
  const text = index[entry.id].replace(/\s+/g, " ").trim();
  const positions = terms
    .map((term) => normalize(text).indexOf(term))
    .filter((value) => value >= 0);
  if (!positions.length) return entry.excerpt;
  const start = Math.max(0, Math.min(...positions) - 70);
  return `${start ? "…" : ""}${text.slice(start, start + 230)}${start + 230 < text.length ? "…" : ""}`;
}
