import { searchTerms } from "../lib/search.mjs";

export default function Highlight({ text = "", query = "" }) {
  const terms = searchTerms(query);
  if (!terms.length) return text;
  const pattern = terms
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return text.split(new RegExp(`(${pattern})`, "ig")).map((part, index) =>
    terms.includes(part.toLowerCase()) ? (
      <mark
        key={index}
        className="rounded-sm bg-amber-100 px-0.5 text-inherit dark:bg-amber-800/60"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
