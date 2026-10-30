import { Children, cloneElement, isValidElement } from "react";
import Markdown from "react-markdown";
import { ArrowUpRight } from "lucide-react";
import { sourceMarkdown, supportsMarkdown } from "../lib/source-markdown.mjs";
import { isStandaloneOperator } from "../lib/source-visibility.mjs";
import Highlight from "./highlight";

const heading2 =
  "mt-9 mb-4 border-b border-slate-200 pb-3 text-xl leading-8 font-semibold tracking-tight text-slate-900 dark:border-slate-700 dark:text-slate-100 print:text-black";
const heading3 =
  "mt-7 mb-3 text-base leading-7 font-semibold text-slate-900 dark:text-slate-100 print:text-black";
const paragraph =
  "my-3 whitespace-pre-wrap leading-[1.9] [overflow-wrap:anywhere]";
const indents = ["ml-0", "ml-4", "ml-8", "ml-12", "ml-16", "ml-20"];

function RichText({ block, query }) {
  if (!block.runs?.length)
    return <Highlight text={block.text || ""} query={query} />;
  return block.runs.map((run, index) => {
    let content = <Highlight text={run.text} query={query} />;
    if (run.bold) content = <strong>{content}</strong>;
    if (run.italic) content = <em>{content}</em>;
    if (run.vertical === "superscript") content = <sup>{content}</sup>;
    if (run.vertical === "subscript") content = <sub>{content}</sub>;
    return <span key={index}>{content}</span>;
  });
}
function highlightChildren(children, query) {
  return Children.map(children, (child) => {
    if (typeof child === "string")
      return <Highlight text={child} query={query} />;
    if (isValidElement(child) && child.props.children)
      return cloneElement(
        child,
        {},
        highlightChildren(child.props.children, query),
      );
    return child;
  });
}

export default function SourceContent({
  blocks,
  query = "",
  inTable = false,
  title = "",
}) {
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
    )
      previous.blocks.push(block);
    else
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
        className={`my-4 list-disc space-y-2 pl-5 marker:text-teal-600 dark:marker:text-teal-400 ${indents[Math.min(group.level, 5)]}`}
      >
        {group.blocks.map((block) => (
          <li key={block.id}>
            <SourceBlock block={block} query={query} inTable={inTable} />
          </li>
        ))}
      </ul>
    ) : (
      <SourceBlock
        key={group.blocks[0].id}
        block={group.blocks[0]}
        query={query}
        inTable={inTable}
        duplicateHeading={
          group.blocks[0] === blocks[0] &&
          group.blocks[0].text?.trim().toLowerCase() ===
            title.trim().toLowerCase()
        }
      />
    ),
  );
}

function SourceBlock({ block, query, inTable, duplicateHeading }) {
  if (block.type === "table")
    return (
      <div
        id={block.id}
        tabIndex={0}
        role="region"
        aria-label={`Source table ${block.id}`}
        className="my-6 max-w-full overflow-x-auto rounded-xl border border-slate-200 focus-visible:outline-2 focus-visible:outline-teal-600 dark:border-slate-700 print:overflow-visible"
      >
        <table className="w-full min-w-128 border-collapse text-left text-xs leading-6 print:min-w-0">
          <caption className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-left text-[10px] text-slate-400 dark:border-slate-700 dark:bg-slate-800 print:bg-white">
            Source table · {block.id}
          </caption>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-slate-200 last:border-0 even:bg-slate-50/70 dark:border-slate-700 dark:even:bg-slate-800/40 print:even:bg-white"
              >
                {row.cells.map((cell, cellIndex) => {
                  const Tag = row.header ? "th" : "td";
                  return (
                    <Tag
                      key={cellIndex}
                      colSpan={cell.colspan}
                      rowSpan={cell.rowspan}
                      className={`min-w-24 border-r border-slate-200 px-4 py-3 align-top last:border-r-0 dark:border-slate-700 ${row.header ? "bg-slate-100 font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100 print:bg-white print:text-black" : ""}`}
                    >
                      <SourceContent
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
  if (isStandaloneOperator(block.text) && !block.images?.length) return null;
  const showText =
    block.text && !isStandaloneOperator(block.text) && !duplicateHeading;
  const isHeading = block.type === "heading";
  const Tag = isHeading ? (block.level <= 2 ? "h2" : "h3") : "p";
  return (
    <div id={block.id} className="scroll-mt-24 [overflow-wrap:anywhere]">
      {showText &&
        (!inTable && supportsMarkdown(block) ? (
          <Markdown
            skipHtml
            allowedElements={["p", "h2", "h3", "strong", "em", "br"]}
            unwrapDisallowed
            components={{
              p: ({ children }) => (
                <p className={paragraph}>
                  {highlightChildren(children, query)}
                </p>
              ),
              h2: ({ children }) => (
                <h2 className={heading2}>
                  {highlightChildren(children, query)}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className={heading3}>
                  {highlightChildren(children, query)}
                </h3>
              ),
            }}
          >
            {sourceMarkdown(block)}
          </Markdown>
        ) : (
          <Tag
            className={
              isHeading ? (block.level <= 2 ? heading2 : heading3) : paragraph
            }
          >
            <RichText block={block} query={query} />
          </Tag>
        ))}
      {block.images?.map((image, index) => (
        <figure key={index} className="my-6 break-inside-avoid">
          <a
            href={image.src}
            target="_blank"
            rel="noreferrer"
            title="Open full-size figure"
            className="block rounded-lg focus-visible:outline-2 focus-visible:outline-teal-600"
          >
            <img
              src={image.src}
              alt={image.alt || "Figure from the source document"}
              loading="lazy"
              className="mx-auto h-auto max-w-full rounded-lg bg-white"
            />
          </a>
          <figcaption className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            Original document figure ·{" "}
            <a
              href={image.src}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-teal-700 hover:underline dark:text-teal-400"
            >
              Open full size <ArrowUpRight size={12} />
            </a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
