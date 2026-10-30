import {
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  FileCheck2,
  FileJson,
  ShieldCheck,
} from "lucide-react";
import { getCatalog } from "../lib/catalog.mjs";
import { button, eyebrow, number, panel, primaryButton } from "../lib/ui.mjs";

export const metadata = { title: "About the source | Clinical Reference" };
export default async function SourcePage() {
  const { metadata: source, sections } = await getCatalog();
  return (
    <>
      <header className="mb-8 max-w-2xl">
        <p className={`${eyebrow} mb-3`}>ABOUT THIS LIBRARY</p>
        <h1 className="text-3xl leading-tight font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          One document.
          <br />A more accessible reference.
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400">
          A searchable companion to Tanzania’s Standard Treatment Guidelines and
          National Essential Medicines List. Every section is traceable to the
          original document.
        </p>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className={`${panel} p-6 sm:p-8`}>
          <span className="mb-5 flex size-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
            <BookOpen size={24} />
          </span>
          <h2 className="text-xl leading-8 font-semibold tracking-tight">
            {source.title}
          </h2>
          <dl className="mt-6 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {[
              ["Published by", source.publisher],
              ["Edition", source.edition],
              [
                "Coverage",
                `${source.stats.chapters} chapters · ${sections.length} sections · ${number(source.stats.tables)} tables · ${source.stats.embeddedImages} image assets`,
              ],
              ["Source file", source.sourceFile],
              ["Review status", source.reviewStatus],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid gap-2 py-4 sm:grid-cols-[115px_minmax(0,1fr)]"
              >
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={source.sourceUrl} download className={primaryButton}>
              <ArrowDownToLine size={16} /> Download original DOCX
            </a>
            <a href="/data/extraction-report.json" download className={button}>
              <FileJson size={16} /> Extraction report
            </a>
          </div>
        </section>
        <div className="space-y-5">
          <section className={`${panel} p-6`}>
            <FileCheck2
              size={22}
              className="mb-4 text-teal-700 dark:text-teal-400"
            />
            <h2 className="text-base font-semibold">
              Read with the source in view
            </h2>
            <p className="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">
              Clinical and layout review is pending. Paragraphs, tables, and
              figures are extracted from the source; document layout and
              automatic list numbering may differ.
            </p>
            <p className="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">
              Standalone AND/OR labels are hidden in the reader. The original
              wording remains in the downloadable document and extracted JSON.
              Consult the source to confirm treatment relationships.
            </p>
            <a
              href={source.sourceUrl}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400"
              download
            >
              View the original <ArrowUpRight size={14} />
            </a>
          </section>
          <section className={`${panel} p-6`}>
            <ShieldCheck
              size={22}
              className="mb-4 text-teal-700 dark:text-teal-400"
            />
            <h2 className="text-base font-semibold">
              Your workspace stays local
            </h2>
            <p className="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">
              Saved sections, reading history, theme, and reading size are
              stored in this browser. No account is needed. Browser data does
              not sync between devices.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
